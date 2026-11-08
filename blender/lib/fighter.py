"""Builds one fighter from its module (blender/fighters/<id>.py): the rig,
the blockout body, every state and move clip, the effect meshes, then checks
the strikes and writes art/<id>.blend and public/assets/fighters/<id>.glb.

A fighter module defines ID, HEIGHT (the rig's height), GIRTH and HEAD
(build), STANCE (a Stance subclass), costume(p, b), OVERRIDES (per-move
tuning, see anim.move_clips) and fx(make) for its effect meshes.
"""
import bpy

from .anim import DATA, check, move_clips, state_clips
from .body import Build, new_parts
from .common import export_glb, reset_scene, triangles
from .rig import apply_pose, build_rig, point


def head_top(rig, st, pose):
    apply_pose(rig, pose, st.height)
    return point(rig, "head", "tail")[2]


def fit_crouch(rig, st, top):
    """Crouch just low enough for the head to top out at the crouching
    hurtbox: bisect the hips' drop, leaning further if that isn't enough."""
    for pitch in (32, 42, 52, 62):
        st.crouch_pitch = pitch
        lo, hi = 0.2, 0.62
        st.crouch_drop = hi
        if head_top(rig, st, st.crouch()) > top:
            continue
        for _ in range(14):
            st.crouch_drop = (lo + hi) / 2
            if head_top(rig, st, st.crouch()) > top:
                lo = st.crouch_drop
            else:
                hi = st.crouch_drop
        st.crouch_drop = hi
        return
    raise RuntimeError(f"can't crouch to {top} m")


def build(mod, out_dir, art_dir):
    reset_scene()
    data = DATA[mod.ID]
    rig = build_rig(mod.ID, mod.HEIGHT)
    b = Build(mod.HEIGHT, getattr(mod, "GIRTH", 1.0), getattr(mod, "HEAD", 1.0))
    p = new_parts()
    mod.costume(p, b)
    body = p.join(f"{mod.ID}_body", rig)
    skinned = [body]
    if hasattr(mod, "extras"):
        # Skinned parts that aren't the body (Mumbles' strings): their own
        # mesh, so they don't count toward the fighter's height.
        mod.extras(p, b)
        skinned.append(p.join(f"{mod.ID}_{mod.EXTRAS}", rig))

    fx = []
    if hasattr(mod, "fx"):
        def make(name, build_parts):
            build_parts(p)
            obj = p.join(name)
            fx.append(obj)
            return obj

        mod.fx(make, b)

    st = mod.STANCE(mod.HEIGHT)
    fit_crouch(rig, st, data["hurt"]["crouch"][3])
    actions = state_clips(rig, st, data)
    moves, strikes, unreachable = move_clips(rig, st, data, getattr(mod, "OVERRIDES", {}))
    problems = unreachable + check(rig, moves, strikes)

    # Sizes, for the log: rest height, and the head top crouching.
    rig.data.pose_position = "REST"
    bpy.context.view_layer.update()
    top = max((body.matrix_world @ v.co).z for v in body.data.vertices)
    rig.data.pose_position = "POSE"
    crouch_top = head_top(rig, st, st.crouch())
    hurt = data["hurt"]
    print(f"[{mod.ID}] {sum(triangles(o) for o in skinned)} body triangles + {sum(triangles(o) for o in fx)} fx, rest height {top:.3f} m "
          f"(hurtbox {hurt['stand'][3]}), head crouching {crouch_top:.2f} m (hurtbox {hurt['crouch'][3]}), "
          f"{len(actions)} state + {len(moves)} move clips")
    rig.animation_data.action = actions[0]
    bpy.context.scene.frame_set(1)
    if problems:
        raise RuntimeError(f"{mod.ID}: strikes miss their hitboxes:\n  " + "\n  ".join(problems))

    art_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(art_dir / f"{mod.ID}.blend"), compress=True)
    export_glb(out_dir / "fighters" / f"{mod.ID}.glb", [rig, *skinned, *fx])
