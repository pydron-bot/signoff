"""Build the game's art headless (docs/BLENDER-TODO.md has the contracts).

    blender -b --factory-startup -P blender/build.py -- [--only rig|dale|weather|burn] [--out public/assets] [--art art]

Writes the .blend sources to art/ and the GLBs to public/assets/ (fighters/
and stages/). The
scripts are the source of truth for now: rebuilding overwrites art/*.blend.
"""
import argparse
import importlib
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

TARGETS = ["rig", "dale", "rox", "hollis", "mumbles", "margaret", "gus", "weather", "burn"]
STAGES = {"weather", "burn"}


def build_rig_file(out_dir, art_dir):
    """art/rig.blend: the shared skeleton on its own, to start new fighters from."""
    import bpy

    from lib.common import reset_scene
    from lib.rig import build_rig

    reset_scene()
    build_rig("rig", 1.80)
    art_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(art_dir / "rig.blend"), compress=True)


def main():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    p = argparse.ArgumentParser(prog="build")
    p.add_argument("--out", default=str(HERE.parent / "public" / "assets"))
    p.add_argument("--art", default=str(HERE.parent / "art"))
    p.add_argument("--only", action="append", choices=TARGETS)
    args = p.parse_args(argv)

    out, art = Path(args.out).resolve(), Path(args.art).resolve()
    failed = []
    for name in args.only or TARGETS:
        t = time.time()
        try:
            if name == "rig":
                build_rig_file(out, art)
            elif name in STAGES:
                from lib.stage import build as build_stage

                build_stage(importlib.import_module(f"stages.{name}"), out, art)
            else:
                from lib.fighter import build

                build(importlib.import_module(f"fighters.{name}"), out, art)
            print(f"[{name}] ok in {time.time() - t:.1f}s")
        except Exception:
            import traceback

            traceback.print_exc()
            failed.append(name)
    if failed:
        print(f"FAILED: {', '.join(failed)}")
        sys.exit(1)


main()
