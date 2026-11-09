"""Baked ambient occlusion for a stage (docs/BLENDER-TODO.md, step 23 A).

A second UV set, `AO`, on every object: `set`, the `seg_*` pieces and the
`prop_*` objects are unwrapped onto it per material without overlaps (one
atlas per material: `set` 1024², `props` 512²); the `fx_*` meshes share
those materials, so they carry the layer too, every corner on a white texel
kept free in the atlas's top-right corner.

The bake (Cycles, AO over about 1.5 m) runs in passes, each with only the
geometry it should see: `set` with segment 1's pieces in place, every other
segment's pieces with the set and segment 1's around them, each prop on its
own (props move, so no floor). Each pass is kept only where its own faces
land (rasterised from the UVs), the passes are merged, smoothed inside the
islands, deepened and lifted so a corner's darkest is about 35%, and the gutters filled.
The atlases go to art/textures/stage-<id>_<material>_ao.png and into the
GLB as each material's occlusionTexture on texCoord 1 (lib/glb.py).
"""
import math

import bmesh
import bpy
import numpy as np

from .texture import _dilate, _edit, _raster, _save

LAYER = "AO"
SIZE = {0: 1024, 1: 512}
# Islands are packed into the bottom-left 97%; the corner past it stays white
# for the fx meshes.
FIT = 0.97
WHITE_UV = (0.99, 0.99)
DISTANCE = 1.5
SAMPLES = 256
FLOOR = 0.35
# Raw AO stays high in the corners players see (0.75 to 0.9: a few texels
# a metre, and the contact line is thin), so it's taken to the 4th power
# before the lift: a corner lands about halfway to FLOOR, faces hidden in
# contact reach it, open floor stays white.
GAMMA = 4.0


def baked(name):
    return name == "set" or name.startswith(("seg_", "prop_"))


def unwrap(objs):
    """The AO layer on every object; the baked ones unwrapped per material."""
    for o in objs:
        if LAYER not in o.data.uv_layers:
            o.data.uv_layers.new(name=LAYER)
        o.data.uv_layers.active = o.data.uv_layers[LAYER]
    for mi, size in SIZE.items():
        users = [o for o in objs if baked(o.name) and any(p.material_index == mi for p in o.data.polygons)]
        if not users:
            continue
        _edit(users, mi)
        bpy.ops.uv.smart_project(angle_limit=math.radians(62), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
        bpy.ops.uv.average_islands_scale()
        # 8 texels between islands, so neither a texel's neighbours nor
        # mipmaps reach the next island.
        bpy.ops.uv.pack_islands(rotate=True, shape_method="CONCAVE", margin_method="FRACTION", margin=8 / size)
        bpy.ops.object.mode_set(mode="OBJECT")
    for o in objs:
        uv = np.empty(len(o.data.loops) * 2)
        lay = o.data.uv_layers[LAYER].data
        lay.foreach_get("uv", uv)
        uv = uv.reshape(-1, 2) * FIT if baked(o.name) else np.tile(WHITE_UV, (len(o.data.loops), 1))
        lay.foreach_set("uv", uv.ravel())
        # The painted atlas stays TEXCOORD_0.
        o.data.uv_layers.active = o.data.uv_layers["UV"]
        o.data.uv_layers["UV"].active_render = True


def _cycles():
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    scene.cycles.device = "CPU"
    for kind in ("OPTIX", "CUDA"):
        try:
            prefs.compute_device_type = kind
            prefs.get_devices()
        except TypeError:
            continue
        gpus = [d for d in prefs.devices if d.type == kind]
        if gpus:
            for d in prefs.devices:
                d.use = d.type == kind
            scene.cycles.device = "GPU"
            break
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = False
    if scene.world is None:
        scene.world = bpy.data.worlds.new("World")
    scene.world.light_settings.distance = DISTANCE
    bake = scene.render.bake
    bake.margin = 2
    bake.use_clear = True
    bake.target = "IMAGE_TEXTURES"


def _targets(materials, stem):
    """A fresh float image per material, set as its active node for the bake."""
    out = {}
    for mi, m in enumerate(materials[:2]):
        size = SIZE[mi]
        img = bpy.data.images.new(f"{stem}_{mi}", size, size, alpha=False, float_buffer=True)
        img.colorspace_settings.name = "Non-Color"
        tree = m.node_tree
        node = tree.nodes.new("ShaderNodeTexImage")
        node.name = node.label = "ao_bake"
        node.image = img
        uvn = tree.nodes.new("ShaderNodeUVMap")
        uvn.uv_map = LAYER
        tree.links.new(uvn.outputs["UV"], node.inputs["Vector"])
        tree.nodes.active = node
        out[mi] = img
    return out


def _drop_targets(materials, imgs):
    for m in materials[:2]:
        for n in [n for n in m.node_tree.nodes if n.name.startswith("ao_bake") or (n.type == "UVMAP" and n.uv_map == LAYER)]:
            m.node_tree.nodes.remove(n)
    for img in imgs.values():
        bpy.data.images.remove(img)


def _pass(objs, seen, bake, materials, k):
    """Bake `bake` with only `seen` rendered; returns {mi: (ao, coverage)}."""
    for o in objs:
        o.hide_render = o not in seen
    imgs = _targets(materials, f"ao_pass{k}")
    for o in bake:
        o.data.uv_layers.active = o.data.uv_layers[LAYER]
    bpy.ops.object.select_all(action="DESELECT")
    for o in bake:
        o.select_set(True)
    bpy.context.view_layer.objects.active = bake[0]
    bpy.ops.object.bake(type="AO", margin=2, use_clear=True)
    out = {}
    for mi, img in imgs.items():
        size = SIZE[mi]
        px = np.empty(size * size * 4, dtype=np.float32)
        img.pixels.foreach_get(px)
        ao = px.reshape(size, size, 4)[..., 0]
        owner = np.full((size, size), -1, dtype=np.int32)
        scratch = np.zeros((size, size, 3), dtype=np.float32)
        for o in bake:
            _raster(o, mi, size, scratch, owner, scratch.copy(), scratch.copy(), layer=LAYER)
        out[mi] = (ao, owner >= 0)
    for o in bake:
        o.data.uv_layers.active = o.data.uv_layers["UV"]
    _drop_targets(materials, imgs)
    return out


def _smooth(ao, mask):
    """A 3×3 mean inside the islands only (the bake's noise, not its edges)."""
    acc = np.zeros_like(ao)
    cnt = np.zeros_like(ao)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            m = np.roll(np.roll(mask, dy, 0), dx, 1)
            acc += np.roll(np.roll(ao, dy, 0), dx, 1) * m
            cnt += m
    return np.where(mask, acc / np.maximum(cnt, 1), ao)


def bake(mod, objs, materials, art_dir):
    """Bakes the stage's AO; returns {material name: PNG path}."""
    _cycles()
    first = set(getattr(mod, "FIRST", ()))
    by = {o.name: o for o in objs}
    base = [by["set"]] + [by[n] for n in first]
    passes = [(base, base)]
    passes += [(base + [o], [o]) for o in objs if o.name.startswith("seg_") and o.name not in first]
    passes += [([o], [o]) for o in objs if o.name.startswith("prop_")]

    acc = {mi: np.ones((s, s), dtype=np.float32) for mi, s in SIZE.items()}
    cover = {mi: np.zeros((s, s), dtype=bool) for mi, s in SIZE.items()}
    for k, (seen, todo) in enumerate(passes):
        for mi, (ao, mask) in _pass(objs, seen, todo, materials, k).items():
            acc[mi][mask] = ao[mask]
            cover[mi] |= mask
    for o in objs:
        o.hide_render = False

    out = {}
    for mi, size in SIZE.items():
        if not cover[mi].any():
            continue
        ao = _smooth(np.clip(acc[mi], 0, 1), cover[mi])
        ao = FLOOR + (1 - FLOOR) * ao ** GAMMA
        # Gutters take their island's values; past them (and the fx corner) stays white.
        ao = _dilate(ao[..., None], cover[mi], 6)[..., 0]
        name = materials[mi].name
        path = art_dir / "textures" / f"stage-{mod.ID}_{name}_ao.png"
        # Rows run bottom-up in UV space, as the painted atlases do.
        _save(np.repeat(ao[..., None], 3, axis=2) * 255, path)
        out[name] = path
    return out
