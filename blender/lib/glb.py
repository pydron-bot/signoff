"""Shrinks an exported fighter GLB without changing what it shows.

- Drops animation channels that never leave the rest pose in any clip (bone
  scales are always 1; only root and hips ever translate). Nothing moves
  those bones, so the mixer never needs them to reset a pose.
- Stores rotations as normalised 16-bit integers (glTF allows it for
  rotation outputs; three.js reads them): half the size, error ~3e-5.
- Packs the animation data into one bufferView and shares identical
  keyframe-time tracks.

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


def compact(path):
    gltf, binary = _read(path)
    nodes = gltf["nodes"]

    # Which (node, path) channels ever leave the rest pose?
    moving = set()
    for an in gltf.get("animations", []):
        for ch in an["channels"]:
            t = ch["target"]
            rest = nodes[t["node"]].get(t["path"], REST[t["path"]])
            out = _floats(gltf, binary, an["samplers"][ch["sampler"]]["output"])
            if any(abs(v - r) > 1e-4 for row in out for v, r in zip(row, rest)):
                moving.add((t["node"], t["path"]))

    new_acc, new_views, chunks = [], [], []
    offset = 0

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

    remap = {}

    def keep_plain(i):
        """A mesh or skin accessor: copied into its own bufferView as it was."""
        if i in remap:
            return remap[i]
        a = dict(gltf["accessors"][i])
        old_view = gltf["bufferViews"][a["bufferView"]]
        data = _bytes(gltf, binary, i)
        view = {"buffer": 0, "byteOffset": add(data), "byteLength": len(data)}
        if "target" in old_view:
            view["target"] = old_view["target"]
        new_views.append(view)
        a["bufferView"] = len(new_views) - 1
        a.pop("byteOffset", None)
        new_acc.append(a)
        remap[i] = len(new_acc) - 1
        return remap[i]

    for m in gltf.get("meshes", []):
        for prim in m["primitives"]:
            prim["attributes"] = {k: keep_plain(v) for k, v in prim["attributes"].items()}
            if "indices" in prim:
                prim["indices"] = keep_plain(prim["indices"])
    for skin in gltf.get("skins", []):
        if "inverseBindMatrices" in skin:
            skin["inverseBindMatrices"] = keep_plain(skin["inverseBindMatrices"])

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
    shared_inputs = {}
    for an in gltf.get("animations", []):
        channels, samplers = [], []
        for ch in an["channels"]:
            t = ch["target"]
            if (t["node"], t["path"]) not in moving:
                continue
            s = an["samplers"][ch["sampler"]]
            raw_in = _bytes(gltf, binary, s["input"])
            if raw_in not in shared_inputs:
                a = dict(gltf["accessors"][s["input"]])
                a.update(bufferView=anim_view, byteOffset=anim_add(raw_in))
                new_acc.append(a)
                shared_inputs[raw_in] = len(new_acc) - 1
            out = gltf["accessors"][s["output"]]
            if t["path"] == "rotation":
                vals = [max(-32767, min(32767, round(v * 32767))) for row in _floats(gltf, binary, s["output"]) for v in row]
                data = struct.pack(f"<{len(vals)}h", *vals)
                a = {"componentType": SHORT, "normalized": True, "count": out["count"], "type": "VEC4"}
            else:
                data = _bytes(gltf, binary, s["output"])
                a = {k: out[k] for k in ("componentType", "count", "type")}
            a.update(bufferView=anim_view, byteOffset=anim_add(data))
            new_acc.append(a)
            samplers.append({"input": shared_inputs[raw_in], "output": len(new_acc) - 1, "interpolation": s.get("interpolation", "LINEAR")})
            channels.append({"sampler": len(samplers) - 1, "target": t})
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
