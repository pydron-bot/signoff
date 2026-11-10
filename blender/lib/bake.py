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
    return name == "set" or name.startswith(("seg_", "prop_", "shake_", "swing_"))


def family(objs, these):
    """These objects and their children (a set piece the game moves in place,
    `shake_*` and `swing_*`, is a child of its `set` or `seg_*`: baked with it)."""
    return [x for o in these for x in [o] + [c for c in objs if c.parent is o]]


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


def _pass(objs, seen, bake, materials, k, kind="AO"):
    """Bake `bake` with only `seen` rendered; returns {mi: (ao, coverage)},
    or for the light, {mi: (rgb, coverage)}."""
    for o in objs:
        o.hide_render = o not in seen
    imgs = _targets(materials, f"ao_pass{k}")
    for o in bake:
        o.data.uv_layers.active = o.data.uv_layers[LAYER]
    bpy.ops.object.select_all(action="DESELECT")
    for o in bake:
        o.select_set(True)
    bpy.context.view_layer.objects.active = bake[0]
    if kind == "AO":
        bpy.ops.object.bake(type="AO", margin=2, use_clear=True)
    else:
        bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, margin=2, use_clear=True)
    out = {}
    for mi, img in imgs.items():
        size = SIZE[mi]
        px = np.empty(size * size * 4, dtype=np.float32)
        img.pixels.foreach_get(px)
        ao = px.reshape(size, size, 4)[..., 0] if kind == "AO" else px.reshape(size, size, 4)[..., :3].copy()
        owner = np.full((size, size), -1, dtype=np.int32)
        scratch = np.zeros((size, size, 3), dtype=np.float32)
        for o in bake:
            _raster(o, mi, size, scratch, owner, scratch.copy(), scratch.copy(), layer=LAYER)
        out[mi] = (ao, owner >= 0)
    for o in bake:
        o.data.uv_layers.active = o.data.uv_layers["UV"]
    _drop_targets(materials, imgs)
    return out


def _smooth(ao, mask, r=1):
    """A (2r+1)² mean inside the islands only (the bake's noise, not its
    edges); ao is (h, w) or (h, w, channels)."""
    m3 = mask if ao.ndim == 2 else mask[..., None]
    acc = np.zeros_like(ao)
    cnt = np.zeros(mask.shape, dtype=np.float32) if ao.ndim == 2 else np.zeros(mask.shape + (1,), dtype=np.float32)
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            m = np.roll(np.roll(m3, dy, 0), dx, 1)
            acc += np.roll(np.roll(ao, dy, 0), dx, 1) * m
            cnt += m
    return np.where(m3, acc / np.maximum(cnt, 1), ao)


def bake(mod, objs, materials, art_dir):
    """Bakes the stage's AO; returns {material name: PNG path}."""
    _cycles()
    first = set(getattr(mod, "FIRST", ()))
    by = {o.name: o for o in objs}
    base = family(objs, [by["set"]] + [by[n] for n in first])
    passes = [(base, base)]
    passes += [(base + family(objs, [o]), family(objs, [o])) for o in objs if o.name.startswith("seg_") and o.name not in first]
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


# The baked light (step 23 B) -------------------------------------------------
#
# A stage's LIGHTMAPS: {segment n: (the seg_* pieces shown, [lamps])}. Map 1
# is every segment's that has no map of its own. Each is the light of those
# lamps alone (the game adds its ambient, key and rim), direct and one
# bounce, baked on the AO layout of the `set` material. The materials' own
# emission is switched off for the bake, so only the lamps listed light it.

LIGHT_SIZE = 1024
LIGHT_SAMPLES = 512
# The PNG holds 0–1: values are stored over this and the rig's `lightMap`
# multiplies them back, so a hot spot can reach 1.5.
LIGHT_RANGE = 1.5
# Map 1's 95th percentile of lit texels lands here (a lamp's pool about as
# bright as the key light); every map of a stage shares map 1's scale.
LIGHT_POOL = 1.0


def area(at, size, colour, power, aim, width=(1, 0, 0), spread=180):
    """An area lamp at `at` (stage space), size (w, h) metres, shining toward
    the point `aim`, its width along `width`; spread in degrees (narrow is a
    beam: Burn's sunlight through the panes)."""
    return dict(kind="AREA", at=at, size=size, colour=colour, power=power, aim=aim, width=width, spread=spread)


def spot(at, aim, colour, power, angle=50, blend=0.6, radius=0.1):
    return dict(kind="SPOT", at=at, colour=colour, power=power, aim=aim, angle=angle, blend=blend, radius=radius)


def point(at, colour, power, radius=0.1):
    return dict(kind="POINT", at=at, colour=colour, power=power, radius=radius)


def _lamp(i, d):
    from mathutils import Matrix, Vector

    from .common import fighter, srgb_to_linear

    li = bpy.data.lights.new(f"lamp{i}", d["kind"])
    li.color = srgb_to_linear(d["colour"])
    li.energy = d["power"]
    if d["kind"] == "AREA":
        li.shape = "RECTANGLE"
        li.size, li.size_y = d["size"]
        li.spread = math.radians(d["spread"])
    if d["kind"] == "SPOT":
        li.spot_size = math.radians(d["angle"])
        li.spot_blend = d["blend"]
    if d["kind"] in ("SPOT", "POINT"):
        li.shadow_soft_size = d["radius"]
    ob = bpy.data.objects.new(f"lamp{i}", li)
    bpy.context.scene.collection.objects.link(ob)
    at = fighter(*d["at"])
    ob.location = at
    if "aim" in d:
        z = -(fighter(*d["aim"]) - at).normalized()
        w = fighter(*d.get("width", (1, 0, 0))) if d["kind"] == "AREA" else (Vector((0, 0, 1)) if abs(z.z) < 0.9 else Vector((1, 0, 0)))
        x = (w - z * w.dot(z)).normalized()
        y = z.cross(x)
        ob.rotation_euler = Matrix((x, y, z)).transposed().to_euler()
    return ob


def light_maps(mod, objs, materials, art_dir, out_dir):
    """Bakes the stage's light maps; returns {segment n: file name in
    public/assets/stages/}, or {} if the stage has no LIGHTMAPS."""
    maps = getattr(mod, "LIGHTMAPS", None)
    if not maps:
        return {}
    _cycles()
    scene = bpy.context.scene
    scene.cycles.samples = LIGHT_SAMPLES
    # No light but the lamps: a black world.
    scene.world.color = (0, 0, 0)
    for n in (scene.world.node_tree.nodes if scene.world.node_tree else ()):
        if n.type == "BACKGROUND":
            n.inputs["Strength"].default_value = 0.0
    glow = {}
    for m in materials:
        bsdf = m.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            glow[m.name] = bsdf.inputs["Emission Strength"].default_value
            bsdf.inputs["Emission Strength"].default_value = 0.0
    by = {o.name: o for o in objs}
    size = SIZE[0]
    raw = {}
    for n, (pieces, lamps) in sorted(maps.items()):
        obs = [_lamp(i, d) for i, d in enumerate(lamps)]
        base = family(objs, [by["set"]] + [by[k] for k in pieces])
        passes = [(base, base)]
        if n == 1:
            # Map 1 serves the segments without their own, so it covers every piece.
            passes += [(base + family(objs, [o]), family(objs, [o])) for o in objs if o.name.startswith("seg_") and o.name not in pieces]
        acc = np.zeros((size, size, 3), dtype=np.float32)
        cover = np.zeros((size, size), dtype=bool)
        for k, (seen, todo) in enumerate(passes):
            rgb, mask = _pass(objs, seen, todo, materials, f"light{n}_{k}", kind="LIGHT")[0]
            acc[mask] = rgb[mask]
            cover |= mask
        for ob in obs:
            bpy.data.objects.remove(ob)
        # 7×7: the light is soft, and a noisy map doesn't compress.
        raw[n] = (_smooth(acc, cover, 3), cover)
    for o in objs:
        o.hide_render = False
    for m in materials:
        if m.name in glow:
            m.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = glow[m.name]

    lum = raw[1][0] @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    lit = lum[raw[1][1] & (lum > 1e-4)]
    scale = LIGHT_POOL / max(float(np.percentile(lit, 95)), 1e-6) if lit.size else 1.0
    out = {}
    light_size = getattr(mod, "LIGHT_SIZE", LIGHT_SIZE)
    for n, (rgb, cover) in raw.items():
        v = np.clip(rgb * scale / LIGHT_RANGE, 0, 1)
        v = _dilate(v, cover, 6)
        while v.shape[0] > light_size:
            v = (v[0::2, 0::2] + v[1::2, 0::2] + v[0::2, 1::2] + v[1::2, 1::2]) / 4
        srgb = np.where(v <= 0.0031308, v * 12.92, 1.055 * np.power(v, 1 / 2.4) - 0.055) * 255
        # A stage short of bytes stores coarser steps (they compress better).
        step = getattr(mod, "LIGHT_STEP", 1)
        srgb = np.round(srgb / step) * step
        suffix = "" if n == 1 else f"-{n}"
        path = art_dir / "textures" / f"stage-{mod.ID}_light{suffix}.png"
        scene.render.image_settings.compression = 100
        img = _save(srgb, path)
        scene.render.image_settings.compression = 15
        bpy.data.images.remove(img)
        name = f"{mod.ID}-light{suffix}.png"
        (out_dir / "stages").mkdir(parents=True, exist_ok=True)
        (out_dir / "stages" / name).write_bytes(path.read_bytes())
        out[n] = name
    return out


def rigs(lights, files, strength=None):
    """The `lights` rigs with each segment's lightMapFile (its own map, if
    it has one; map 1 for segment 1) and lightMap (LIGHT_RANGE, times the
    stage's `strength` for that segment)."""
    out = []
    for i, r in enumerate(lights, start=1):
        r = dict(r)
        if i in files:
            r["lightMapFile"] = files[i]
        if files:
            r["lightMap"] = round(LIGHT_RANGE * (strength or {}).get(i, 1.0), 3)
        out.append(r)
    return out
