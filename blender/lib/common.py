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
    """Collects mesh parts (rigid ones bound to one bone, tubes blended
    across joints), then joins them into a single skinned mesh.

    Every part may also take `paint`, a function that paints its texels in
    the atlas (lib/texture.py), and `shapes`, {shape key: f(point) → point}
    in fighter space, for expressions and fists (applied in the rest pose).
    Parts are numbered (the `part` face attribute) and described in `meta`."""

    def __init__(self, materials):
        self.materials = materials
        self.objects = []
        self.meta = []
        self.hidden = []  # (shape key, grip, part names): held props, see held()

    def held(self, key, grip, *names):
        """Parts that only show while shape key `key` is up (a prop taken out
        for one move): built and painted full size, then collapse() shrinks
        them to `grip` (fighter space, inside the fist) in every other key."""
        for m in self.meta:
            if m["name"] in names:
                m["shapes"] = {**m["shapes"], key: lambda q: q}
        self.hidden.append((key, grip, set(names)))

    def collapse(self, obj):
        """After painting: the held parts' vertices go to their grip in the
        basis and every key but their own, so only that key shows them."""
        import numpy as np

        if not self.hidden:
            return
        me = obj.data
        part = np.empty(len(me.polygons), dtype=np.int32)
        me.attributes["part"].data.foreach_get("value", part)
        vpart = np.full(len(me.vertices), -1, dtype=np.int32)
        for p in me.polygons:
            vpart[list(p.vertices)] = part[p.index]
        for key, grip, names in self.hidden:
            me.shape_keys.key_blocks[key].value = 0.0  # new keys start at 1
            ids = {i for i, m in enumerate(self.meta) if m["name"] in names}
            g = fighter(*grip)
            for vi in np.nonzero(np.isin(vpart, list(ids)))[0].tolist():
                me.vertices[vi].co = g
                for kb in me.shape_keys.key_blocks:
                    if kb.name != key:
                        kb.data[vi].co = g

    def _add(self, name, bm, colour, bone, mat=0, face_colours=None, weights=None, paint=None, shapes=None, recalc=True):
        """A part from a bmesh. One colour and one bone by default; or a
        colour per face (`face_colours`) and per-vertex bone weights
        (`weights`: a {bone: weight} dict per vertex), for blended joints."""
        if recalc:
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
        mesh.attributes.new("part", "INT", "FACE").data.foreach_set("value", [len(self.meta)] * len(mesh.polygons))
        self.meta.append({"name": name, "mat": mat, "paint": paint, "shapes": shapes or {}})
        col = mesh.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
        lin = (*srgb_to_linear(colour), 1.0)
        for c in col.data:
            c.color = lin
        if face_colours:
            for p, fc in zip(mesh.polygons, face_colours):
                lc = (*srgb_to_linear(fc), 1.0)
                for li in p.loop_indices:
                    col.data[li].color = lc
        if weights is None:
            vg = obj.vertex_groups.new(name=bone)
            vg.add(list(range(len(mesh.vertices))), 1.0, "REPLACE")
        else:
            groups = {}
            for vi, wd in enumerate(weights):
                for bname, w in wd.items():
                    if w <= 0:
                        continue
                    if bname not in groups:
                        groups[bname] = obj.vertex_groups.new(name=bname)
                    groups[bname].add([vi], w, "REPLACE")
        self.objects.append(obj)
        return obj

    def tube(self, name, rings, verts=10, mat=0, caps=True, paint=None, shapes=None):
        """A continuous tube through rings of (centre, radius, weights,
        colour): `weights` is {bone: weight} for the ring's vertices, and the
        colour paints the span from this ring to the next. Frames are carried
        along the tube (parallel transport) so it never twists. Radius may
        be (r_side, r_depth) for an oval section."""
        import math

        bm = bmesh.new()
        cs = [fighter(*r[0]) for r in rings]
        tangents = []
        for i in range(len(cs)):
            a, b = cs[max(0, i - 1)], cs[min(len(cs) - 1, i + 1)]
            tangents.append((b - a).normalized())
        u = Vector((1, 0, 0)) if abs(tangents[0].x) < 0.9 else Vector((0, 1, 0))
        u = (u - tangents[0] * u.dot(tangents[0])).normalized()
        loops, vweights = [], []
        for i, (c, (_, rad, wts, _col)) in enumerate(zip(cs, rings)):
            t = tangents[i]
            u = (u - t * u.dot(t)).normalized()
            v = t.cross(u)
            rx, ry = rad if isinstance(rad, tuple) else (rad, rad)
            ring = []
            for k in range(verts):
                a = 2 * math.pi * k / verts
                ring.append(bm.verts.new(c + u * math.cos(a) * rx + v * math.sin(a) * ry))
                vweights.append(wts)
            loops.append(ring)
        face_colours = []
        for i in range(len(loops) - 1):
            for k in range(verts):
                j = (k + 1) % verts
                bm.faces.new((loops[i][k], loops[i][j], loops[i + 1][j], loops[i + 1][k]))
                face_colours.append(rings[i][3])
        if caps:
            bm.faces.new(list(reversed(loops[0])))
            face_colours.append(rings[0][3])
            bm.faces.new(loops[-1])
            face_colours.append(rings[-2][3])
        return self._add(name, bm, rings[0][3], None, mat, face_colours, vweights, paint, shapes)

    def seg(self, name, a, b, ra, rb, colour, bone, verts=8, mat=0, spin=0.0, paint=None, shapes=None):
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
        return self._add(name, bm, colour, bone, mat, paint=paint, shapes=shapes)

    def blob(self, name, centre, radii, colour, bone, subdiv=1, mat=0, paint=None, shapes=None):
        """A faceted ellipsoid (radii in side, fwd, up)."""
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
        c = fighter(*centre)
        for vert in bm.verts:
            vert.co = Vector((vert.co.x * radii[0], vert.co.y * radii[1], vert.co.z * radii[2])) + c
        return self._add(name, bm, colour, bone, mat, paint=paint, shapes=shapes)

    def hull(self, name, points, colour, bone, mat=0, paint=None, shapes=None, weigh=None):
        """Convex hull of fighter-space points (torsos, shoes, lapels).
        `weigh(point) → {bone: weight}` skins it across bones instead (a
        mouth whose lower half rides the jaw, a tie in two pieces)."""
        bm = bmesh.new()
        for p in points:
            bm.verts.new(fighter(*p))
        bmesh.ops.convex_hull(bm, input=bm.verts)
        bmesh.ops.dissolve_limit(bm, angle_limit=0.01, verts=bm.verts, edges=bm.edges)
        if weigh is None:
            return self._add(name, bm, colour, bone, mat, paint=paint, shapes=shapes)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.verts.index_update()
        weights = [weigh(from_blender(v.co)) for v in sorted(bm.verts, key=lambda v: v.index)]
        return self._add(name, bm, colour, bone, mat, weights=weights, paint=paint, shapes=shapes, recalc=False)

    def poly(self, name, points, colour, bone, facing, mat=0, paint=None):
        """One flat, one-sided face through fighter-space points (walls,
        floors, decals), its front toward `facing` (a fighter-space direction)."""
        bm = bmesh.new()
        f = bm.faces.new([bm.verts.new(fighter(*p)) for p in points])
        f.normal_update()
        if f.normal.dot(fighter(*facing)) < 0:
            f.normal_flip()
        return self._add(name, bm, colour, bone, mat, paint=paint, recalc=False)

    def box(self, name, centre, size, colour, bone, mat=0, paint=None, shapes=None, weigh=None):
        """An axis-aligned box (size in side, fwd, up)."""
        cx, cf, cu = centre
        sx, sf, su = (s / 2 for s in size)
        pts = [(cx + i * sx, cf + j * sf, cu + k * su) for i in (-1, 1) for j in (-1, 1) for k in (-1, 1)]
        return self.hull(name, pts, colour, bone, mat, paint, shapes, weigh)

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
        self._shape_keys(body)
        if rig is None:
            body.vertex_groups.clear()
            return body
        body.parent = rig
        mod = body.modifiers.new("rig", "ARMATURE")
        mod.object = rig
        return body


    def _shape_keys(self, obj):
        """Shape keys from the parts' `shapes`: every vertex of a part moved
        by its function (rest pose, fighter space); other vertices stay."""
        import numpy as np

        me = obj.data
        part = np.empty(len(me.polygons), dtype=np.int32)
        me.attributes["part"].data.foreach_get("value", part)
        keys = sorted({k for i in set(part.tolist()) for k in self.meta[i]["shapes"]})
        if not keys:
            return
        vpart = np.full(len(me.vertices), -1, dtype=np.int32)
        for p in me.polygons:
            vpart[list(p.vertices)] = part[p.index]
        obj.shape_key_add(name="Basis", from_mix=False)
        for key in keys:
            kb = obj.shape_key_add(name=key, from_mix=False)
            for vi, pid in enumerate(vpart):
                fn = self.meta[pid]["shapes"].get(key) if pid >= 0 else None
                if fn:
                    kb.data[vi].co = fighter(*fn(from_blender(me.vertices[vi].co)))


def triangles(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def shape_key_tracks(obj, actions):
    """Each clip's shape-key values, sampled every frame: {clip: (times,
    [weights per frame])}, weights in key-block order (the glTF targets').
    The exporter only writes the shape keys of the action assigned when it
    runs, so glb.compact writes these into every clip itself."""
    from bpy_extras.anim_utils import action_get_channelbag_for_slot

    names = [kb.name for kb in obj.data.shape_keys.key_blocks[1:]]
    out = {}
    for act in actions:
        curves = {}
        for slot in act.slots:
            if slot.target_id_type != "KEY":
                continue
            bag = action_get_channelbag_for_slot(act, slot)
            for fc in bag.fcurves if bag else []:
                curves[fc.data_path.split('"')[1]] = fc
        f0, f1 = int(act.frame_start), int(act.frame_end)
        frames = range(f0, f1 + 1)
        out[act.name] = ([(f - f0) / FPS for f in frames],
                         [[max(0.0, min(1.0, curves[n].evaluate(f))) if n in curves else 0.0 for n in names] for f in frames])
    return out


def export_glb(path, objects, morphs=None):
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
        export_image_format="AUTO",
        export_morph_normal=False,
        export_extras=True,
    )
    from .glb import compact

    before = path.stat().st_size
    print(f"exported {path} ({before} bytes, {compact(path, morphs or {})} compacted)")
