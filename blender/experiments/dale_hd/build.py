"""The high-detail Dale experiment, end to end: mesh every piece from its
SDF, decimate each to its triangle budget, skin the result to Dale's game
rig (art/dale.blend, so every clip plays on it), unwrap, paint the albedo
and roughness per texel, bake the normals from the dense meshes, and
export a GLB.

    blender -b art/dale.blend -P blender/experiments/dale_hd/build.py -- [--tex 2048]

Writes art/experiments/dale_hd.glb, and art-out/dale_hd.blend to look at.
"""
import argparse
import sys
import time
from pathlib import Path

import bmesh
import bpy
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "blender"))

from experiments.dale_hd import paint as PAINT  # noqa: E402
from experiments.dale_hd.hands import CURL, FINGERS  # noqa: E402,F401
from experiments.dale_hd.blend import to_object  # noqa: E402
from experiments.dale_hd.pieces import PIECES  # noqa: E402

CACHE = ROOT / "art-out" / "dale_hd_cache"
ORDER = ["head", "eyes", "teeth", "hair", "body", "hand.L", "hand.R"]
SYMMETRIC = {"head", "eyes", "teeth", "hair"}
# Texel density relative to the rest (seen close in intros and wins).
DENSITY = {"head": 1.9, "eyes": 2.6, "teeth": 1.4, "hair": 1.1, "body": 1.0, "hand.L": 1.35, "hand.R": 1.35}
# Skin-weight softness (m): how far across a joint the weights blend.
TAU = {"head": 0.008, "eyes": 0.01, "teeth": 0.01, "hair": 0.01, "body": 0.016, "hand.L": 0.004, "hand.R": 0.004}


def log(msg, t0=[time.time()]):  # noqa: B006
    print(f"[dale_hd {time.time() - t0[0]:6.1f}s] {msg}", flush=True)


def tris(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def decimate(obj, budget, symmetric):
    for _ in range(3):
        n = tris(obj)
        if n <= budget * 1.01:
            break
        mod = obj.modifiers.new("dec", "DECIMATE")
        mod.ratio = budget / n
        mod.use_collapse_triangulate = True
        if symmetric:
            mod.use_symmetry = True
            mod.symmetry_axis = "X"
        with bpy.context.temp_override(object=obj, active_object=obj):
            bpy.ops.object.modifier_apply(modifier=mod.name)
    return tris(obj)


def fighter_co(obj):
    co = np.empty(len(obj.data.vertices) * 3)
    obj.data.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    return np.column_stack([co[:, 0], -co[:, 1], co[:, 2]])


def finger_joints(rig):
    """Split each finger group's bone at the knuckles of the modelled hand
    (index, the middle finger for the group, the thumb), so a fist curls at
    three joints instead of folding the whole finger at the base. Returns
    {group bone: [its new child bones]}."""
    from mathutils import Vector

    from experiments.dale_hd.rigdata import hand_frame

    def fighter_to_blender(p):
        return Vector((p[0], -p[1], p[2]))

    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    eb = rig.data.edit_bones
    made = {}
    for s in ("L", "R"):
        wr, a, w, n, L = hand_frame(s)
        for group, finger in (("index", "index"), ("fingers", "middle")):
            (t0, w0), lens, *_ = FINGERS[finger]
            joints, d = [], a
            p = wr + a * t0 + w * w0
            for j, ln in enumerate(lens[:2]):
                ang = np.radians(CURL[j])
                d = d * np.cos(ang) - n * np.sin(ang)
                p = p + d * ln
                joints.append(p)
            made[f"{group}.{s}"] = _split(eb, f"{group}.{s}", [fighter_to_blender(q) for q in joints], f"{group}_{{}}.{s}")
        # The thumb: its middle joint, where the first phalanx ends.
        d1 = a * 0.80 + w * 0.32 - n * 0.30
        mc = wr + a * 0.036 + w * 0.036 - n * 0.012
        made[f"thumb.{s}"] = _split(eb, f"thumb.{s}", [fighter_to_blender(mc + d1 / np.linalg.norm(d1) * 0.036)], f"thumb_{{}}.{s}")
    bpy.ops.object.mode_set(mode="OBJECT")
    for parent, kids in made.items():
        for k in kids:
            rig.data.bones[k]["bend"] = rig.data.bones[parent]["bend"]
            rig.pose.bones[k].rotation_mode = "QUATERNION"
    return made


def _split(eb, name, points, pattern):
    """Cut bone `name` where `points` project onto it; the pieces chain on
    as children, same roll, so they turn about the same axis."""
    b = eb[name]
    h, t = b.head.copy(), b.tail.copy()
    d = t - h
    fr = sorted(max(0.15, min(0.85, (q - h).dot(d) / d.length_squared)) for q in points)
    cuts = [h + d * f for f in fr] + [t]
    roll, parent = b.roll, b
    b.tail = cuts[0]
    kids = []
    for i in range(1, len(cuts)):
        c = eb.new(pattern.format(i + 1))
        c.head, c.tail, c.roll = cuts[i - 1], cuts[i], roll
        c.parent, c.use_connect, c.use_deform = parent, True, True
        kids.append(c.name)
        parent = c
    return kids


def spread_curls(rig, made):
    """Rewrite every clip's finger-group rotations across the new joints: a
    curl toward the palm bends all three knuckles as a real fist does (the
    thumb two); an opening (backward) turn stays at the base, halved, so
    fingers never bend back past straight-ish."""
    import math

    from bpy_extras.anim_utils import action_get_channelbag_for_slot

    for act in bpy.data.actions:
        for slot in act.slots:
            if slot.target_id_type != "OBJECT":
                continue
            bag = action_get_channelbag_for_slot(act, slot)
            if bag is None:
                continue
            f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
            for parent, kids in made.items():
                path = f'pose.bones["{parent}"].rotation_quaternion'
                fcs = [bag.fcurves.find(path, index=i) for i in range(4)]
                if not all(fcs):
                    continue
                frames = list(range(f0, f1 + 1))
                theta = []
                for f in frames:
                    w, z = fcs[0].evaluate(f), fcs[3].evaluate(f)
                    theta.append(2 * math.atan2(z, w))
                # The rig's full curl (100°) is a fist at one hinge; a real fist
                # bends about 90°, 100° and 70° at the three knuckles.
                shares = (0.6, 0.7) if parent.startswith("thumb") else (0.9, 1.0, 0.7)
                bend = rig.data.bones[parent]["bend"]  # the rig's sign for "toward the palm"
                series = {parent: [], **{k: [] for k in kids}}
                for th in theta:
                    parts = [th * x for x in shares] if th * bend >= 0 else [th * 0.5] + [0.0] * len(kids)
                    for bn, ang in zip([parent, *kids], parts):
                        series[bn].append(ang)
                for bn, angs in series.items():
                    p = f'pose.bones["{bn}"].rotation_quaternion'
                    for i in range(4):
                        fc = bag.fcurves.find(p, index=i) or bag.fcurves.new(p, index=i)
                        fc.keyframe_points.clear()
                        fc.keyframe_points.add(len(frames))
                        vals = [(math.cos(x / 2), 0.0, 0.0, math.sin(x / 2))[i] for x in angs]
                        fc.keyframe_points.foreach_set("co", [c for fr, v in zip(frames, vals) for c in (fr, v)])
                        for kp in fc.keyframe_points:
                            kp.interpolation = "LINEAR"
                        fc.update()


def skin(body, piece_of_vert, rig):
    """Vertex groups from each piece's primitives: soft weights over the
    nearest shapes' bones (bones the rig lacks fold into their group)."""
    have = {b.name for b in rig.data.bones}
    P = fighter_co(body).astype(np.float32)
    W = {}
    for i, name in enumerate(ORDER):
        sel = np.where(piece_of_vert == i)[0]
        if not len(sel):
            continue
        bones, _ = PIECES[name].model.nearest(P[sel], TAU[name])
        for b, w in bones.items():
            if b not in have:
                base, side = b.split(".")
                b = base.split("_")[0] + "." + side
            W.setdefault(b, np.zeros(len(P)))[sel] += w
    names = sorted(W)
    M = np.stack([W[n] for n in names], 1)
    # Keep the four strongest, renormalise.
    idx = np.argsort(-M, axis=1)[:, :4]
    keep = np.zeros_like(M)
    rows = np.arange(len(M))[:, None]
    keep[rows, idx] = M[rows, idx]
    keep[keep < 0.02] = 0
    keep /= keep.sum(1, keepdims=True)
    for j, n in enumerate(names):
        vg = body.vertex_groups.new(name=n)
        nz = np.nonzero(keep[:, j])[0]
        for v in nz:
            vg.add([int(v)], float(keep[v, j]), "REPLACE")
    missing = [n for n in names if n not in have]
    if missing:
        raise RuntimeError(f"weights on bones the rig lacks: {missing}")


def unwrap(body, piece_of_vert):
    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=np.radians(60), island_margin=0.0, area_weight=0.0, scale_to_bounds=False)
    bm = bmesh.from_edit_mesh(body.data)
    uv = bm.loops.layers.uv.active
    for f in bm.faces:
        s = DENSITY[ORDER[piece_of_vert[f.verts[0].index]]]
        for lp in f.loops:
            lp[uv].uv = lp[uv].uv * s
    bmesh.update_edit_mesh(body.data)
    bpy.ops.uv.select_all(action="SELECT")
    bpy.ops.uv.pack_islands(rotate=True, scale=True, margin=0.003)
    bpy.ops.object.mode_set(mode="OBJECT")


def raster(body, size):
    """Every covered texel's position, normal (fighter space, rest pose)
    and the vertex it's nearest of its triangle (for the piece)."""
    me = body.data
    me.calc_loop_triangles()
    nt = len(me.loop_triangles)
    tl = np.empty(nt * 3, np.int32)
    me.loop_triangles.foreach_get("loops", tl)
    tv = np.empty(nt * 3, np.int32)
    me.loop_triangles.foreach_get("vertices", tv)
    uvs = np.empty(len(me.loops) * 2)
    me.uv_layers.active.data.foreach_get("uv", uvs)
    uvs = uvs.reshape(-1, 2)[tl].reshape(nt, 3, 2) * size - 0.5
    co = fighter_co(body)
    no = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("normal", no)
    no = no.reshape(-1, 3) * np.array((1, -1, 1))
    tv = tv.reshape(nt, 3)
    pos = np.zeros((size, size, 3), np.float32)
    nrm = np.zeros((size, size, 3), np.float32)
    vid = np.full((size, size), -1, np.int32)
    for t in range(nt):
        a, b, c = uvs[t]
        x0, y0 = np.floor(np.minimum(np.minimum(a, b), c)).astype(int)
        x1, y1 = np.ceil(np.maximum(np.maximum(a, b), c)).astype(int)
        x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, size - 1), min(y1, size - 1)
        if x1 < x0 or y1 < y0:
            continue
        X, Y = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(d) < 1e-12:
            continue
        w0 = ((b[1] - c[1]) * (X - c[0]) + (c[0] - b[0]) * (Y - c[1])) / d
        w1 = ((c[1] - a[1]) * (X - c[0]) + (a[0] - c[0]) * (Y - c[1])) / d
        w2 = 1 - w0 - w1
        e = -0.02
        inside = (w0 >= e) & (w1 >= e) & (w2 >= e)
        if not inside.any():
            continue
        W = np.stack([w0[inside], w1[inside], w2[inside]], 1)
        W = np.clip(W, 0, None)
        W /= W.sum(1, keepdims=True)
        v = tv[t]
        ys, xs = Y[inside], X[inside]
        pos[ys, xs] = W @ co[v]
        nrm[ys, xs] = W @ no[v]
        vid[ys, xs] = v[np.argmax(W, 1)]
    n = np.linalg.norm(nrm, axis=2, keepdims=True)
    nrm /= np.maximum(n, 1e-9)
    return pos, nrm, vid


def dilate(img, filled, steps=8):
    img, filled = img.copy(), filled.copy()
    for _ in range(steps):
        acc = np.zeros_like(img)
        cnt = np.zeros(filled.shape)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            f = np.roll(filled, (dy, dx), (0, 1))
            acc += np.roll(img, (dy, dx), (0, 1)) * f[..., None]
            cnt += f
        grow = ~filled & (cnt > 0)
        img[grow] = acc[grow] / cnt[grow][:, None]
        filled = filled | grow
    return img


def image(name, size, rgb, path, colorspace="sRGB", fmt="JPEG"):
    img = bpy.data.images.new(name, size, size, alpha=False)
    img.colorspace_settings.name = colorspace
    px = np.ones((size, size, 4), np.float32)
    px[..., :3] = rgb
    img.pixels.foreach_set(px.ravel())
    img.filepath_raw = str(path)
    img.file_format = fmt
    bpy.context.scene.render.image_settings.quality = 92
    img.save()
    return img


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--tex", type=int, default=2048)
    ap.add_argument("--out", default=str(ROOT / "art" / "experiments" / "dale_hd.glb"))
    args = ap.parse_args(argv)
    size = args.tex
    texdir = ROOT / "art-out" / "dale_hd_tex"
    texdir.mkdir(parents=True, exist_ok=True)

    rig = bpy.data.objects["dale"]
    for o in list(bpy.data.objects):
        if o is not rig:
            bpy.data.objects.remove(o)
    made = finger_joints(rig)
    spread_curls(rig, made)
    rig.data.pose_position = "REST"
    log(f"finger joints: {sum(len(k) for k in made.values())} bones added, clips rewritten")

    # ---- Pieces: dense (for the bake) and decimated (the model).
    his, los = [], []
    for i, name in enumerate(ORDER):
        piece = PIECES[name]
        v, faces = piece.mesh(cache=CACHE)
        hi = to_object(f"{name}_hi", v, faces)
        lo = hi.copy()
        lo.data = hi.data.copy()
        lo.name = f"{name}_lo"
        bpy.context.scene.collection.objects.link(lo)
        n = decimate(lo, piece.budget, name in SYMMETRIC)
        attr = lo.data.attributes.new("piece", "INT", "POINT")
        attr.data.foreach_set("value", np.full(len(lo.data.vertices), i, np.int32))
        his.append(hi)
        los.append(lo)
        log(f"{name}: {len(faces)} dense faces → {n} triangles (budget {piece.budget})")

    bpy.ops.object.select_all(action="DESELECT")
    for lo in los:
        lo.select_set(True)
    bpy.context.view_layer.objects.active = los[0]
    bpy.ops.object.join()
    body = bpy.context.view_layer.objects.active
    body.name = body.data.name = "dale_hd_body"
    pv = np.empty(len(body.data.vertices), np.int32)
    body.data.attributes["piece"].data.foreach_get("value", pv)
    log(f"joined: {tris(body)} triangles, {len(body.data.vertices)} vertices")

    skin(body, pv, rig)
    log("skinned")
    unwrap(body, pv)
    log("unwrapped")

    # ---- Paint per texel.
    pos, nrm, vid = raster(body, size)
    filled = vid >= 0
    ys, xs = np.nonzero(filled)
    P, N = pos[ys, xs].astype(np.float32), nrm[ys, xs]
    piece = pv[vid[ys, xs]]
    lab = np.empty(len(P), dtype=object)
    for i, name in enumerate(ORDER):
        sel = piece == i
        lab[sel] = PIECES[name].model.labels(P[sel])
    log(f"rasterised {len(P)} texels, labelled")
    col, rough, hgt = PAINT.paint(P, N, lab)
    albedo = np.zeros((size, size, 3), np.float32)
    albedo[ys, xs] = col
    rmap = np.zeros((size, size, 3), np.float32)
    rmap[ys, xs, 1] = rough
    rmap[ys, xs, 0] = 1.0
    H = np.zeros((size, size), np.float32)
    H[ys, xs] = hgt
    log("painted")

    # ---- Material and the normal bake from the dense pieces.
    mat = bpy.data.materials.new("dale_hd")
    body.data.materials.clear()
    body.data.materials.append(mat)
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    tex_n = nt.nodes.new("ShaderNodeTexImage")
    nimg = bpy.data.images.new("dale_hd_normal", size, size, alpha=False, float_buffer=True)
    nimg.colorspace_settings.name = "Non-Color"
    tex_n.image = nimg
    nt.nodes.active = tex_n
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = 4
    sc.render.bake.use_selected_to_active = True
    sc.render.bake.cage_extrusion = 0.004
    sc.render.bake.max_ray_distance = 0.012
    sc.render.bake.margin = 8
    bpy.ops.object.select_all(action="DESELECT")
    for hi in his:
        hi.select_set(True)
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.bake(type="NORMAL", normal_space="TANGENT")
    log("normals baked")
    nb = np.array(nimg.pixels[:], np.float32).reshape(size, size, 4)[..., :3] * 2 - 1
    # Fold in the painted micro detail: the height's slope per metre, along u and v.
    def slope(axis):
        a, b = np.roll(H, -1, axis), np.roll(H, 1, axis)
        pa, pb = np.roll(pos, -1, axis), np.roll(pos, 1, axis)
        ok = np.roll(filled, -1, axis) & np.roll(filled, 1, axis) & filled
        dist = np.linalg.norm(pa - pb, axis=2)
        g = np.where(ok & (dist > 1e-6), (a - b) / np.maximum(dist, 1e-6), 0)
        return np.clip(g, -0.6, 0.6)
    gu, gv = slope(1), slope(0)
    nb[..., 0] -= gu
    nb[..., 1] -= gv
    nb /= np.linalg.norm(nb, axis=2, keepdims=True)
    for o in his:
        bpy.data.objects.remove(o)

    # ---- Images, the final material.
    albedo = dilate(albedo, filled)
    rmap = dilate(rmap, filled)
    a_img = image("dale_hd_albedo", size, albedo, texdir / "dale_hd_albedo.jpg")
    r_img = image("dale_hd_orm", size, rmap, texdir / "dale_hd_orm.jpg", "Non-Color")
    n_img = image("dale_hd_normal_map", size, nb * 0.5 + 0.5, texdir / "dale_hd_normal.jpg", "Non-Color")
    nt.nodes.remove(tex_n)
    ta = nt.nodes.new("ShaderNodeTexImage")
    ta.image = a_img
    nt.links.new(ta.outputs["Color"], bsdf.inputs["Base Color"])
    tr = nt.nodes.new("ShaderNodeTexImage")
    tr.image = r_img
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(tr.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    tn = nt.nodes.new("ShaderNodeTexImage")
    tn.image = n_img
    nm = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(tn.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Metallic"].default_value = 0.0

    # ---- Skin it to the rig and export.
    body.parent = rig
    mod = body.modifiers.new("rig", "ARMATURE")
    mod.object = rig
    body.data.attributes.remove(body.data.attributes["piece"])
    rig.data.pose_position = "POSE"
    (ROOT / "art-out").mkdir(exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "art-out" / "dale_hd.blend"))
    from lib.common import export_glb
    export_glb(args.out, [rig, body])
    log(f"exported {args.out}: {tris(body)} triangles")


main()
