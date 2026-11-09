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

from .anim import DATA, check, move_clips, shifted, state_clips
from .body import Build, new_parts
from .common import export_glb, reset_scene, shape_key_tracks, triangles
from .rig import JAW, Clip, add_bones, apply_pose, build_rig
from .spring import bake
from .texture import paint, unwrap, use_atlas

# Seen most (round start, win, intro): twice the texel density.
DENSE = ("head", "face", "torso", "shirt", "tie", "lapel", "brow", "eye", "pupil", "nose", "mouth", "grin", "teeth", "lip",
         "cheek", "jaw", "badge", "patch", "tag", "pin", "moustache", "headband")

# The head tops out within this of the hurtbox's top in idle, the walks and
# block_stand (crouch_idle against the crouching box): under by up to 3 cm,
# over by up to 1 cm.
UNDER, OVER = 0.03, 0.01

# launched from frame 6 on: the body within the juggle hurtbox (this much
# slack each side) and at least this long against the box's width.
JUGGLE_SLACK, JUGGLE_FILL, JUGGLE_FROM = 0.05, 0.8, 6
# relaunch's somersault gets more: a tucked body is still 0.85–0.95 m
# across, and the boxes are 0.65–0.8 m tall (see BLENDER-TODO, Feedback).
TUMBLE_SLACK = 0.15


def mesh_top(body):
    """The skinned body's highest point as posed now (metres)."""
    ev = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    m = ev.to_mesh()
    co = np.empty(len(m.vertices) * 3)
    m.vertices.foreach_get("co", co)
    ev.to_mesh_clear()
    return float(co[2::3].max()) + body.matrix_world.translation.z


def mesh_bounds(body):
    """The skinned body's extent along the stage and up, as posed now:
    (x0, x1, y0, y1) in fighter space (fwd, up)."""
    ev = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    m = ev.to_mesh()
    co = np.empty(len(m.vertices) * 3)
    m.vertices.foreach_get("co", co)
    ev.to_mesh_clear()
    t = body.matrix_world.translation
    fwd, up = -(co[1::3] + t.y), co[2::3] + t.z
    return float(fwd.min()), float(fwd.max()), float(up.min()), float(up.max())


def fit_juggle(rig, body, st, box):
    """Slide the aloft pose (Stance.aloft) so the body is centred in the
    juggle hurtbox. On its back the body's up is the stage's −x and its
    forward is up, so the shift is applied in the body frame."""
    st.juggle_shift = (0.0, 0.0)
    for _ in range(2):
        apply_pose(rig, st.aloft(), st.height)
        x0, x1, y0, y1 = mesh_bounds(body)
        dx = (box[0] + box[1]) / 2 - (x0 + x1) / 2
        dy = (box[2] + box[3]) / 2 - (y0 + y1) / 2
        df, du = st.juggle_shift
        st.juggle_shift = (df + dy, du - dx)


def fit_reactions(rig, body, st, box):
    """Each juggle reaction key pose's slide (in the body frame) that centres
    the body in the juggle hurtbox, solved by measuring (the body turns in
    these poses, so a slide's effect on the stage isn't fixed). A pose that
    is still too big for this fighter's box is blended toward the held pose
    (which fits) just enough to fit; the tumble's ball can't be, and keeps
    its own slack (TUMBLE_SLACK)."""
    from .anim import lerp_pose

    target = np.array(((box[0] + box[1]) / 2, (box[2] + box[3]) / 2))
    poses = st.reaction_poses()
    held = poses["held"]
    st.react_shift, st.react_blend = {}, {}

    def centred(pose):
        def centre(d):
            apply_pose(rig, shifted(pose, (0, d[0], d[1])), st.height)
            x0, x1, y0, y1 = mesh_bounds(body)
            return np.array(((x0 + x1) / 2, (y0 + y1) / 2)), (x0, x1, y0, y1)

        d = np.array(st.juggle_shift, dtype=float)
        for _ in range(3):
            c, _ = centre(d)
            e = 0.05
            J = np.column_stack(((centre(d + (e, 0))[0] - c) / e, (centre(d + (0, e))[0] - c) / e))
            d = d + np.linalg.lstsq(J, target - c, rcond=None)[0]
        return tuple(d), centre(d)[1]

    def fits(b):
        return b[0] >= box[0] and b[1] <= box[1] and b[2] >= box[2] and b[3] <= box[3]

    for name, pose in poses.items():
        if name == "held":
            continue
        d, b = centred(pose)
        if not fits(b) and not name.startswith("tumble"):
            lo, hi = 0.0, 1.0
            for _ in range(6):
                t = (lo + hi) / 2
                d2, b2 = centred(lerp_pose(pose, held, t).shaped(**pose.parts.get("shapes", {})))
                if fits(b2):
                    hi, d = t, d2
                else:
                    lo = t
            st.react_blend[name] = hi
        st.react_shift[name] = d


REACTIONS = ("juggle_hit", "relaunch", "slam", "floor_bounce", "wall_splat")


def check_juggle(rig, body, actions, box):
    """launched lies in the juggle hurtbox from frame 6 on, filling its
    length; the juggle reactions stay inside it on every frame."""
    problems, seen = _juggle_box(rig, body, next(a for a in actions if a.name == "launched"), box, JUGGLE_FROM, fill=True)
    for a in actions:
        if a.name in REACTIONS:
            more, ext = _juggle_box(rig, body, a, box, 1, fill=False, slack=TUMBLE_SLACK if a.name == "relaunch" else JUGGLE_SLACK)
            if more:
                problems.append(f"{a.name}: {len(more)} frames outside the juggle box (at worst x {ext[0]:.2f}…{ext[1]:.2f}, y {ext[2]:.2f}…{ext[3]:.2f}); first: {more[0]}")
    return problems, seen


def _juggle_box(rig, body, a, box, first, fill, slack=JUGGLE_SLACK):
    rig.animation_data.action = a
    bx0, bx1, by0, by1 = box
    problems, seen = [], [9, -9, 9, -9]
    for f in range(first, int(a.frame_end) + 1):
        bpy.context.scene.frame_set(f)
        x0, x1, y0, y1 = mesh_bounds(body)
        seen = [min(seen[0], x0), max(seen[1], x1), min(seen[2], y0), max(seen[3], y1)]
        if x0 < bx0 - slack or x1 > bx1 + slack or y0 < by0 - slack or y1 > by1 + slack:
            problems.append(f"{a.name} frame {f}: body at x {x0:.2f}…{x1:.2f}, y {y0:.2f}…{y1:.2f}, outside the juggle box x {bx0}…{bx1}, y {by0}…{by1}")
        if fill and x1 - x0 < JUGGLE_FILL * (bx1 - bx0):
            problems.append(f"launched frame {f}: body {x1 - x0:.2f} m long, under {JUGGLE_FILL:.0%} of the juggle box ({bx1 - bx0:.2f} m)")
    return problems, seen


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
    head = getattr(mod, "HEAD", 1.0)
    rig = build_rig(mod.ID, height, head, getattr(mod, "HAND", 1.0))
    rig["jaw_open"] = getattr(mod, "JAW_OPEN", JAW)
    rig["jaw_slide"] = getattr(mod, "JAW_SLIDE", 0.0) * height / 1.80 * head
    b = Build(height, getattr(mod, "GIRTH", 1.0), head)
    if hasattr(mod, "xbones"):
        add_bones(rig, mod.xbones(b))
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
        p.collapse(body)  # held props don't count toward the height
        st = mod.STANCE(height)
        top = top_in(rig, body, st, st.base(0))
        if abs(top - target) < 0.002:
            break
        height *= target / top
    if p.hidden:
        rig, b, p, body = make_body(mod, height)  # full size again, to paint

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

    # The atlases: body 1024², props 512², painted from the parts.
    objs = skinned + fx
    unwrap(objs, {m["name"] for m in p.meta if m["name"].startswith(DENSE)}, p.meta)
    for mi, size in ((0, 1024), (1, 512)):
        if any(pl.material_index == mi for o in objs for pl in o.data.polygons):
            use_atlas(p.materials[mi], paint(objs, p.meta, mi, size, art_dir / "textures" / f"{mod.ID}_{p.materials[mi].name}.png"))
    p.collapse(body)  # held props hide in the fist until their key

    Clip.shape_keys = body.data.shape_keys
    fit_crouch(rig, body, st, hurt["crouch"][3])
    fit_juggle(rig, body, st, hurt["juggle"])
    fit_reactions(rig, body, st, hurt["juggle"])
    actions = state_clips(rig, st, data)
    moves, strikes, unreachable = move_clips(rig, st, data, getattr(mod, "OVERRIDES", {}))
    # Secondary motion on the fighter's own bones, before the checks (it moves the mesh).
    bake(rig, actions + moves, mod.xbones(b) if hasattr(mod, "xbones") else [], skinned)
    problems = unreachable + check(rig, moves, strikes)
    tall, heights = check_heights(rig, body, actions, hurt)
    problems += tall
    flat, juggle = check_juggle(rig, body, actions, hurt["juggle"])
    problems += flat

    rig.data.pose_position = "REST"
    bpy.context.view_layer.update()
    rest = max((body.matrix_world @ v.co).z for v in body.data.vertices)
    rig.data.pose_position = "POSE"
    print(f"[{mod.ID}] {sum(triangles(o) for o in skinned)} body triangles + {sum(triangles(o) for o in fx)} fx, rig {height:.3f} m, rest {rest:.3f} m; "
          + ", ".join(f"{n} {lo:.3f}…{hi:.3f}" for n, (lo, hi) in heights.items())
          + f" (hurtboxes {hurt['stand'][3]}, {hurt['crouch'][3]}); launched x {juggle[0]:.2f}…{juggle[1]:.2f}, y {juggle[2]:.2f}…{juggle[3]:.2f}"
          + f" (box {hurt['juggle']}); {len(actions)} state + {len(moves)} move clips")
    rig.animation_data.action = actions[0]
    bpy.context.scene.frame_set(1)
    if problems:
        raise RuntimeError(f"{mod.ID}: strikes miss their hitboxes or heights are off:\n  " + "\n  ".join(problems))

    art_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(art_dir / f"{mod.ID}.blend"), compress=True)
    morphs = {body.name: shape_key_tracks(body, actions + moves)} if body.data.shape_keys else {}
    export_glb(out_dir / "fighters" / f"{mod.ID}.glb", [rig, *skinned, *fx], morphs)
