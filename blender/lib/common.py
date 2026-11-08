"""Shared helpers for the art generators: scene, materials, mesh parts, export.

Conventions (docs/BLENDER-TODO.md): metres, origin between the feet on the
floor, the character faces Blender -Y (glTF +Z). Part positions are given in
*fighter space* (side, fwd, up): side +x is the character's left, fwd is
forward, up is up. fighter() turns those into Blender coordinates.
"""
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

FPS = 60


def fighter(side, fwd, up):
    """Fighter space (side = character's left, fwd, up) to Blender (x, y, z)."""
    return Vector((side, -fwd, up))


def from_blender(v):
    """Blender (x, y, z) to fighter space (side, fwd, up)."""
    return (v.x, -v.y, v.z)


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.render.fps_base = 1.0


def srgb_to_linear(rgb):
    def ch(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    return tuple(ch(c) for c in rgb)


def vertex_colour_material(name, roughness=0.75):
    """A material whose base colour is the mesh's `Col` attribute, so one
    material can paint the whole body (skin, suit, tie) in one draw call."""
    mat = bpy.data.materials.new(name)
    tree = mat.node_tree
    bsdf = tree.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = roughness
    attr = tree.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Col"
    tree.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


class Parts:
    """Collects mesh parts, each rigidly bound to one bone and painted one
    colour, then joins them into a single skinned mesh."""

    def __init__(self, materials):
        self.materials = materials
        self.objects = []

    def _add(self, name, bm, colour, bone, mat=0):
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        mesh = bpy.data.meshes.new(name)
        bm.to_mesh(mesh)
        bm.free()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        for m in self.materials:
            mesh.materials.append(m)
        for p in mesh.polygons:
            p.material_index = mat
            p.use_smooth = False
        col = mesh.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
        lin = (*srgb_to_linear(colour), 1.0)
        for c in col.data:
            c.color = lin
        vg = obj.vertex_groups.new(name=bone)
        vg.add(list(range(len(mesh.vertices))), 1.0, "REPLACE")
        self.objects.append(obj)
        return obj

    def seg(self, name, a, b, ra, rb, colour, bone, verts=8, mat=0, spin=0.0):
        """A tapered tube from a to b (fighter space), radius ra at a and rb at b."""
        import math

        a, b = fighter(*a), fighter(*b)
        d = (b - a).normalized()
        u = d.orthogonal().normalized()
        v = d.cross(u)
        bm = bmesh.new()
        rings = []
        for centre, r in ((a, ra), (b, rb)):
            ring = []
            for i in range(verts):
                t = 2 * math.pi * i / verts + spin
                ring.append(bm.verts.new(centre + (u * math.cos(t) + v * math.sin(t)) * r))
            rings.append(ring)
        for i in range(verts):
            j = (i + 1) % verts
            bm.faces.new((rings[0][i], rings[0][j], rings[1][j], rings[1][i]))
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[1])
        return self._add(name, bm, colour, bone, mat)

    def blob(self, name, centre, radii, colour, bone, subdiv=1, mat=0):
        """A faceted ellipsoid (radii in side, fwd, up)."""
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
        c = fighter(*centre)
        for vert in bm.verts:
            vert.co = Vector((vert.co.x * radii[0], vert.co.y * radii[1], vert.co.z * radii[2])) + c
        return self._add(name, bm, colour, bone, mat)

    def hull(self, name, points, colour, bone, mat=0):
        """Convex hull of fighter-space points (torsos, shoes, lapels)."""
        bm = bmesh.new()
        for p in points:
            bm.verts.new(fighter(*p))
        bmesh.ops.convex_hull(bm, input=bm.verts)
        bmesh.ops.dissolve_limit(bm, angle_limit=0.01, verts=bm.verts, edges=bm.edges)
        return self._add(name, bm, colour, bone, mat)

    def box(self, name, centre, size, colour, bone, mat=0):
        """An axis-aligned box (size in side, fwd, up)."""
        cx, cf, cu = centre
        sx, sf, su = (s / 2 for s in size)
        pts = [(cx + i * sx, cf + j * sf, cu + k * su) for i in (-1, 1) for j in (-1, 1) for k in (-1, 1)]
        return self.hull(name, pts, colour, bone, mat)

    def join(self, name, rig=None):
        """One mesh, skinned to `rig` through its vertex groups (or, with no
        rig, a plain mesh: the effect meshes)."""
        bpy.ops.object.select_all(action="DESELECT")
        for o in self.objects:
            o.select_set(True)
        bpy.context.view_layer.objects.active = self.objects[0]
        bpy.ops.object.join()
        body = bpy.context.view_layer.objects.active
        body.name = name
        body.data.name = name
        self.objects = []
        if rig is None:
            body.vertex_groups.clear()
            return body
        body.parent = rig
        mod = body.modifiers.new("rig", "ARMATURE")
        mod.object = rig
        return body


def triangles(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def export_glb(path, objects):
    """Deform bones only (the IK controls stay in the .blend); every action is
    sampled at 60 fps with the IK baked in, and slid to start at time 0."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
        export_frame_step=1,
        export_optimize_animation_size=True,
        export_anim_slide_to_zero=True,
        export_def_bones=True,
        export_materials="EXPORT",
        export_extras=True,
    )
    from .glb import compact

    before = path.stat().st_size
    print(f"exported {path} ({before} bytes, {compact(path)} compacted)")
