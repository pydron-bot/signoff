"""Shrinks an exported fighter GLB without changing what it shows.

- Drops animation channels that never leave the rest pose in any clip (bone
  scales are always 1; only root and hips ever translate). Nothing moves
  those bones, so the mixer never needs them to reset a pose.
- Stores rotations as normalised 16-bit integers (glTF allows it for
  rotation outputs; three.js reads them): half the size, error ~3e-5.
- A channel that holds one value through a clip (fingers that stay in a
  fist, a jaw that stays shut) keeps two keys, its first and last time, so
  the clip's length is unchanged.
- Packs the animation data into one bufferView and shares identical
  keyframe-time tracks and identical value tracks (the same held fist in
  every clip is stored once); everything else (meshes, morph targets, images) is
  copied as it was.
- Gives every clip a channel for each morphed mesh's weights, 0 where the
  clip doesn't use them, so an expression never carries over.

Plain Python (struct, json): runs inside Blender after the export.
"""
import json
import struct

FLOAT, SHORT = 5126, 5122
COMPONENTS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}
SIZE = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
REST = {"translation": (0, 0, 0), "rotation": (0, 0, 0, 1), "scale": (1, 1, 1)}


def _read(path):
    b = open(path, "rb").read()
    jlen = struct.unpack_from("<I", b, 12)[0]
    gltf = json.loads(b[20:20 + jlen])
    blen = struct.unpack_from("<I", b, 20 + jlen)[0]
    return gltf, b[28 + jlen:28 + jlen + blen]


def _bytes(gltf, binary, i):
    """An accessor's tightly packed bytes."""
    a = gltf["accessors"][i]
    bv = gltf["bufferViews"][a["bufferView"]]
    n = COMPONENTS[a["type"]] * SIZE[a["componentType"]]
    start = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    stride = bv.get("byteStride", n)
    if stride == n:
        return binary[start:start + n * a["count"]]
    return b"".join(binary[start + k * stride:start + k * stride + n] for k in range(a["count"]))


def _floats(gltf, binary, i):
    a = gltf["accessors"][i]
    assert a["componentType"] == FLOAT
    raw = _bytes(gltf, binary, i)
    vals = struct.unpack(f"<{len(raw) // 4}f", raw)
    n = COMPONENTS[a["type"]]
    return [vals[k:k + n] for k in range(0, len(vals), n)]


def compact(path, morphs=None):
    """morphs: {mesh node name: {clip: (times, weights per frame)}}, written
    as each clip's weights channel in place of the exporter's (see
    common.shape_key_tracks)."""
    gltf, binary = _read(path)
    nodes = gltf["nodes"]
    anims = gltf.get("animations", [])
    morphs = morphs or {}
    morph_node = {i: morphs[n["name"]] for i, n in enumerate(nodes) if n.get("name") in morphs}

    def rest_of(t):
        if t["path"] == "weights":
            return None  # morph weights rest at 0
        return nodes[t["node"]].get(t["path"], REST[t["path"]])

    # Which (node, path) channels ever leave the rest pose?
    moving = set()
    for an in anims:
        for ch in an["channels"]:
            t = ch["target"]
            rest = rest_of(t)
            out = _floats(gltf, binary, an["samplers"][ch["sampler"]]["output"])
            if rest is None:
                if any(abs(v) > 1e-4 for row in out for v in row):
                    moving.add((t["node"], "weights"))
            elif any(abs(v - r) > 1e-4 for row in out for v, r in zip(row, rest)):
                moving.add((t["node"], t["path"]))

    chunks, offset = [], 0

    def add(data, align=4):
        nonlocal offset
        pad = (-offset) % align
        if pad:
            chunks.append(b"\0" * pad)
            offset += pad
        chunks.append(data)
        start = offset
        offset += len(data)
        return start

    # Everything that isn't animation (meshes, morph targets, skins, images)
    # is copied as it was, bufferView by bufferView.
    anim_acc = {s[k] for an in anims for s in an["samplers"] for k in ("input", "output")}
    old_views = gltf["bufferViews"]
    new_views, view_map = [], {}

    def keep_view(i):
        if i not in view_map:
            v = dict(old_views[i])
            start = v.get("byteOffset", 0)
            data = binary[start:start + v["byteLength"]]
            v["byteOffset"] = add(data)
            v["buffer"] = 0
            new_views.append(v)
            view_map[i] = len(new_views) - 1
        return view_map[i]

    new_acc, acc_map = [], {}
    for i, a in enumerate(gltf["accessors"]):
        if i in anim_acc:
            continue
        a = dict(a)
        if "bufferView" in a:
            a["bufferView"] = keep_view(a["bufferView"])
        if "sparse" in a:
            sp = json.loads(json.dumps(a["sparse"]))
            sp["indices"]["bufferView"] = keep_view(sp["indices"]["bufferView"])
            sp["values"]["bufferView"] = keep_view(sp["values"]["bufferView"])
            a["sparse"] = sp
        new_acc.append(a)
        acc_map[i] = len(new_acc) - 1
    for m in gltf.get("meshes", []):
        for prim in m["primitives"]:
            prim["attributes"] = {k: acc_map[v] for k, v in prim["attributes"].items()}
            if "indices" in prim:
                prim["indices"] = acc_map[prim["indices"]]
            if "targets" in prim:
                prim["targets"] = [{k: acc_map[v] for k, v in t.items()} for t in prim["targets"]]
    for skin in gltf.get("skins", []):
        if "inverseBindMatrices" in skin:
            skin["inverseBindMatrices"] = acc_map[skin["inverseBindMatrices"]]
    for im in gltf.get("images", []):
        if "bufferView" in im:
            im["bufferView"] = keep_view(im["bufferView"])

    # Animation data: one bufferView; inputs shared when identical.
    anim_chunks = []
    anim_len = 0

    def anim_add(data):
        nonlocal anim_len
        pad = (-anim_len) % 4
        if pad:
            anim_chunks.append(b"\0" * pad)
            anim_len += pad
        anim_chunks.append(data)
        start = anim_len
        anim_len += len(data)
        return start

    anim_view = len(new_views)
    shared_inputs, shared_outputs = {}, {}

    def input_acc(raw, template):
        if raw not in shared_inputs:
            a = dict(template)
            a.update(bufferView=anim_view, byteOffset=anim_add(raw))
            new_acc.append(a)
            shared_inputs[raw] = len(new_acc) - 1
        return shared_inputs[raw]

    morph_nodes = sorted({n for n, p in moving if p == "weights"} | set(morph_node))
    for an in anims:
        channels, samplers = [], []
        has_weights = set()
        for ch in an["channels"]:
            t = ch["target"]
            if (t["node"], t["path"]) not in moving or (t["path"] == "weights" and t["node"] in morph_node):
                continue
            s = an["samplers"][ch["sampler"]]
            out = gltf["accessors"][s["output"]]
            rows = _floats(gltf, binary, s["output"]) if t["path"] in ("rotation", "translation") else None
            if rows and len(rows) > 2 and s.get("interpolation", "LINEAR") != "CUBICSPLINE" and all(
                    abs(v - r) < 1e-5 for row in rows for v, r in zip(row, rows[0])):
                times = _floats(gltf, binary, s["input"])
                ends = (times[0][0], times[-1][0])
                inp = input_acc(struct.pack("<2f", *ends), {"componentType": FLOAT, "count": 2, "type": "SCALAR",
                                                            "min": [ends[0]], "max": [ends[1]]})
                rows = [rows[0], rows[0]]
            else:
                inp = input_acc(_bytes(gltf, binary, s["input"]), gltf["accessors"][s["input"]])
            if t["path"] == "rotation":
                vals = [max(-32767, min(32767, round(v * 32767))) for row in rows for v in row]
                data = struct.pack(f"<{len(vals)}h", *vals)
                a = {"componentType": SHORT, "normalized": True, "count": len(rows), "type": "VEC4"}
            elif rows is not None:
                data = struct.pack(f"<{3 * len(rows)}f", *(v for row in rows for v in row))
                a = {"componentType": FLOAT, "count": len(rows), "type": "VEC3", "min": [min(r[i] for r in rows) for i in range(3)],
                     "max": [max(r[i] for r in rows) for i in range(3)]}
            else:
                data = _bytes(gltf, binary, s["output"])
                a = {k: out[k] for k in ("componentType", "count", "type")}
            if t["path"] == "weights":
                has_weights.add(t["node"])
            key = (data, json.dumps(a, sort_keys=True))
            if key not in shared_outputs:
                a.update(bufferView=anim_view, byteOffset=anim_add(data))
                new_acc.append(a)
                shared_outputs[key] = len(new_acc) - 1
            sampler = {"input": inp, "output": shared_outputs[key]}
            if s.get("interpolation", "LINEAR") != "LINEAR":
                sampler["interpolation"] = s["interpolation"]  # LINEAR is the default: left out, it adds up
            samplers.append(sampler)
            channels.append({"sampler": len(samplers) - 1, "target": t})
        for node, tracks in morph_node.items():
            if an["name"] not in tracks:
                continue
            times, weights = tracks[an["name"]]
            inp = input_acc(struct.pack(f"<{len(times)}f", *times),
                            {"componentType": FLOAT, "count": len(times), "type": "SCALAR", "min": [min(times)], "max": [max(times)]})
            flat = [w for row in weights for w in row]
            new_acc.append({"componentType": FLOAT, "count": len(flat), "type": "SCALAR", "bufferView": anim_view,
                            "byteOffset": anim_add(struct.pack(f"<{len(flat)}f", *flat))})
            samplers.append({"input": inp, "output": len(new_acc) - 1})
            channels.append({"sampler": len(samplers) - 1, "target": {"node": node, "path": "weights"}})
            has_weights.add(node)
        # A clip that never changes a morph weight still sets it (to 0), so an
        # expression from the last clip doesn't stick (the exporter drops them).
        for node in morph_nodes:
            if node in has_weights:
                continue
            ntargets = len(gltf["meshes"][nodes[node]["mesh"]]["primitives"][0]["targets"])
            inp = input_acc(struct.pack("<f", 0.0), {"componentType": FLOAT, "count": 1, "type": "SCALAR", "min": [0.0], "max": [0.0]})
            new_acc.append({"componentType": FLOAT, "count": ntargets, "type": "SCALAR", "bufferView": anim_view,
                            "byteOffset": anim_add(struct.pack(f"<{ntargets}f", *([0.0] * ntargets)))})
            samplers.append({"input": inp, "output": len(new_acc) - 1, "interpolation": "STEP"})
            channels.append({"sampler": len(samplers) - 1, "target": {"node": node, "path": "weights"}})
        an["channels"], an["samplers"] = channels, samplers
    if anim_len:
        data = b"".join(anim_chunks)
        new_views.append({"buffer": 0, "byteOffset": add(data), "byteLength": len(data)})

    body = b"".join(chunks)
    body += b"\0" * ((-len(body)) % 4)
    gltf["accessors"], gltf["bufferViews"] = new_acc, new_views
    gltf["buffers"] = [{"byteLength": len(body)}]
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * ((-len(js)) % 4)
    total = 12 + 8 + len(js) + 8 + len(body)
    with open(path, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, total))
        f.write(struct.pack("<I4s", len(js), b"JSON") + js)
        f.write(struct.pack("<I4s", len(body), b"BIN\0") + body)
    return total
