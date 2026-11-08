"""Builds one fighter from its module (blender/fighters/<id>.py): the rig,
the body, every state and move clip, the effect meshes, then checks the
strikes and the heights and writes art/<id>.blend and
public/assets/fighters/<id>.glb.

A fighter module defines ID, HEIGHT (a first guess at the rig's height: the
build scales it so the fighting stance stands as tall as the hurtbox), GIRTH
and HEAD (build), STANCE (a Stance subclass), costume(p, b), OVERRIDES
(per-move tuning, see anim.move_clips) and fx(make) for its effect meshes.
"""
import bpy
import numpy as np

from .anim import DATA, check, move_clips, state_clips
from .body import Build, new_parts
from .common import export_glb, reset_scene, triangles
from .rig import apply_pose, build_rig

# The head tops out within this of the hurtbox's top in idle, the walks and
# block_stand (crouch_idle against the crouching box): under by up to 3 cm,
# over by up to 1 cm.
UNDER, OVER = 0.03, 0.01


def mesh_top(body):
    """The skinned body's highest point as posed now (metres)."""
    ev = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    m = ev.to_mesh()
    co = np.empty(len(m.vertices) * 3)
    m.vertices.foreach_get("co", co)
    ev.to_mesh_clear()
    return float(co[2::3].max()) + body.matrix_world.translation.z


def top_in(rig, body, st, pose):
    apply_pose(rig, pose, st.height)
    return mesh_top(body)


def fit_crouch(rig, body, st, top):
    """Crouch just low enough for the head to top out at the crouching
    hurtbox: bisect the hips' drop, leaning further if that isn't enough."""
    for pitch in (32, 42, 52, 62):
        st.crouch_pitch = pitch
        lo, hi = 0.2, 0.62
        st.crouch_drop = hi
        if top_in(rig, body, st, st.crouch()) > top:
            continue
        for _ in range(14):
            st.crouch_drop = (lo + hi) / 2
            if top_in(rig, body, st, st.crouch()) > top:
                lo = st.crouch_drop
            else:
                hi = st.crouch_drop
        st.crouch_drop = hi
        return
    raise RuntimeError(f"can't crouch to {top} m")


def make_body(mod, height):
    """A fresh scene with the rig and the skinned body at `height`."""
    reset_scene()
    rig = build_rig(mod.ID, height)
    b = Build(height, getattr(mod, "GIRTH", 1.0), getattr(mod, "HEAD", 1.0))
    p = new_parts()
    mod.costume(p, b)
    body = p.join(f"{mod.ID}_body", rig)
    return rig, b, p, body


def check_heights(rig, body, actions, hurt):
    """The head against the hurtbox's top on every frame of the clips that
    stand (or crouch) still, like the strike check."""
    boxes = {"idle": hurt["stand"][3], "walk_fwd": hurt["stand"][3], "walk_back": hurt["stand"][3],
             "block_stand": hurt["stand"][3], "crouch_idle": hurt["crouch"][3]}
    problems, seen = [], {}
    for a in actions:
        if a.name not in boxes:
            continue
        rig.animation_data.action = a
        tops = []
        for f in range(int(a.frame_start), int(a.frame_end) + 1):
            bpy.context.scene.frame_set(f)
            tops.append(mesh_top(body))
        box = boxes[a.name]
        seen[a.name] = (min(tops), max(tops))
        if min(tops) < box - UNDER or max(tops) > box + OVER:
            problems.append(f"{a.name}: head at {min(tops):.3f}…{max(tops):.3f} m, hurtbox top {box} m")
    return problems, seen


def build(mod, out_dir, art_dir):
    data = DATA[mod.ID]
    hurt = data["hurt"]

    # Scale the rig until the fighting stance's head (idle at its highest)
    # is level with the hurtbox's top; the rest pose stands a little taller.
    height = mod.HEIGHT
    target = hurt["stand"][3] + 0.004
    for _ in range(6):
        rig, b, p, body = make_body(mod, height)
        st = mod.STANCE(height)
        top = top_in(rig, body, st, st.base(0))
        if abs(top - target) < 0.002:
            break
        height *= target / top

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

    fit_crouch(rig, body, st, hurt["crouch"][3])
    actions = state_clips(rig, st, data)
    moves, strikes, unreachable = move_clips(rig, st, data, getattr(mod, "OVERRIDES", {}))
    problems = unreachable + check(rig, moves, strikes)
    tall, heights = check_heights(rig, body, actions, hurt)
    problems += tall

    rig.data.pose_position = "REST"
    bpy.context.view_layer.update()
    rest = max((body.matrix_world @ v.co).z for v in body.data.vertices)
    rig.data.pose_position = "POSE"
    print(f"[{mod.ID}] {sum(triangles(o) for o in skinned)} body triangles + {sum(triangles(o) for o in fx)} fx, rig {height:.3f} m, rest {rest:.3f} m; "
          + ", ".join(f"{n} {lo:.3f}…{hi:.3f}" for n, (lo, hi) in heights.items())
          + f" (hurtboxes {hurt['stand'][3]}, {hurt['crouch'][3]}); {len(actions)} state + {len(moves)} move clips")
    rig.animation_data.action = actions[0]
    bpy.context.scene.frame_set(1)
    if problems:
        raise RuntimeError(f"{mod.ID}: strikes miss their hitboxes or heights are off:\n  " + "\n  ".join(problems))

    art_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(art_dir / f"{mod.ID}.blend"), compress=True)
    export_glb(out_dir / "fighters" / f"{mod.ID}.glb", [rig, *skinned, *fx])
