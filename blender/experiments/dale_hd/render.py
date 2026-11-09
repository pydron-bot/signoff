"""Beauty renders of the built model (art-out/dale_hd.blend) in EEVEE: a
studio key, fill and rim, at rest and posed by game clips.

    blender -b art-out/dale_hd.blend -P blender/experiments/dale_hd/render.py -- --out DIR [--res 900]
"""
import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from experiments.dale_hd.preview import sheet  # noqa: E402

SHOTS = [
    # name, action (None = rest), frame, target, distance, azimuth, elevation, lens
    ("full_front", None, 1, (0, 0, 0.94), 3.0, 0, 3, 50),
    ("full_34", None, 1, (0, 0, 0.94), 3.0, 35, 5, 50),
    ("full_back", None, 1, (0, 0, 0.94), 3.0, 160, 5, 50),
    ("face_34", None, 1, (0, 0.02, 1.71), 0.62, 28, 3, 85),
    ("face_front", None, 1, (0, 0.02, 1.71), 0.62, 0, 0, 85),
    ("idle", "idle", 1, (0, 0, 0.92), 3.1, 60, 6, 50),
    ("win", "win", 60, (0, 0, 0.95), 3.1, 25, 6, 50),
    ("punch", "s.BP", 8, (0, 0, 0.95), 3.2, 70, 8, 50),
]


def setup(res):
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x = res
    sc.render.resolution_y = int(res * 1.25)
    sc.view_settings.view_transform = "Standard"
    world = bpy.data.worlds.new("w")
    sc.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.05, 0.055, 0.065, 1)
    bg.inputs["Strength"].default_value = 1.0
    for name, loc, energy, size, colour in (("key", (-2.2, -3.0, 3.2), 520, 1.2, (1.0, 0.95, 0.88)),
                                             ("fill", (2.8, -2.2, 1.6), 150, 2.0, (0.85, 0.9, 1.0)),
                                             ("rim", (0.6, 3.0, 2.8), 420, 0.8, (0.9, 0.95, 1.0))):
        L = bpy.data.lights.new(name, "AREA")
        L.energy, L.size, L.color = energy, size, colour
        o = bpy.data.objects.new(name, L)
        sc.collection.objects.link(o)
        o.location = loc
        o.rotation_euler = (Vector((0, 0, 1.1)) - o.location).to_track_quat("-Z", "Y").to_euler()
    floor = bpy.data.meshes.new("floor")
    floor.from_pydata([(-6, -6, 0), (6, -6, 0), (6, 6, 0), (-6, 6, 0)], [], [(0, 1, 2, 3)])
    fo = bpy.data.objects.new("floor", floor)
    sc.collection.objects.link(fo)
    m = bpy.data.materials.new("floor")
    m.diffuse_color = (0.08, 0.085, 0.1, 1)
    m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.06, 0.065, 0.08, 1)
    m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.6
    floor.materials.append(m)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    sc.collection.objects.link(cam)
    sc.camera = cam
    return cam


def main():
    argv = sys.argv[sys.argv.index("--") + 1:]
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--res", type=int, default=900)
    ap.add_argument("--only", default="")
    args = ap.parse_args(argv)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    cam = setup(args.res)
    rig = bpy.data.objects["dale"]
    sc = bpy.context.scene
    done = []
    for name, act, frame, target, dist, az, el, lens in SHOTS:
        if args.only and name not in args.only.split(","):
            continue
        if act is None:
            rig.data.pose_position = "REST"
        else:
            rig.data.pose_position = "POSE"
            rig.animation_data.action = bpy.data.actions[act]
            if rig.animation_data.action.slots:
                rig.animation_data.action_slot = rig.animation_data.action.slots[0]
        sc.frame_set(frame)
        cam.data.lens = lens
        tg = Vector((target[0], -target[1], target[2]))
        a, e = math.radians(az), math.radians(el)
        cam.location = tg + Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))) * dist
        cam.rotation_euler = (tg - cam.location).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = str(out / f"{name}.png")
        bpy.ops.render.render(write_still=True)
        done.append(out / f"{name}.png")
    if len(done) > 1:
        sheet(done[:3], out / "sheet_full.png")


main()
