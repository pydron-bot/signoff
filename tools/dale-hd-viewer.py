"""Fill tools/dale-hd-viewer.template.html with the HD and game GLBs (as
base64) and their triangle counts: a single page to share the experiment.

    python3 tools/dale-hd-viewer.py OUT.html
"""
import base64
import json
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def triangles(path, skip=("fx_",)):
    data = path.read_bytes()
    n = struct.unpack_from("<I", data, 12)[0]
    gltf = json.loads(data[20:20 + n])
    total = 0
    for node in gltf["nodes"]:
        if "mesh" not in node or node.get("name", "").startswith(skip):
            continue
        for prim in gltf["meshes"][node["mesh"]]["primitives"]:
            total += gltf["accessors"][prim["indices"]]["count"] // 3
    return total


def main():
    hd = ROOT / "art" / "experiments" / "dale_hd.glb"
    old = ROOT / "public" / "assets" / "fighters" / "dale.glb"
    page = (ROOT / "tools" / "dale-hd-viewer.template.html").read_text()
    page = page.replace("__TRIS__", f"{triangles(hd):,}").replace("__OLD_TRIS__", f"{triangles(old):,}")
    page = page.replace("__HD_GLB__", base64.b64encode(hd.read_bytes()).decode())
    page = page.replace("__OLD_GLB__", base64.b64encode(old.read_bytes()).decode())
    Path(sys.argv[1]).write_text(page)
    print(f"{sys.argv[1]}: {len(page) / 1e6:.1f} MB")


main()
