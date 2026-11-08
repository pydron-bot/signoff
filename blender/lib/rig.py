"""The shared humanoid skeleton every human fighter uses, and helpers to pose
it in fighter space.

Deform bones (exported to the GLB, identical names in every fighter so clips
retarget) are listed in DEFORM. The IK controls in CONTROLS stay in the .blend:
the exporter bakes what they do into the deform bones' keys.

Clips are posed by placing the controls and turning the upper body in
fighter space (see Pose), then keyed. Blender frame n is move frame n
(1-based, as in the BLENDER-TODO table); the exporter slides each clip to
start at time 0, so the game samples move frame n at (n - 1) / 60 s.
"""
import math

import bpy
from mathutils import Euler, Matrix, Vector

from .common import fighter, from_blender

# (bone, parent), parents first. Lengths and joints are for 1.80 m and scale
# with the fighter's height.
DEFORM = [
    ("root", None),
    ("hips", "root"),
    ("spine", "hips"),
    ("chest", "spine"),
    ("neck", "chest"),
    ("head", "neck"),
    ("shoulder.L", "chest"),
    ("upper_arm.L", "shoulder.L"),
    ("forearm.L", "upper_arm.L"),
    ("hand.L", "forearm.L"),
    ("shoulder.R", "chest"),
    ("upper_arm.R", "shoulder.R"),
    ("forearm.R", "upper_arm.R"),
    ("hand.R", "forearm.R"),
    ("thigh.L", "hips"),
    ("shin.L", "thigh.L"),
    ("foot.L", "shin.L"),
    ("toe.L", "foot.L"),
    ("thigh.R", "hips"),
    ("shin.R", "thigh.R"),
    ("foot.R", "shin.R"),
    ("toe.R", "foot.R"),
]
CONTROLS = ["ik_hand.L", "ik_hand.R", "ik_foot.L", "ik_foot.R", "pole_elbow.L", "pole_elbow.R", "pole_knee.L", "pole_knee.R"]

# Rest pose (an A-pose), fighter space (side, fwd, up), left side; the right
# side mirrors it. Elbows bend back and knees forward, which seeds the IK.
_CENTRE = {
    "root": ((0, 0, 0), (0, 0, 0.25)),
    "hips": ((0, 0, 0.95), (0, 0, 1.07)),
    "spine": ((0, 0, 1.07), (0, 0, 1.25)),
    "chest": ((0, 0, 1.25), (0, 0, 1.45)),
    "neck": ((0, 0, 1.45), (0, 0.01, 1.55)),
    "head": ((0, 0.01, 1.55), (0, 0.01, 1.80)),
}
_LEFT = {
    "shoulder": ((0.03, 0, 1.41), (0.18, 0, 1.43)),
    "upper_arm": ((0.18, 0, 1.43), (0.34, -0.03, 1.18)),
    "forearm": ((0.34, -0.03, 1.18), (0.47, 0.01, 0.955)),
    "hand": ((0.47, 0.01, 0.955), (0.53, 0.02, 0.79)),
    "thigh": ((0.10, 0, 0.93), (0.10, 0.02, 0.51)),
    "shin": ((0.10, 0.02, 0.51), (0.10, 0, 0.09)),
    "foot": ((0.10, 0, 0.09), (0.10, 0.13, 0.025)),
    "toe": ((0.10, 0.13, 0.025), (0.10, 0.20, 0.02)),
}
_CONNECTED = {"spine", "chest", "neck", "head", "upper_arm", "forearm", "hand", "shin", "foot", "toe"}


def joints(height):
    """Every deform bone's (head, tail) in fighter space for a fighter `height` m tall."""
    k = height / 1.80
    out = {}
    for name, (h, t) in _CENTRE.items():
        out[name] = (tuple(c * k for c in h), tuple(c * k for c in t))
    for name, (h, t) in _LEFT.items():
        out[f"{name}.L"] = (tuple(c * k for c in h), tuple(c * k for c in t))
        out[f"{name}.R"] = ((-h[0] * k, h[1] * k, h[2] * k), (-t[0] * k, t[1] * k, t[2] * k))
    return out


def build_rig(name, height):
    data = bpy.data.armatures.new(f"{name}_rig")
    rig = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    j = joints(height)
    bpy.ops.object.mode_set(mode="EDIT")
    eb = data.edit_bones

    def new(bname, head, tail, parent=None, deform=True, connect=False):
        b = eb.new(bname)
        b.head, b.tail = fighter(*head), fighter(*tail)
        # Local Z faces forward (or up, for bones that lie along the foot), so
        # every fighter's bones share the same axes.
        d = (b.tail - b.head).normalized()
        b.align_roll(Vector((0, 0, 1)) if abs(d.y) > 0.7 else Vector((0, -1, 0)))
        b.use_deform = deform
        if parent:
            b.parent = eb[parent]
            b.use_connect = connect
        return b

    for bname, parent in DEFORM:
        h, t = j[bname]
        new(bname, h, t, parent, connect=bname.split(".")[0] in _CONNECTED)
    for s, sx in (("L", 1), ("R", -1)):
        # IK targets match the hand and foot exactly, so copying their rotation is a no-op at rest.
        for part in ("hand", "foot"):
            src = eb[f"{part}.{s}"]
            c = eb.new(f"ik_{part}.{s}")
            c.head, c.tail, c.roll = src.head.copy(), src.tail.copy(), src.roll
            c.use_deform = False
            c.parent = eb["root"]
        knee = j[f"shin.{s}"][0]
        elbow = j[f"forearm.{s}"][0]
        new(f"pole_knee.{s}", (knee[0], 0.6, knee[2]), (knee[0], 0.6, knee[2] + 0.1), "root", deform=False)
        new(f"pole_elbow.{s}", (elbow[0] + 0.15 * sx, -0.45, elbow[2]), (elbow[0] + 0.15 * sx, -0.45, elbow[2] + 0.1), "root", deform=False)
    bpy.ops.object.mode_set(mode="OBJECT")

    for s in ("L", "R"):
        for chain, target, pole, end in (("shin", "ik_foot", "pole_knee", "foot"), ("forearm", "ik_hand", "pole_elbow", "hand")):
            ik = rig.pose.bones[f"{chain}.{s}"].constraints.new("IK")
            ik.target, ik.subtarget = rig, f"{target}.{s}"
            ik.pole_target, ik.pole_subtarget = rig, f"{pole}.{s}"
            ik.chain_count = 2
            ik.pole_angle = _best_pole_angle(rig, f"{chain}.{s}", ik)
            cr = rig.pose.bones[f"{end}.{s}"].constraints.new("COPY_ROTATION")
            cr.target, cr.subtarget = rig, f"{target}.{s}"
    for pb in rig.pose.bones:
        pb.rotation_mode = "QUATERNION"
    return rig


def _best_pole_angle(rig, bone, ik):
    """The pole angle that leaves the rest pose unchanged (it depends on the
    bones' roll, so search for it rather than hard-code it)."""
    parent = rig.pose.bones[bone].parent
    rest = parent.bone.matrix_local

    def err(deg):
        ik.pole_angle = math.radians(deg)
        bpy.context.view_layer.update()
        m = parent.matrix
        return sum((m.col[i].to_3d() - rest.col[i].to_3d()).length for i in range(3))

    best = min(range(-180, 180, 5), key=err)
    best = min((best + d / 4 for d in range(-20, 21)), key=err)
    ik.pole_angle = math.radians(best)
    return ik.pole_angle


def _turn(pitch=0.0, yaw=0.0, roll=0.0):
    """A world rotation in fighter terms (degrees): pitch leans forward, yaw
    turns to the character's left, roll tips toward their right."""
    return (Matrix.Rotation(math.radians(yaw), 3, "Z") @ Matrix.Rotation(math.radians(pitch), 3, "X")
            @ Matrix.Rotation(math.radians(roll), 3, "Y"))


def _aim(direction, hint=(0, 0, 1)):
    """Orientation whose bone axis (Y) points along `direction` (fighter space), Z toward `hint`."""
    y = fighter(*direction).normalized()
    x = y.cross(fighter(*hint)).normalized()
    z = x.cross(y)
    return Matrix((x, y, z)).transposed()


class Pose:
    """One key pose in fighter space. Unset parts stay at rest.

    root: offset (side, fwd, up) and turn (pitch, yaw, roll) of the whole
      body, for knockdowns, throws and teleports only; everything below is
      given in the body's own frame and moves with it.
    hips: offset (side, fwd, up) from rest, plus turn (pitch, yaw, roll).
    spine / chest / neck / head / shoulder_L / shoulder_R / toe_L / toe_R:
      turn, as orientations in the body frame (a level head stays level
      whatever the chest does).
    foot_L / foot_R: ankle position, and turn (yaw mostly) or aim (where the
      foot points, for kicks).
    hand_L / hand_R: wrist position, and aim (the direction the hand points).
    knee_L / elbow_L (and _R): optional pole positions (which way the joint bends).
    shapes: {shape key: value} for the body's shape keys (expressions,
      fists, a jaw); unset keys are 0.
    """

    def __init__(self, **parts):
        self.parts = parts

    def get(self, key, default=None):
        return self.parts.get(key.replace(".", "_"), default)

    def but(self, **over):
        """A copy with some parts replaced."""
        return Pose(**{**self.parts, **over})

    def shaped(self, **values):
        """A copy with some shape keys set (the rest as they were)."""
        return self.but(shapes={**self.parts.get("shapes", {}), **values})


ORDER = ["hips", "spine", "chest", "neck", "head", "shoulder.L", "shoulder.R", "toe.L", "toe.R"]


def _euler(m):
    """(pitch, yaw, roll) in degrees for a rotation built as _turn builds it."""
    e = m.to_euler("YXZ")
    return (math.degrees(e.x), math.degrees(e.z), math.degrees(e.y))


def upright_root(pose, height):
    """The same pose with the root's pitch and roll moved into the body:
    every turn, aim and placed point is tipped instead, so the body ends up
    exactly where it was but `root` stays upright (only its offset and yaw
    are kept). Mumbles' control bar hangs on root, so his strings still go
    straight up when he's knocked flat."""
    root = pose.get("root", {})
    pitch, yaw, roll = root.get("turn", (0, 0, 0))
    if not pitch and not roll:
        return pose
    j = joints(height)
    B = Matrix.Rotation(math.radians(pitch), 3, "X") @ Matrix.Rotation(math.radians(roll), 3, "Y")

    def at(v):
        return from_blender(B @ fighter(*v))

    def turned(t):
        return _euler(B @ _turn(*t))

    parts = dict(pose.parts)
    parts["root"] = {"offset": root.get("offset", (0, 0, 0)), "turn": (0, yaw, 0)}
    hips = pose.get("hips", {})
    rest = fighter(*j["hips"][0])
    off = from_blender(B @ (rest + fighter(*hips.get("offset", (0, 0, 0)))) - rest)
    parts["hips"] = {"offset": off, "turn": turned(hips.get("turn", (0, 0, 0)))}
    for name in ORDER[1:]:
        parts[name.replace(".", "_")] = turned(pose.get(name, (0, 0, 0)))
    for s in ("L", "R"):
        sx = 1 if s == "L" else -1
        foot = dict(pose.get(f"foot.{s}", {}))
        ankle = foot.get("pos", j[f"foot.{s}"][0])
        knee = pose.get(f"knee.{s}")
        if knee is None:
            # As apply_pose places it, before tipping.
            fwd = from_blender(_turn(*foot.get("turn", (0, 0, 0))) @ Vector((0, -1, 0)))
            knee = tuple(a + f * 0.6 + u for a, f, u in zip(ankle, fwd, (0, 0, 0.45)))
        foot["pos"] = at(ankle)
        if "aim" in foot:
            foot["aim"], foot["hint"] = at(foot["aim"]), at(foot.get("hint", (0, 0, 1)))
        else:
            foot["turn"] = turned(foot.get("turn", (0, 0, 0)))
        hand = dict(pose.get(f"hand.{s}", {}))
        wrist = hand.get("pos", j[f"hand.{s}"][0])
        elbow = pose.get(f"elbow.{s}") or (wrist[0] + 0.3 * sx, wrist[1] - 0.5, wrist[2] - 0.3)
        if "aim" not in hand:
            # The rest orientation: along the bone, its Z forward.
            h, t = j[f"hand.{s}"]
            hand["aim"], hand["hint"] = tuple(b - a for a, b in zip(h, t)), (0, 1, 0)
        hand.update(pos=at(wrist), aim=at(hand["aim"]), hint=at(hand.get("hint", (0, 0, 1))))
        parts.update({f"foot_{s}": foot, f"hand_{s}": hand, f"knee_{s}": at(knee), f"elbow_{s}": at(elbow)})
    return Pose(**parts)


def apply_pose(rig, pose, height):
    """Put the rig in `pose` (evaluated, not keyed)."""
    pose = upright_root(pose, height)
    j = joints(height)
    for pb in rig.pose.bones:
        pb.location = (0, 0, 0)
        pb.rotation_quaternion = (1, 0, 0, 0)
    bpy.context.view_layer.update()

    root = pose.get("root", {})
    # The body frame: everything is placed in it, then carried by the root.
    R = _turn(*root.get("turn", (0, 0, 0))).to_4x4()
    R.translation = fighter(*root.get("offset", (0, 0, 0)))
    R3 = R.to_3x3()
    rest_root = rig.pose.bones["root"].bone.matrix_local
    m = R @ rest_root
    rig.pose.bones["root"].matrix = m

    def place(name, rot3, head=None):
        pb = rig.pose.bones[name]
        bpy.context.view_layer.update()
        m = (R3 @ rot3).to_4x4()
        m.translation = R @ head if head is not None else pb.head
        pb.matrix = m

    for name in ORDER:
        rest = rig.pose.bones[name].bone.matrix_local
        if name == "hips":
            hips = pose.get("hips", {})
            place(name, _turn(*hips.get("turn", (0, 0, 0))) @ rest.to_3x3(), rest.translation + fighter(*hips.get("offset", (0, 0, 0))))
        else:
            place(name, _turn(*pose.get(name, (0, 0, 0))) @ rest.to_3x3())
    for s in ("L", "R"):
        foot = pose.get(f"foot.{s}", {})
        ankle = foot.get("pos", j[f"foot.{s}"][0])
        rest = rig.pose.bones[f"ik_foot.{s}"].bone.matrix_local
        frot = _aim(foot["aim"], foot.get("hint", (0, 0, 1))) if "aim" in foot else _turn(*foot.get("turn", (0, 0, 0))) @ rest.to_3x3()
        place(f"ik_foot.{s}", frot, fighter(*ankle))
        hand = pose.get(f"hand.{s}", {})
        rest = rig.pose.bones[f"ik_hand.{s}"].bone.matrix_local
        rot = _aim(hand["aim"], hand.get("hint", (0, 0, 1))) if "aim" in hand else rest.to_3x3()
        place(f"ik_hand.{s}", rot, fighter(*hand.get("pos", j[f"hand.{s}"][0])))
        knee = pose.get(f"knee.{s}")
        if knee is None:
            # In front of the knee, along the foot's direction.
            a = fighter(*ankle)
            fwd = (_turn(*foot.get("turn", (0, 0, 0))) @ Vector((0, -1, 0)))
            knee_pos = a + fwd * 0.6 + Vector((0, 0, 0.45))
        else:
            knee_pos = fighter(*knee)
        place(f"pole_knee.{s}", rig.pose.bones[f"pole_knee.{s}"].bone.matrix_local.to_3x3(), knee_pos)
        elbow = pose.get(f"elbow.{s}")
        if elbow is None:
            sx = 1 if s == "L" else -1
            w = hand.get("pos", j[f"hand.{s}"][0])
            elbow = (w[0] + 0.3 * sx, w[1] - 0.5, w[2] - 0.3)
        place(f"pole_elbow.{s}", rig.pose.bones[f"pole_elbow.{s}"].bone.matrix_local.to_3x3(), fighter(*elbow))
    bpy.context.view_layer.update()


class Clip:
    """Keys poses into one action. Quaternions keep the same hemisphere from
    key to key, so interpolation never takes the long way round. The body's
    shape keys (Clip.shape_keys, set by the fighter build) are keyed in the
    same action, in a slot of their own, so each clip carries its face."""

    shape_keys = None

    def __init__(self, rig, name, frames, height, loop=False):
        self.rig, self.height = rig, height
        self.frames, self.loop = frames, loop
        self.action = bpy.data.actions.new(name)
        self.action.use_fake_user = True
        if rig.animation_data is None:
            rig.animation_data_create()
        rig.animation_data.action = self.action
        if Clip.shape_keys is not None:
            if Clip.shape_keys.animation_data is None:
                Clip.shape_keys.animation_data_create()
            Clip.shape_keys.animation_data.action = self.action
        self._last = {}

    def key(self, frame, pose):
        apply_pose(self.rig, pose, self.height)
        for pb in self.rig.pose.bones:
            q = pb.rotation_quaternion.copy()
            last = self._last.get(pb.name)
            if last is not None and last.dot(q) < 0:
                q.negate()
                pb.rotation_quaternion = q
            self._last[pb.name] = q
            pb.keyframe_insert("rotation_quaternion", frame=frame)
            pb.keyframe_insert("location", frame=frame)
        if Clip.shape_keys is not None:
            values = pose.parts.get("shapes", {})
            for kb in Clip.shape_keys.key_blocks[1:]:
                kb.value = values.get(kb.name, 0.0)
                kb.keyframe_insert("value", frame=frame)

    def finish(self):
        """A loop of N frames is keyed 1..N+1 (N+1 = 1), so it lasts exactly N/60 s."""
        self.action.use_frame_range = True
        self.action.frame_start = 1
        self.action.frame_end = self.frames + 1 if self.loop else self.frames
        self.action.use_cyclic = self.loop
        return self.action


def point(rig, bone, at="tail"):
    """A bone's head or tail in fighter space, as posed now."""
    pb = rig.pose.bones[bone]
    return from_blender(rig.matrix_world @ (pb.tail if at == "tail" else pb.head))


def check_strikes(rig, action, strikes, tol=0.04):
    """For each (frames, limb bone, box), the limb's tip must be inside the
    hitbox (x0, x1, y0, y1; fighter space fwd/up) on every active frame."""
    rig.animation_data.action = action
    problems = []
    for (f0, f1), bone, (x0, x1, y0, y1) in strikes:
        for f in range(f0, f1 + 1):
            bpy.context.scene.frame_set(f)
            _, fwd, up = point(rig, bone)
            if not (x0 - tol <= fwd <= x1 + tol and y0 - tol <= up <= y1 + tol):
                problems.append(f"{action.name} frame {f}: {bone} tip at x {fwd:.2f}, y {up:.2f}, outside x {x0}…{x1}, y {y0}…{y1}")
            else:
                print(f"  {action.name} frame {f}: {bone} tip at x {fwd:.2f}, y {up:.2f} (box x {x0}…{x1}, y {y0}…{y1}) ok")
    return problems
