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
around its own origin). For a piece the game moves in place (art step 29:
`shake_*`, `swing_*`), `pivot` puts the object's origin there without
moving the piece, and `parent` makes it a child of a `set` or `seg_*`
object: it shows and hides with that, takes its light map, and is baked
with it.

Optional, for a scene that isn't a fight (the title's room, step 24 C):
AUDIENCE = False leaves out the bleachers and their seats; ATLAS overrides
the atlas sizes; SCREEN = True makes the third material `screen` (for the
game to replace) instead of water; EMPTIES lists (name, at, target) empties
whose −Z in glTF (a camera's view) looks at `target`, with FOV {name:
degrees} in an empty's extras as `fov`; finish(objs) runs
after the atlases are unwrapped (to give a mesh UVs of its own).
"""
import json
import math

import bpy

from . import audience, bake
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


def _look(at, target):
    """An empty's rotation so its glTF −Z looks from `at` at `target` (Blender
    coordinates), glTF +Y up: the exporter turns Blender's local +Y into
    glTF's −Z, and local +Z into +Y."""
    from mathutils import Matrix, Vector

    y = (target - at).normalized()
    x = y.cross(Vector((0, 0, 1))).normalized()
    z = x.cross(y)
    return Matrix((x, y, z)).transposed().to_euler()


def build(mod, out_dir, art_dir):
    reset_scene()
    third = vertex_colour_material("screen", roughness=0.1) if getattr(mod, "SCREEN", False) else water_material()
    p = Parts([vertex_colour_material("set"), vertex_colour_material("props", roughness=0.4), third])
    crowd = getattr(mod, "AUDIENCE", True)
    objs, moves = [], []

    pivots, parents = [], []

    def make(name, parts_fn, at=None, pivot=None, parent=None):
        parts_fn(p)
        obj = p.join(name)
        objs.append(obj)
        if at is not None:
            moves.append((obj, at))
        if pivot is not None:
            pivots.append((obj, pivot))
        if parent is not None:
            parents.append((obj, parent))
        return obj

    mod.build(make)
    # Every stage has the same bleachers past its side walls (step 24 B).
    if crowd:
        make("audience", audience.build)

    # Every atlas at PNG's strongest (lossless) compression: the stages run
    # close to their 2 MB with the light maps.
    bpy.context.scene.render.image_settings.compression = 100
    dense = {m["name"] for m in p.meta if m["name"].startswith((*getattr(mod, "DENSE", ()), *audience.DENSE))}
    unwrap(objs, dense, p.meta)
    if hasattr(mod, "finish"):
        mod.finish(objs)
    for mi, size in getattr(mod, "ATLAS", ATLAS).items():
        if any(pl.material_index == mi for o in objs for pl in o.data.polygons):
            atlas, glow, strength = paint(objs, p.meta, mi, size, art_dir / "textures" / f"stage-{mod.ID}_{p.materials[mi].name}.png",
                                          glow={**getattr(mod, "EMISSION", {}), **audience.EMISSION}, glow_max=getattr(mod, "GLOW_SIZE", None))
            use_atlas(p.materials[mi], atlas)
            if glow is not None:
                use_glow(p.materials[mi], glow, strength)
    for obj, at in moves:
        obj.location = fighter(*at)
    from mathutils import Matrix
    for obj, at in pivots:
        v = fighter(*at)
        obj.data.transform(Matrix.Translation(-v))
        obj.location = v
    by_name = {o.name: o for o in objs}
    for obj, name in parents:
        par = by_name[name]
        obj.parent = par
        obj.matrix_parent_inverse = par.matrix_world.inverted()
    # Where the game sits a beaten fighter: empties, exported with the stage.
    seats = []
    for name, at, aim in (audience.seats() if crowd else []) + list(getattr(mod, "EMPTIES", [])):
        e = bpy.data.objects.new(name, None)
        bpy.context.scene.collection.objects.link(e)
        e.location = fighter(*at)
        if isinstance(aim, tuple):
            e.rotation_euler = _look(fighter(*at), fighter(*aim))
        else:
            e.rotation_euler = (0, 0, math.radians(aim))
        if name in getattr(mod, "FOV", {}):
            e["fov"] = mod.FOV[name]
        seats.append(e)
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
    export_glb(out_dir / "stages" / f"{mod.ID}.glb", [*objs, *seats, lights])
    add_occlusion(out_dir / "stages" / f"{mod.ID}.glb", ao)
