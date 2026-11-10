"""Builds one stage from its module (blender/stages/<id>.py): the set and
its pieces as plain meshes (no rig), painted atlases, the light rig per
segment, then writes art/stage-<id>.blend and public/assets/stages/<id>.glb.

Stage space is fighter space with the stage for a fighter: side is the
stage's x (+ to the camera's right), fwd is toward the camera (glTF +z),
up is up; the origin is the centre of the arena on the floor.

A stage module defines ID, LIGHTS (one dict per segment, written to the
`lights` node's extras for the game) and build(make), which calls
make(name, parts_fn, at=(x, fwd, up)) once per object: parts_fn adds the
object's parts to `p`; `at` moves the finished object (painting happens
first, in the space the parts were built in, so a prop's paint can work
around its own origin).
"""
import json

import bpy

from . import bake
from .common import Parts, export_glb, fighter, reset_scene, triangles, vertex_colour_material
from .glb import add_occlusion
from .texture import paint, unwrap, use_atlas, use_glow

# Material sizes: the set is one big atlas (most of what's on screen), the
# props and effects a small one; water is a flat translucent colour.
ATLAS = {0: 2048, 1: 512}


def water_material(alpha=0.45):
    m = vertex_colour_material("water", roughness=0.15)
    m.node_tree.nodes["Principled BSDF"].inputs["Alpha"].default_value = alpha
    try:
        m.surface_render_method = "BLENDED"
    except AttributeError:
        m.blend_method = "BLEND"
    return m


def build(mod, out_dir, art_dir):
    reset_scene()
    p = Parts([vertex_colour_material("set"), vertex_colour_material("props", roughness=0.4), water_material()])
    objs, moves = [], []

    def make(name, parts_fn, at=None):
        parts_fn(p)
        obj = p.join(name)
        objs.append(obj)
        if at is not None:
            moves.append((obj, at))
        return obj

    mod.build(make)

    dense = {m["name"] for m in p.meta if m["name"].startswith(getattr(mod, "DENSE", ()))}
    unwrap(objs, dense, p.meta)
    for mi, size in ATLAS.items():
        if any(pl.material_index == mi for o in objs for pl in o.data.polygons):
            atlas, glow, strength = paint(objs, p.meta, mi, size, art_dir / "textures" / f"stage-{mod.ID}_{p.materials[mi].name}.png",
                                          glow=getattr(mod, "EMISSION", {}))
            use_atlas(p.materials[mi], atlas)
            if glow is not None:
                use_glow(p.materials[mi], glow, strength)
    for obj, at in moves:
        obj.location = fighter(*at)
    bpy.context.view_layer.update()
    bake.unwrap(objs)
    ao = bake.bake(mod, objs, p.materials, art_dir)
    maps = bake.light_maps(mod, objs, p.materials, art_dir, out_dir)

    # The light rig per segment, for the game (it uses fixed lights).
    lights = bpy.data.objects.new("lights", None)
    bpy.context.scene.collection.objects.link(lights)
    lights["segments"] = json.dumps(bake.rigs(mod.LIGHTS, maps, getattr(mod, "LIGHTMAP_STRENGTH", None)))

    print(f"[{mod.ID}] " + ", ".join(f"{o.name} {triangles(o)}" for o in objs) + f"; {sum(triangles(o) for o in objs)} triangles")
    art_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(art_dir / f"stage-{mod.ID}.blend"), compress=True)
    export_glb(out_dir / "stages" / f"{mod.ID}.glb", [*objs, lights])
    add_occlusion(out_dir / "stages" / f"{mod.ID}.glb", ao)
