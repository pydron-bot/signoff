"""Quick look while sculpting: mesh some pieces at preview resolution and
render them in Workbench from a few angles.

    blender -b --factory-startup -P blender/experiments/dale_hd/preview.py -- head eyes teeth --h 0.0015 --view face --out /tmp/x
"""
import argparse
import sys
import time
from pathlib import Path

import bpy
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from experiments.dale_hd import pieces  # noqa: E402
from experiments.dale_hd.blend import to_object  # noqa: E402

VIEWS = {
    # name: (target, distance, [(azimuth°, elevation°), ...], lens)
    "face": ((0, 0.05, 1.70), 0.75, [(0, 0), (35, 5), (90, 0)], 85),
    "body": ((0, 0, 0.93), 2.9, [(0, 0), (35, 5), (90, 0), (180, 0)], 50),
    "hands": ((0.5, 0.02, 0.9), 0.55, [(0, 0), (90, 0), (150, 10)], 85),
    "torso": ((0, 0, 1.45), 1.3, [(0, 0), (35, 5), (180, 0)], 50),
}


def main():
    argv = sys.argv[sys.argv.index("--") + 1:]
    a = argparse.ArgumentParser()
    a.add_argument("names", nargs="+")
    a.add_argument("--h", type=float, default=None)
    a.add_argument("--view", default="face")
    a.add_argument("--out", required=True)
    a.add_argument("--res", type=int, default=640)
    a.add_argument("--cache", default=str(Path(__file__).resolve().parents[3] / "art-out" / "dale_hd_cache"))
    args = a.parse_args(argv)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for name in args.names:
        t = time.time()
        piece = pieces.PIECES[name]
        verts, faces = piece.mesh(args.h, args.cache)
        to_object(name, verts, faces, piece.model)
        print(f"[{name}] {len(faces)} faces in {time.time() - t:.1f}s")
    for view in args.view.split(","):
        render(view, Path(args.out), args.res)


def render(view, out, res):
    import math

    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "STUDIO"
    sc.display.shading.color_type = "VERTEX"
    sc.display.shading.show_cavity = True
    sc.display.shading.cavity_type = "BOTH"
    sc.render.resolution_x = res
    sc.render.resolution_y = res if view != "body" else int(res * 1.4)
    target, dist, angles, lens = VIEWS[view]
    cam = bpy.data.objects.get("cam") or bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    cam.data.lens = lens
    if cam.name not in sc.collection.objects:
        sc.collection.objects.link(cam)
    sc.camera = cam
    out.mkdir(parents=True, exist_ok=True)
    from mathutils import Vector
    tg = Vector((target[0], -target[1], target[2]))
    for i, (az, el) in enumerate(angles):
        a, e = math.radians(az), math.radians(el)
        # Fighter forward is Blender −Y; azimuth turns toward the character's left.
        d = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
        cam.location = tg + d * dist
        cam.rotation_euler = (tg - cam.location).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = str(out / f"{view}_{i}.png")
        bpy.ops.render.render(write_still=True)
    sheet([out / f"{view}_{i}.png" for i in range(len(angles))], out / f"{view}.png")


def sheet(paths, dest):
    """Side by side, one image."""
    imgs = [bpy.data.images.load(str(p)) for p in paths]
    w, h = imgs[0].size
    px = np.zeros((h, w * len(imgs), 4), np.float32)
    for i, im in enumerate(imgs):
        px[:, i * w:(i + 1) * w] = np.array(im.pixels[:], np.float32).reshape(h, w, 4)
    out = bpy.data.images.new("sheet", w * len(imgs), h)
    out.pixels[:] = px.ravel()
    out.filepath_raw = str(dest)
    out.file_format = "PNG"
    out.save()


if __name__ == "__main__":
    main()
