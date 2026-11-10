"""UV atlases and painted textures, made headless and deterministic.

Each fighter has two atlases, one per material (`body` up to 1024², `props`
up to 512²). Every mesh is unwrapped by material (Blender's smart project,
islands scaled to an even texel density, the face and chest at about twice
that), then the atlas is *painted in 3D*: every texel is rasterised back to
the point on the surface it shows (rest pose, fighter space), and its colour
is the part's flat colour run through the part's paint function. Patterns
and faces are drawn by position, so they don't care how the islands were
packed, and a rebuild gives the same pixels.

A paint function takes a Texels (positions, normals and colours of the
texels of one part, numpy arrays) and returns the new colours (0–255 sRGB).
"""
import math
from pathlib import Path

import bmesh
import bpy
import numpy as np

# 1987 video: a touch desaturated and warm.
GRADE_DESAT = 0.1
GRADE_WARM = np.array([1.0, 0.985, 0.95])
GLOW_MAX = 1024


class Texels:
    """The texels of one part: p (N, 3) positions in fighter space (side,
    fwd, up), n (N, 3) normals, c (N, 3) its flat colours (0–255), and rng,
    a generator seeded per part so rebuilds match."""

    def __init__(self, p, n, c, rng):
        self.p, self.n, self.c, self.rng = p, n, c, rng

    @property
    def side(self):
        return self.p[:, 0]

    @property
    def fwd(self):
        return self.p[:, 1]

    @property
    def up(self):
        return self.p[:, 2]


def unwrap(objects, dense_parts, meta):
    """A `UV` layer on every object; each material's faces unwrapped and
    packed into the 0–1 square on their own (each material has its own
    atlas). Parts named in `dense_parts` get twice the texel density."""
    for o in objects:
        if not o.data.uv_layers:
            o.data.uv_layers.new(name="UV")
    dense_ids = {i for i, m in enumerate(meta) if m["name"] in dense_parts}
    for mi in (0, 1):
        users = [o for o in objects if any(p.material_index == mi for p in o.data.polygons)]
        if not users:
            continue
        _edit(users, mi)
        bpy.ops.uv.smart_project(angle_limit=math.radians(62), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
        bpy.ops.uv.average_islands_scale()
        bpy.ops.object.mode_set(mode="OBJECT")
        for o in users:
            _scale_parts(o, mi, dense_ids, 2.0)
        _edit(users, mi)
        bpy.ops.uv.pack_islands(rotate=True, shape_method="AABB", margin_method="FRACTION", margin=0.006 if mi == 0 else 0.01)
        bpy.ops.object.mode_set(mode="OBJECT")


def _edit(objects, mi):
    """Multi-object edit mode with only material mi's faces selected."""
    bpy.ops.object.mode_set(mode="OBJECT") if bpy.context.object and bpy.context.object.mode != "OBJECT" else None
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_mode(type="FACE")
    for o in objects:
        bm = bmesh.from_edit_mesh(o.data)
        for e in bm.edges:
            e.select = False
        for v in bm.verts:
            v.select = False
        for f in bm.faces:
            f.select = f.material_index == mi
        bm.select_flush(True)
        bmesh.update_edit_mesh(o.data)


def _scale_parts(obj, mi, ids, s):
    """Scale the UVs of the given parts about each part's centre."""
    me = obj.data
    part = _face_parts(me)
    uv = np.empty(len(me.loops) * 2)
    me.uv_layers["UV"].data.foreach_get("uv", uv)
    uv = uv.reshape(-1, 2)
    by_part = {}
    for p in me.polygons:
        if p.material_index == mi and part[p.index] in ids:
            by_part.setdefault(part[p.index], []).extend(p.loop_indices)
    for loops in by_part.values():
        loops = np.array(loops)
        c = uv[loops].mean(axis=0)
        uv[loops] = c + (uv[loops] - c) * s
    me.uv_layers["UV"].data.foreach_set("uv", uv.ravel())


def _face_parts(me):
    a = np.empty(len(me.polygons), dtype=np.int32)
    me.attributes["part"].data.foreach_get("value", a)
    return a


def paint(objects, meta, mi, size, path, seed=1987, glow=None, glow_max=None):
    """Rasterise material mi's faces of every object into a size² atlas,
    paint it, and save it as PNG at `path`. Returns the Blender image.

    glow: {part name regex: strength, or f(Texels) → strengths, the Texels'
    colours being the painted ones} for what
    gives off light (step 23 C). With it, returns (image, emission image,
    strength): the emission atlas (`<path>_glow.png`, at most glow_max², GLOW_MAX by default) is each glowing texel's
    painted colour scaled by its strength over the material's strongest, and
    the material's emission strength is that strongest; None if nothing in
    this material glows."""
    img = np.zeros((size, size, 3), dtype=np.float32)
    owner = np.full((size, size), -1, dtype=np.int32)
    pos = np.zeros((size, size, 3), dtype=np.float32)
    nrm = np.zeros((size, size, 3), dtype=np.float32)
    for o in objects:
        _raster(o, mi, size, img, owner, pos, nrm)
    for pid in np.unique(owner):
        if pid < 0:
            continue
        m = meta[pid]
        fn = m.get("paint")
        if fn is None:
            continue
        sel = owner == pid
        t = Texels(pos[sel].astype(np.float64), nrm[sel].astype(np.float64), img[sel].astype(np.float64),
                   np.random.default_rng([seed, pid]))
        img[sel] = np.clip(fn(t), 0, 255)
    # The grade, then fill the gutters around islands so mipmaps don't bleed.
    lum = img @ np.array([0.299, 0.587, 0.114])
    img = (img + (lum[..., None] - img) * GRADE_DESAT) * GRADE_WARM
    emit = _emission(img, owner, pos, nrm, meta, glow, seed) if glow else None
    img = _dilate(img, owner >= 0, 6)
    out = _save(np.clip(img, 0, 255), path)
    if glow is None:
        return out
    if emit is None:
        return out, None, 0.0
    e, strongest = emit
    e = _dilate(e, owner >= 0, 6)
    # At most 1024² (on the same UVs): the bloom softens it anyway, and a
    # stage's 2048² of flames is half a megabyte.
    while e.shape[0] > (glow_max or GLOW_MAX):
        e = (e[0::2, 0::2] + e[1::2, 0::2] + e[0::2, 1::2] + e[1::2, 1::2]) / 4
    return out, _save(np.clip(e, 0, 255), Path(path).with_name(Path(path).stem + "_glow.png")), strongest


def _emission(img, owner, pos, nrm, meta, glow, seed):
    import re

    strength = np.zeros(owner.shape, dtype=np.float32)
    rules = [(re.compile(k), v) for k, v in glow.items()]
    for pid in np.unique(owner):
        if pid < 0:
            continue
        rule = next((v for k, v in rules if k.fullmatch(meta[pid]["name"])), None)
        if rule is None:
            continue
        sel = owner == pid
        if callable(rule):
            t = Texels(pos[sel].astype(np.float64), nrm[sel].astype(np.float64), img[sel].astype(np.float64),
                       np.random.default_rng([seed, pid]))
            strength[sel] = rule(t)
        else:
            strength[sel] = rule
    strongest = float(strength.max())
    if strongest <= 0:
        return None
    lin = np.where(img <= 10.31, img / 255 / 12.92, ((img / 255 + 0.055) / 1.055) ** 2.4)
    lin = lin * (strength / strongest)[..., None]
    return _linear_to_srgb(lin), strongest


def bright(s, lo=150, hi=200):
    """A glow rule: strength s where the painted colour is bright (letters,
    tubes, bulbs), nothing on the dark or saturated ground around them."""
    def rule(t):
        lum = t.c @ np.array([0.299, 0.587, 0.114])
        return s * np.clip((lum - lo) / (hi - lo), 0, 1)
    return rule


def use_glow(material, image, strength):
    """The emission atlas on the material's emission colour, at `strength`
    (glTF: emissiveTexture, KHR_materials_emissive_strength)."""
    tree = material.node_tree
    bsdf = tree.nodes["Principled BSDF"]
    tex = tree.nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.interpolation = "Linear"
    tree.links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
    bsdf.inputs["Emission Strength"].default_value = strength


def _raster(obj, mi, size, img, owner, pos, nrm, layer="UV"):
    me = obj.data
    me.calc_loop_triangles()
    n = len(me.loop_triangles)
    if n == 0:
        return
    tri_loops = np.empty(n * 3, dtype=np.int32)
    me.loop_triangles.foreach_get("loops", tri_loops)
    tri_verts = np.empty(n * 3, dtype=np.int32)
    me.loop_triangles.foreach_get("vertices", tri_verts)
    tri_poly = np.empty(n, dtype=np.int32)
    me.loop_triangles.foreach_get("polygon_index", tri_poly)
    mat = np.empty(len(me.polygons), dtype=np.int32)
    me.polygons.foreach_get("material_index", mat)
    pnorm = np.empty(len(me.polygons) * 3)
    me.polygons.foreach_get("normal", pnorm)
    pnorm = pnorm.reshape(-1, 3)
    uv = np.empty(len(me.loops) * 2)
    me.uv_layers[layer].data.foreach_get("uv", uv)
    uv = uv.reshape(-1, 2)
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    w = np.array(obj.matrix_world)
    co = co @ w[:3, :3].T + w[:3, 3]
    col = np.empty(len(me.loops) * 4)
    me.color_attributes["Col"].data.foreach_get("color", col)
    col = _linear_to_srgb(col.reshape(-1, 4)[:, :3])
    part = _face_parts(me)

    tri_loops = tri_loops.reshape(-1, 3)
    tri_verts = tri_verts.reshape(-1, 3)
    for t in np.nonzero(mat[tri_poly] == mi)[0]:
        lp = tri_loops[t]
        a, b, c = uv[lp] * size - 0.5
        x0, y0 = np.floor(np.minimum(np.minimum(a, b), c)).astype(int)
        x1, y1 = np.ceil(np.maximum(np.maximum(a, b), c)).astype(int)
        x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, size - 1), min(y1, size - 1)
        if x1 < x0 or y1 < y0:
            continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(d) < 1e-12:
            continue
        l0 = ((b[1] - c[1]) * (xs - c[0]) + (c[0] - b[0]) * (ys - c[1])) / d
        l1 = ((c[1] - a[1]) * (xs - c[0]) + (a[0] - c[0]) * (ys - c[1])) / d
        l2 = 1 - l0 - l1
        eps = -0.02
        inside = (l0 >= eps) & (l1 >= eps) & (l2 >= eps)
        if not inside.any():
            continue
        yy, xx = ys[inside], xs[inside]
        bary = np.stack([l0[inside], l1[inside], l2[inside]], axis=1)
        p = bary @ co[tri_verts[t]]
        # Image rows run bottom-up in UV space.
        rows = yy
        img[rows, xx] = bary @ col[lp]
        owner[rows, xx] = part[tri_poly[t]]
        pos[rows, xx] = np.stack([p[:, 0], -p[:, 1], p[:, 2]], axis=1)
        pn = pnorm[tri_poly[t]] @ w[:3, :3].T
        nrm[rows, xx] = (pn[0], -pn[1], pn[2])


def _linear_to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055) * 255


def _dilate(img, filled, steps):
    img, filled = img.copy(), filled.copy()
    for _ in range(steps):
        acc = np.zeros_like(img)
        cnt = np.zeros(filled.shape)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            f = np.roll(np.roll(filled, dy, 0), dx, 1)
            acc += np.roll(np.roll(img, dy, 0), dx, 1) * f[..., None]
            cnt += f
        grow = (~filled) & (cnt > 0)
        img[grow] = acc[grow] / cnt[grow][:, None]
        filled |= grow
    return img


def _save(img, path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    size = img.shape[0]
    name = path.stem
    if name in bpy.data.images:
        bpy.data.images.remove(bpy.data.images[name])
    im = bpy.data.images.new(name, size, size, alpha=False)
    px = np.ones((size, size, 4), dtype=np.float32)
    px[..., :3] = img / 255.0
    im.pixels.foreach_set(px.ravel())
    im.filepath_raw = str(path)
    im.file_format = "PNG"
    im.save()
    im.colorspace_settings.name = "sRGB"
    return im


def use_atlas(material, image):
    """Point the material's base colour at the atlas (no vertex colours)."""
    tree = material.node_tree
    bsdf = tree.nodes["Principled BSDF"]
    for n in [n for n in tree.nodes if n.type == "VERTEX_COLOR"]:
        tree.nodes.remove(n)
    tex = tree.nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.interpolation = "Linear"
    tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
