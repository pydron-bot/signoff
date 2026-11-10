"""Clips for a fighter: the state clips (idle, walks, hits, knockdowns…)
from their stance, and every move clip generated from the move data
(blender/data/fighters.json) so each hit lands in its hitbox.

A move clip: the base pose (standing, crouching or in the air), a chamber
(the limb drawn back), the strike held over the active frames, then the
recovery back to base. Which limb strikes comes from the move's last button
(FP lead hand, BP rear hand, FK lead foot, BK rear foot) unless the fighter
overrides it. Each strike is fitted: the pose is evaluated and the lunge and
target nudged until the limb's tip is inside the hitbox.
"""
import inspect
import json
import math
from pathlib import Path

import bpy

from mathutils import Vector

from .rig import Clip, Pose, apply_pose, point

DATA = json.loads((Path(__file__).resolve().parents[1] / "data" / "fighters.json").read_text())
TIP = {"hand.L": "hand.L", "hand.R": "hand.R", "foot.L": "toe.L", "foot.R": "toe.R"}
BUTTON_LIMB = {"FP": "hand.L", "BP": "hand.R", "FK": "foot.L", "BK": "foot.R"}
TOL = 0.04  # how far outside the hitbox a tip may be (m), as in rig.check_strikes


def lerp(a, b, t):
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def tip_point(rig, limb, extra=0.0):
    """The striking tip as posed now: the limb's end, or `extra` metres past
    the hand along it (a held prop's tip: an umbrella, a string). A knee
    (knee.L) strikes with the knee joint, a shoulder (shoulder.L) with the
    shoulder joint."""
    kind, s = limb.split(".")
    if kind in ("knee", "shoulder"):
        return point(rig, f"{'shin' if kind == 'knee' else 'upper_arm'}.{s}", "head")
    if not extra:
        return point(rig, TIP[limb])
    head, tail = Vector(point(rig, limb, "head")), Vector(point(rig, limb))
    return tuple(tail + (tail - head).normalized() * extra)


def shifted(pose, d):
    """The whole pose moved by d (side, fwd, up) in the body frame: the hips
    and every placed hand, foot and pole, so the skeleton moves rigidly."""
    def add(v):
        return tuple(a + b for a, b in zip(v, d))

    parts = {}
    hips = pose.parts.get("hips", {})
    parts["hips"] = {**hips, "offset": add(hips.get("offset", (0, 0, 0)))}
    for key in ("foot_L", "foot_R", "hand_L", "hand_R"):
        if "pos" in pose.parts.get(key, {}):
            parts[key] = {**pose.parts[key], "pos": add(pose.parts[key]["pos"])}
    for key in ("knee_L", "knee_R", "elbow_L", "elbow_R"):
        if key in pose.parts:
            parts[key] = add(pose.parts[key])
    return pose.but(**parts)


def lerp_pose(a, b, t):
    """Blend two poses part by part (positions, aims and turns)."""
    out = {}
    for key in set(a.parts) | set(b.parts):
        pa, pb = a.parts.get(key), b.parts.get(key)
        if key == "shapes":
            # Unset shape keys are 0.
            pa, pb = pa or {}, pb or {}
            out[key] = {k: pa.get(k, 0.0) + (pb.get(k, 0.0) - pa.get(k, 0.0)) * t for k in set(pa) | set(pb)}
        elif pa is None or pb is None:
            out[key] = pb if pa is None else pa
        elif isinstance(pa, dict):
            out[key] = {k: lerp(pa[k], pb[k], t) if k in pa and k in pb else pb.get(k, pa.get(k)) for k in set(pa) | set(pb)}
        else:
            out[key] = lerp(pa, pb, t)
    return Pose(**out)


def smooth(t):
    return t * t * (3 - 2 * t)


def pose_at(keys, f):
    """The pose at frame f of a {frame: pose} clip, eased between keys as
    Blender's default keys are."""
    if f in keys:
        return keys[f]
    a = max((x for x in keys if x < f), default=None)
    b = min((x for x in keys if x > f), default=None)
    if a is None or b is None:
        return keys[a if b is None else b]
    return lerp_pose(keys[a], keys[b], smooth((f - a) / (b - a)))


def gait(f0, f1, v, k, span=0.5, lift=0.07):
    """Steps for a body travelling v metres a frame (forward; negative is
    back) over frames f0…f1: {frame: ((fwd, lift) of the left foot, of the
    right)}, offsets from where the pose puts each foot. A foot is planted
    for 55% of a cycle, sliding back at v so it stays put on the floor while
    the game moves the fighter, and swings forward for 45%; the feet are
    half a cycle apart, and both start where the pose has them."""
    s = abs(v)
    cycle = max(6, min(30, round(span * k / (s * 0.55)))) if s else 30
    travel = s * cycle * 0.55
    sign = 1 if v >= 0 else -1
    out = {}
    for f in range(f0, f1 + 1):
        t = (f - f0) / cycle
        # Settle back onto the stance over the last frames.
        env = max(0.0, min(1.0, (f1 - f) / 3)) if f1 - f0 >= 6 else 1.0
        feet = []
        for phase in (0.725, 0.225):
            u = (t + phase) % 1.0
            if u < 0.45:
                off = -travel / 2 + travel * smooth(u / 0.45)
                z = lift * k * math.sin(math.pi * u / 0.45)
            else:
                off = travel / 2 - travel * (u - 0.45) / 0.55
                z = 0.0
            feet.append((sign * off * env, z * env))
        out[f] = feet
    return out


def beat(f0, f1, v, k, lift=0.06):
    """One step on the beat over frames f0…f1 (a dancer's step-together),
    in gait's form: the lead foot steps out over the first half and lands
    ahead, the rear one follows over the second, and both end where the
    pose has them. A planted foot slides back at v, so it stays put on the
    floor while the game moves the fighter."""
    n = max(1, f1 - f0)
    travel = v * (n + 1)
    out = {}
    for f in range(f0, f1 + 1):
        t = (f - f0) / n
        # Each foot's place on the floor (0 → travel), less the body's travel so far.
        if t < 0.5:
            lead = (travel * smooth(t / 0.5) - travel * t, lift * k * math.sin(math.pi * t / 0.5))
            rear = (-travel * t, 0.0)
        else:
            lead = (travel * (1 - t), 0.0)
            rear = (travel * smooth((t - 0.5) / 0.5) - travel * t, lift * 0.6 * k * math.sin(math.pi * (t - 0.5) / 0.5))
        out[f] = [lead, rear]
    return out


def step_through(keys, windows, k, free=lambda f, s, pose: False, span=0.5, walk=gait):
    """Key every frame of each motion window ({frames, vx}) with the feet
    stepping at its speed, over whatever the clip's keys do above them.
    free(frame, "L"/"R", pose) leaves a foot to the clip (a kicking foot, or
    feet off the floor). walk: gait (steps at the speed) or beat (one step)."""
    new = {}
    for w in windows:
        f0, f1 = w["frames"]
        steps = walk(f0, f1, w["vx"], k, span) if walk is gait else walk(f0, f1, w["vx"], k)
        for f, feet in steps.items():
            pose = pose_at(keys, f)
            parts = {}
            for s, (d, z) in zip("LR", feet):
                foot = dict(pose.parts.get(f"foot_{s}", {}))
                if "pos" not in foot or free(f, s, pose):
                    continue
                x, y, u = foot["pos"]
                foot["pos"] = (x, y + d, u + z)
                parts[f"foot_{s}"] = foot
            new[f] = pose.but(**parts)
    keys.update(new)


def off_floor(pose, k):
    return pose.parts.get("root", {}).get("offset", (0, 0, 0))[2] > 0.03 * k


def added(pose, hips=None, **turns):
    """The pose with turns (pitch, yaw, roll) added to its own; hips take
    {"offset": …, "turn": …} to add. A chest turn carries the shoulders
    unless they're given."""
    parts = {}
    if "chest" in turns:
        for s in ("shoulder_L", "shoulder_R"):
            turns.setdefault(s, turns["chest"])
    for name, d in turns.items():
        parts[name] = tuple(a + b for a, b in zip(pose.parts.get(name, (0, 0, 0)), d))
    if hips:
        h = pose.parts.get("hips", {})
        parts["hips"] = {key: tuple(a + b for a, b in zip(h.get(key, (0, 0, 0)), hips.get(key, (0, 0, 0)))) for key in ("offset", "turn")}
    return pose.but(**parts)


def moved(foot, d, turn=None):
    """A foot part moved by d (side, fwd, up), optionally turned."""
    out = {**foot, "pos": tuple(a + b for a, b in zip(foot["pos"], d))}
    if turn is not None:
        out["turn"] = turn
    return out


def toward(peak, base, back, keep=("hurt", "ko", "win")):
    """A hit pose eased `back` of the way to `base` (negative overshoots past
    the peak); the expression is kept and the hand and jaw values clamped."""
    p = lerp_pose(peak, base, back)
    ps = peak.parts.get("shapes", {})
    s = {n: min(1.0, max(0.0, v)) for n, v in p.parts.get("shapes", {}).items()}
    s.update({n: ps[n] for n in keep if n in ps})
    return p.but(shapes=s)


class Stance:
    """A fighter's fighting stance and body language, in 1.80 m reference
    metres (scaled by height). Override fields per fighter."""

    drop = 0.07  # hips lowered (knees bent)
    hips_yaw = -25
    chest_yaw = -32
    chest_pitch = 8
    lead_foot = (0.12, 0.20)
    rear_foot = (-0.17, -0.20)
    lead_foot_yaw = -15
    rear_foot_yaw = -50
    lead_hand = (0.09, 0.38, 1.28)
    rear_hand = (-0.06, 0.18, 1.35)
    lead_aim = (-0.1, 0.45, 0.9)
    rear_aim = (0.25, 0.4, 0.9)
    bob = 0.012  # idle breathing
    guard_fist = 0.8  # how closed the hands are on guard (strikes close them)
    talk = False  # the jaw works in idle (Mumbles)
    block_up = 1.42  # wrists' height blocking standing (the hands stay under the hurtbox's top)
    block_head = 6  # the head ducks forward behind the guard (a cap's back rises with it)
    # Crouch depth and lean; fighter.build solves crouch_drop so the head
    # tops out at the crouching hurtbox.
    crouch_drop = 0.5
    crouch_pitch = 32
    # Rhythm (step 25 A): how every generated strike moves (see rhythm()).
    # Unset, a strike eases the plain way.
    # windup (draw, start, end): the limb drawn back `draw` times as far as
    #   the plain chamber (over 1, the body loads up behind it too), between
    #   these shares of the startup.
    # snap (frames, power): how it reaches the strike over its last frames:
    #   power under 1 is there early (a hard ease-out), over 1 still
    #   accelerating into it.
    # follow (carry, hold): how far the body carries past the strike (1 is
    #   the weight thrown onto the front foot), and for how many frames.
    # settle: the recovery's overshoot back past the stance (a bounce);
    #   negative sinks into it instead.
    windup = None
    snap = None
    follow = None
    settle = 0.0

    def __init__(self, height):
        self.height = height
        self.k = height / 1.80

    def s(self, v):
        return tuple(c * self.k for c in v)

    def base(self, bob=0.0, drop=None):
        k = self.k
        d = (self.drop if drop is None else drop) + bob
        return Pose(
            hips={"offset": (0, 0, -d * k), "turn": (0, self.hips_yaw, 0)},
            spine=(self.chest_pitch * 0.5, (self.hips_yaw + self.chest_yaw) / 2, 0),
            chest=(self.chest_pitch, self.chest_yaw, 0),
            neck=(0, self.chest_yaw / 2, 0),
            head=(-4, -4, 0),
            shoulder_L=(self.chest_pitch, self.chest_yaw, 0),
            shoulder_R=(self.chest_pitch, self.chest_yaw, 0),
            foot_L={"pos": self.s((*self.lead_foot, 0.09)), "turn": (0, self.lead_foot_yaw, 0)},
            foot_R={"pos": self.s((*self.rear_foot, 0.09)), "turn": (0, self.rear_foot_yaw, 0)},
            toe_L=(0, self.lead_foot_yaw, 0),
            toe_R=(0, self.rear_foot_yaw, 0),
            hand_L={"pos": self.s(self.lead_hand[:2] + (self.lead_hand[2] - bob * 0.6,)), "aim": self.lead_aim, "hint": (0, 1, 0)},
            hand_R={"pos": self.s(self.rear_hand[:2] + (self.rear_hand[2] - bob * 0.6,)), "aim": self.rear_aim, "hint": (0, 1, 0)},
            shapes={"fist_L": self.guard_fist, "fist_R": self.guard_fist},
        )

    def crouch(self, bob=0.0):
        k = self.k
        p = self.crouch_pitch
        return self.base().but(
            hips={"offset": (0, 0.06 * k, -(self.crouch_drop + bob) * k), "turn": (p * 0.25, self.hips_yaw, 0)},
            spine=(p * 0.7, -28, 0),
            chest=(p, -30, 0),
            neck=(p * 0.3, -15, 0),
            head=(-20, -4, 0),
            shoulder_L=(p, -30, 0),
            shoulder_R=(p, -30, 0),
            foot_L={"pos": self.s((0.14, 0.24, 0.09)), "turn": (0, -15, 0)},
            foot_R={"pos": self.s((-0.18, -0.16, 0.09)), "turn": (0, -45, 0)},
            hand_L={"pos": self.s((0.08, 0.42, 1.36 - self.crouch_drop - bob)), "aim": (-0.1, 0.6, 0.8), "hint": (0, 1, 0)},
            hand_R={"pos": self.s((-0.06, 0.26, 1.42 - self.crouch_drop - bob)), "aim": (0.2, 0.5, 0.85), "hint": (0, 1, 0)},
        )

    def air(self):
        """Tucked in the air: knees up (the air hurtbox starts at 0.2 m)."""
        k = self.k
        return self.base(drop=0).but(
            foot_L={"pos": self.s((0.11, 0.18, 0.36)), "turn": (20, -15, 0)},
            foot_R={"pos": self.s((-0.12, -0.05, 0.30)), "turn": (20, -40, 0)},
            knee_L=self.s((0.11, 0.8, 0.9)),
            knee_R=self.s((-0.12, 0.7, 0.85)),
            hips={"offset": (0, 0, 0.0), "turn": (-5, self.hips_yaw, 0)},
        )

    def win(self, t=0):
        """Victory: the lead fist up (t moves it a little, so the hold breathes)."""
        return self.base(drop=0.02).but(
            hand_L={"pos": self.s((0.18, 0.1, 2.02 - 0.03 * t)), "aim": (0.1, 0.1, 1), "hint": (0, 1, 0)},
            hand_R={"pos": self.s((-0.2, 0.05, 0.95)), "aim": (-0.1, 0.1, -1)},
            chest=(-6, -10, 0), head=(-12, 0, 0))

    def intro(self, t=0):
        """The round intro: rolls the shoulders, then squares up."""
        return self.base(drop=0.03).but(chest=(4 + 6 * t, -10 - 20 * t, 0), head=(-6, 10 - 10 * t, 0))

    def win_2(self, base):
        """The second victory (keys over 120 frames): the rear fist up instead.
        Fighters override it with something of their own."""
        up = self.base(drop=0.02).but(
            hand_R={"pos": self.s((-0.16, 0.1, 2.0)), "aim": (-0.1, 0.1, 1), "hint": (0, 1, 0)},
            hand_L={"pos": self.s((0.2, 0.05, 0.95)), "aim": (0.1, 0.1, -1)},
            chest=(-6, -16, 0), head=(-12, 0, 0)).shaped(win=1.0)
        return [(1, base), (20, up), (120, up)]

    def intro_2(self, relaxed, base):
        """The second round intro (keys over 90 frames, in stance by 80): a
        stretch of the neck to each side. Fighters override it."""
        return [(1, relaxed), (25, relaxed.but(head=(0, 0, 20))), (45, relaxed.but(head=(0, 0, -20))), (62, self.intro(1)), (80, base), (90, base)]

    def td_windup(self):
        """Technical Difficulties: a huge wind-up (seen in the first 20 frames)."""
        return self.base(drop=self.drop + 0.05).but(
            chest=(-10, 40, 0), hips={"offset": (0, -0.1 * self.k, -(self.drop + 0.05) * self.k), "turn": (0, 10, 0)},
            hand_R={"pos": self.s((-0.3, -0.35, 1.6)), "aim": (-0.3, -0.5, 0.8)})

    def finish(self):
        """…and the finishing pose (the last 20 frames)."""
        return self.base(drop=self.drop + 0.08).but(
            chest=(20, -70, 0), hips={"offset": (0, 0.2 * self.k, -(self.drop + 0.08) * self.k), "turn": (8, -45, 0)},
            hand_R={"pos": self.s((-0.05, 0.7, 1.3)), "aim": (0, 1, 0)})

    def dazed(self, t):
        """Out on their feet (t: 0…1 round the sway): slumped, guard gone,
        swaying side to side with the head lolling the other way, the knees
        buckling twice a sway and catching, the arms hanging limp, the jaw
        slack. Pitiful (step 16 C)."""
        k, sw, up = self.k, math.sin(2 * math.pi * t), math.cos(2 * math.pi * t)
        buckle = math.sin(2 * math.pi * t * 2) ** 8  # a sudden dip at the end of each swing
        d = self.drop * 0.6 + 0.05 * buckle
        lean = (16 + 4 * buckle, self.chest_yaw * 0.5, 10 * sw)
        sag = (24, self.chest_yaw * 0.5, 10 * sw)  # the shoulders rolled forward
        return self.base(drop=d).but(
            hips={"offset": (0.05 * k * sw, -0.04 * k, -(d + 0.015 * (1 - up)) * k), "turn": (-8, self.hips_yaw + 6 * sw, -5 * sw)},
            spine=(6, (self.hips_yaw + self.chest_yaw * 0.5) / 2, 6 * sw), chest=lean, shoulder_L=sag, shoulder_R=sag,
            neck=(18, 0, -12 * sw), head=(28 + 8 * up - 10 * buckle, 12 * sw, -26 * sw),
            hand_L={"pos": self.s((0.2 + 0.03 * sw, 0.08, 0.8 + 0.03 * sw)), "aim": (0.15, 0.15, -1)},
            hand_R={"pos": self.s((-0.2 + 0.03 * sw, 0.02, 0.78 - 0.03 * sw)), "aim": (-0.15, 0.1, -1)},
            knee_L=self.s((self.lead_foot[0] - 0.04, 0.8, 0.5)), knee_R=self.s((self.rear_foot[0] + 0.04, 0.7, 0.5)),
        ).shaped(hurt=0.75, ko=0.45 + 0.25 * buckle, jaw=0.75 + 0.2 * buckle, fist_L=0.0, fist_R=0.0, open_L=0.25, open_R=0.25)

    # The audience's benches stand this high over the step the feet rest on
    # (lib/audience.py RISE); the root is on the seat, under the pelvis.
    bench = 0.42

    def sit_audience(self, t):
        """Beaten, in the studio audience (t: 0…1 round the loop; step 24 B):
        sitting on a bench, hands on knees, slumped, staring at the fight,
        swaying very slightly. The root is on the seat, so the hips drop onto
        it and the feet reach down to the step (a short fighter's dangle)."""
        k, sw, up = self.k, math.sin(2 * math.pi * t), math.cos(2 * math.pi * t)
        lean = (26 + 2 * up, 2 * sw, 0)
        return self.base(drop=0).but(
            hips={"offset": (0.008 * k * sw, -0.03 * k, -0.85 * k), "turn": (0, 0, 1.5 * sw)},
            spine=(14, sw, 0), chest=lean, shoulder_L=(32 + 2 * up, 2 * sw, 0), shoulder_R=(32 + 2 * up, 2 * sw, 0),
            neck=(10, 0, 0), head=(-6 + 2 * up, 3 * sw, -2 * sw),
            foot_L={"pos": (0.15 * k, 0.48 * k, -self.bench + 0.09 * k), "turn": (0, 4, 0)},
            foot_R={"pos": (-0.15 * k, 0.46 * k, -self.bench + 0.09 * k), "turn": (0, -4, 0)},
            toe_L=(0, 4, 0), toe_R=(0, -4, 0),
            knee_L=self.s((0.17, 0.9, 0.2)), knee_R=self.s((-0.17, 0.9, 0.2)),
            hand_L={"pos": self.s((0.16, 0.36, 0.16)), "aim": (0.05, 0.45, -1)},
            hand_R={"pos": self.s((-0.16, 0.35, 0.16)), "aim": (-0.05, 0.45, -1)},
        ).shaped(hurt=0.25, jaw=0.15, fist_L=0.0, fist_R=0.0, open_L=0.15, open_R=0.15)

    # Lying back in the air (launched, and the start of ko): the body is
    # posed as if standing, curled, then the root tips it onto its back
    # (head behind) and juggle_shift (fit by fighter.fit_juggle to the
    # juggle hurtbox) slides it into the box. tuck: how far the knees come up.
    tuck = 0.8
    juggle_shift = (0.0, 0.0)
    # Each juggle reaction key pose's own slide into the box (fighter.fit_reactions).
    react_shift = {}

    def aloft(self, spin=0.0):
        df, du = self.juggle_shift
        return shifted(self.aloft_raw(spin), (0, df, du))

    def aloft_raw(self, spin=0.0, pitch=-90.0, tuck=None):
        """The aloft pose before it's slid into the box; `pitch` tips the
        whole body (−90 is flat on the back), `tuck` brings the knees up."""
        k, tk = self.k, self.tuck if tuck is None else tuck
        return self.base(drop=0).but(
            root={"offset": (0, 0, 0), "turn": (pitch, spin, 0)},
            hips={"offset": (0, 0, 0), "turn": (-10, 0, 0)}, spine=(8, 0, 0), chest=(16, 0, 0), neck=(14, 0, 0), head=(20, 0, 0),
            shoulder_L=(16, 0, 0), shoulder_R=(16, 0, 0),
            foot_L={"pos": self.s((0.12, 0.2 + 0.1 * tk, 0.1 + 0.6 * tk)), "turn": (-30, 0, 0)},
            foot_R={"pos": self.s((-0.12, 0.12 + 0.1 * tk, 0.16 + 0.55 * tk)), "turn": (-20, 0, 0)},
            knee_L=self.s((0.14, 0.9, 0.7)), knee_R=self.s((-0.14, 0.9, 0.7)),
            hand_L={"pos": self.s((0.5, 0.18, 1.3)), "aim": (0.8, 0.4, 0.4)}, hand_R={"pos": self.s((-0.5, 0.25, 1.25)), "aim": (-0.8, 0.5, 0.3)},
        ).shaped(hurt=1.0, jaw=0.5, fist_L=0.0, fist_R=0.0, open_L=1.0, open_R=1.0)

    # The juggle reactions (step 16 B): key poses by name, before sliding
    # into the box. They start and end on launched's held pose ("held").
    # Keyed every frame (with each key slid back to the box's middle), so the
    # body turns about its own centre, not its feet.
    # Angles wrapped to ±180 (a pose blend works on the numbers).
    TUMBLE = [(f, (-90 - 360 * (f - 1) / 13 + 180) % 360 - 180) for f in range(2, 15)]
    UNFOLD = (0.25, 0.5, 0.75, 0.9)

    def reaction_poses(self):
        k = self.k
        held = self.aloft_raw(14)
        hurt = {"hurt": 1.0, "jaw": 0.7, "fist_L": 0.0, "fist_R": 0.0, "open_L": 1.0, "open_R": 1.0}
        out = {"held": held}
        # Jolted: snapped further back and folded at the waist, limbs flung.
        out["jolt"] = held.but(
            root={"offset": (0, 0, 0), "turn": (-100, 20, 0)}, spine=(12, 0, 0), chest=(22, 0, 0), neck=(14, 0, 0), head=(24, 0, 0),
            shoulder_L=(22, 0, 0), shoulder_R=(22, 0, 0),
            hand_L={"pos": self.s((0.66, 0.12, 1.28)), "aim": (0.9, 0.1, 0.3)}, hand_R={"pos": self.s((-0.66, 0.14, 1.26)), "aim": (-0.9, 0.1, 0.3)},
            foot_L={"pos": self.s((0.26, 0.3, 0.6)), "turn": (-40, 0, 0)}, foot_R={"pos": self.s((-0.26, 0.32, 0.56)), "turn": (-30, 0, 0)},
            knee_L=self.s((0.26, 0.9, 0.8)), knee_R=self.s((-0.26, 0.9, 0.75))).shaped(**hurt)
        # Tucked into a ball for the tumble: knees to the chest, hands on the shins.
        ball = self.aloft_raw(0, tuck=1.0).but(
            hips={"offset": (0, 0, 0), "turn": (40, 0, 0)}, spine=(74, 0, 0), chest=(104, 0, 0), neck=(140, 0, 0), head=(165, 0, 0),
            shoulder_L=(104, 0, 0), shoulder_R=(104, 0, 0),
            foot_L={"pos": self.s((0.12, 0.3, 0.72)), "turn": (-70, 0, 0)}, foot_R={"pos": self.s((-0.12, 0.28, 0.7)), "turn": (-70, 0, 0)},
            knee_L=self.s((0.13, 0.7, 1.4)), knee_R=self.s((-0.13, 0.7, 1.4)),
            hand_L={"pos": self.s((0.17, 0.36, 1.0)), "aim": (0, 0.1, -1)}, hand_R={"pos": self.s((-0.17, 0.34, 0.98)), "aim": (0, 0.1, -1)}).shaped(**hurt)
        for i, (_, pitch) in enumerate(self.TUMBLE):
            out[f"tumble{i}"] = ball.but(root={"offset": (0, 0, 0), "turn": (pitch, 0, 0)})
        # Opening out of the ball into the held pose, each step re-centred.
        for i, t in enumerate(self.UNFOLD):
            out[f"unfold{i}"] = lerp_pose(out[f"tumble{len(self.TUMBLE) - 1}"], held, t).shaped(**hurt)
        # Driven into the floor: spread flat, back arched.
        out["spread"] = held.but(
            root={"offset": (0, 0, 0), "turn": (-92, 6, 0)}, spine=(-8, 0, 0), chest=(-14, 0, 0), neck=(-10, 0, 0), head=(-16, 0, 0),
            shoulder_L=(-14, 0, 0), shoulder_R=(-14, 0, 0),
            hand_L={"pos": self.s((0.72, -0.05, 1.28)), "aim": (1, -0.2, 0.1)}, hand_R={"pos": self.s((-0.72, -0.05, 1.26)), "aim": (-1, -0.2, 0.1)},
            foot_L={"pos": self.s((0.32, 0.12, 0.55)), "turn": (-30, 0, 0)}, foot_R={"pos": self.s((-0.32, 0.1, 0.56)), "turn": (-30, 0, 0)},
            knee_L=self.s((0.34, 0.8, 0.8)), knee_R=self.s((-0.34, 0.8, 0.8))).shaped(**hurt)
        # Crumpled on impact, then bent up off the floor, knees and arms up.
        out["crumple"] = held.but(
            root={"offset": (0, 0, 0), "turn": (-88, 4, 0)}, spine=(-4, 0, 0), chest=(-8, 0, 0), head=(-10, 0, 0),
            hand_L={"pos": self.s((0.42, 0.0, 1.2)), "aim": (0.6, -0.2, -0.6)}, hand_R={"pos": self.s((-0.42, 0.0, 1.18)), "aim": (-0.6, -0.2, -0.6)},
            foot_L={"pos": self.s((0.18, 0.2, 0.55)), "turn": (-30, 0, 0)}, foot_R={"pos": self.s((-0.18, 0.16, 0.52)), "turn": (-30, 0, 0)},
            knee_L=self.s((0.2, 0.8, 0.8)), knee_R=self.s((-0.2, 0.8, 0.8))).shaped(**{**hurt, "jaw": 0.9})
        out["vee"] = held.but(
            root={"offset": (0, 0, 0), "turn": (-94, 10, 0)}, spine=(18, 0, 0), chest=(30, 0, 0), neck=(16, 0, 0), head=(20, 0, 0),
            shoulder_L=(30, 0, 0), shoulder_R=(30, 0, 0),
            hand_L={"pos": self.s((0.38, 0.5, 1.22)), "aim": (0.3, 0.9, 0.2)}, hand_R={"pos": self.s((-0.38, 0.48, 1.2)), "aim": (-0.3, 0.9, 0.2)},
            foot_L={"pos": self.s((0.14, 0.42, 0.66)), "turn": (-60, 0, 0)}, foot_R={"pos": self.s((-0.14, 0.4, 0.62)), "turn": (-60, 0, 0)},
            knee_L=self.s((0.16, 0.9, 1.0)), knee_R=self.s((-0.16, 0.9, 1.0))).shaped(**hurt)
        # Off the wall (behind, head first): pressed flat to it, arms flung
        # back against it, then peeling forward off it.
        out["splat"] = held.but(
            root={"offset": (0, 0, 0), "turn": (-80, 0, 0)}, spine=(-10, 0, 0), chest=(-18, 0, 0), neck=(-12, 0, 0), head=(-16, 0, 0),
            shoulder_L=(-18, 0, 0), shoulder_R=(-18, 0, 0),
            hand_L={"pos": self.s((0.62, -0.08, 1.5)), "aim": (0.6, -0.3, 0.6)}, hand_R={"pos": self.s((-0.62, -0.08, 1.48)), "aim": (-0.6, -0.3, 0.6)},
            foot_L={"pos": self.s((0.24, 0.16, 0.55)), "turn": (-30, 0, 0)}, foot_R={"pos": self.s((-0.24, 0.14, 0.56)), "turn": (-30, 0, 0)},
            knee_L=self.s((0.26, 0.8, 0.8)), knee_R=self.s((-0.26, 0.8, 0.8))).shaped(**{**hurt, "ko": 0.4})
        out["peel"] = held.but(
            root={"offset": (0, 0, 0), "turn": (-100, 8, 0)}, spine=(22, 0, 0), chest=(34, 0, 0), neck=(16, 0, 0), head=(24, 0, 0),
            shoulder_L=(34, 0, 0), shoulder_R=(34, 0, 0),
            hand_L={"pos": self.s((0.4, 0.4, 1.1)), "aim": (0.4, 0.6, -0.6)}, hand_R={"pos": self.s((-0.4, 0.38, 1.08)), "aim": (-0.4, 0.6, -0.6)}).shaped(**hurt)
        return out

    react_blend = {}

    def reacted(self, name):
        """A reaction key pose fitted to the box (fighter.fit_reactions): blended
        toward the held pose if it had to be, and slid to the box's middle."""
        poses = self.reaction_poses()
        pose = poses[name]
        if name in self.react_blend:
            pose = lerp_pose(pose, poses["held"], self.react_blend[name]).shaped(**pose.parts.get("shapes", {}))
        df, du = self.react_shift.get(name, self.juggle_shift)
        return shifted(pose, (0, df, du))

    def reactions(self):
        """{clip: (frames, [(frame, pose)])}: the five juggle reactions."""
        R = {n: self.reacted(n) for n in self.reaction_poses()}
        held = R["held"]
        tumble = [(f, R[f"tumble{i}"]) for i, (f, _) in enumerate(self.TUMBLE)]
        return {
            "juggle_hit": (12, [(1, held), (3, R["jolt"]), (6, lerp_pose(R["jolt"], held, 0.4)), (12, held)]),
            "relaunch": (20, [(1, held)] + tumble + [(15 + i, R[f"unfold{i}"]) for i in range(len(self.UNFOLD))] + [(20, held)]),
            "slam": (8, [(1, held), (3, R["spread"]), (6, R["spread"]), (8, held)]),
            "floor_bounce": (16, [(1, R["crumple"]), (2, R["crumple"]), (6, R["vee"]), (10, lerp_pose(R["vee"], held, 0.5)), (16, held)]),
            "wall_splat": (20, [(1, R["splat"]), (4, R["splat"]), (10, R["peel"]), (15, lerp_pose(R["peel"], held, 0.6)), (20, held)]),
        }

    # Hit reactions (step 22): how far they go (a multiplier on the angles
    # and reaches), how they ease ((frame, how far back toward the stance);
    # negative overshoots past the peak), how far the head turns on light
    # hits, and shape values kept on through them.
    hit_amount = 1.0
    hit_ease = ((3, 0.0), (6, 0.2), (12, 0.5))
    hit_ease_heavy = ((4, 0.0), (8, 0.0), (18, 0.4))
    hit_ease_gut = ((4, 0.0), (10, 0.0), (18, 0.45))
    hit_turn = 1.0
    hit_shapes = {}
    # hit_crouch sinks this much more than the crouch (reference metres), so
    # leaning back keeps the head in the crouching box (fighter.fit_hit_crouch).
    hit_crouch_drop = 0.0

    def hit_flavour(self, name, pose, base):
        """A fighter's touch on a hit pose (a prop held, a hand thrown out)."""
        return pose

    def hit_raw(self, base, crouch):
        """{name: [key poses]} for the hit reactions at full strength, before
        the fighter's amount: one peak, or stagger's five."""
        k, t = self.k, self.hit_turn
        jolt = {"hurt": 1.0, "jaw": 0.6, "fist_L": 0.0, "fist_R": 0.0, "open_L": 1.0, "open_R": 1.0}
        lf, rf = base.parts["foot_L"], base.parts["foot_R"]
        out = {}
        # The jab to the face: head back and away from the camera, the lead
        # hand flung up open, the rear one dropping.
        out["hit_head"] = added(base, hips={"offset": self.s((0, -0.03, -0.01)), "turn": (-4, 4 * t, 0)},
                                spine=(-5, 5 * t, 0), chest=(-10, 10 * t, 0), neck=(-15, 8 * t, 0), head=(-35, 20 * t, 0)).but(
            hand_L={"pos": self.s((0.24, 0.2, 1.56)), "aim": (0.4, 0.3, 1)},
            hand_R={"pos": self.s((-0.2, 0.06, 1.06)), "aim": (-0.2, 0.2, -1)})
        # The other hook: head toward the camera, the chest the other way, the rear hand up.
        out["hit_head_2"] = added(base, hips={"offset": self.s((0, -0.03, -0.01)), "turn": (-4, -4 * t, 0)},
                                  spine=(-4, -6 * t, 3), chest=(-8, -12 * t, 5), neck=(-12, -8 * t, 0), head=(-30, -20 * t, 6)).but(
            hand_R={"pos": self.s((-0.26, 0.14, 1.58)), "aim": (-0.4, 0.3, 1)},
            hand_L={"pos": self.s((0.22, 0.16, 1.06)), "aim": (0.2, 0.3, -1)})
        # The big one: whipped back, the hips pushed forward under an arched
        # back, the arms flung back and wide (back reads from the camera; the
        # side is its depth), the rear foot sliding back, the lead heel up.
        out["hit_head_heavy"] = added(base, hips={"offset": self.s((0, 0.04, -0.03)), "turn": (-8, 10, 0)},
                                      spine=(-12, 12, 0), chest=(-25, 25, 0), neck=(-25, 10, 0), head=(-50, 30, 0)).but(
            hand_L={"pos": self.s((0.36, -0.34, 1.5)), "aim": (0.4, -0.7, 0.5)},
            hand_R={"pos": self.s((-0.36, -0.4, 1.36)), "aim": (-0.4, -0.7, 0.3)},
            foot_R=moved(rf, self.s((0, -0.15, 0))),
            foot_L=moved(lf, self.s((0, 0, 0.05)), (28, self.lead_foot_yaw, 0))).shaped(jaw=0.8)
        # To the ribs (the lead side): rocked back at the pelvis, folded over
        # it, the lead hand in to the ribs, the knees giving.
        out["hit_body"] = added(base, hips={"offset": self.s((0, -0.05, -0.04)), "turn": (-8, 4 * t, 0)},
                                spine=(4, 8 * t, -4), chest=(10, 12 * t, -6), neck=(6, 4 * t, 0), head=(10, 4 * t, 0)).but(
            hand_L={"pos": self.s((0.2, 0.12, 1.14)), "aim": (-0.5, 0.3, -0.5)},
            hand_R={"pos": self.s((-0.08, 0.24, 1.22)), "aim": (0.3, 0.4, 0.6)})
        out["hit_body_2"] = added(base, hips={"offset": self.s((0, -0.05, -0.04)), "turn": (-8, -4 * t, 0)},
                                  spine=(4, -8 * t, 4), chest=(10, -12 * t, 6), neck=(6, -4 * t, 0), head=(10, -4 * t, 0)).but(
            hand_R={"pos": self.s((-0.2, 0.1, 1.12)), "aim": (0.5, 0.3, -0.5)},
            hand_L={"pos": self.s((0.1, 0.32, 1.2)), "aim": (-0.2, 0.5, 0.6)})
        # Doubled over: both arms clutched to the gut, knees bent, jaw wide.
        out["hit_body_heavy"] = added(base, hips={"offset": self.s((0, -0.07, -0.12)), "turn": (-4, 0, 0)},
                                      spine=(20, 0, 0), chest=(30, 6, 0), neck=(10, 0, 0), head=(20, 0, 0)).but(
            hand_L={"pos": self.s((0.12, 0.24, 0.98)), "aim": (-0.7, 0.3, -0.3)},
            hand_R={"pos": self.s((-0.1, 0.26, 0.96)), "aim": (0.7, 0.3, -0.3)}).shaped(jaw=0.9)
        # The lead leg taken out: the knee buckles, heel up, the hips drop and
        # tip to the lead side, the arms swing out for balance.
        out["hit_legs"] = added(base, hips={"offset": self.s((0.03, -0.02, -0.08)), "turn": (6, 0, -8)},
                                spine=(8, 0, -4), chest=(15, 0, 2), neck=(4, 0, 0), head=(-6, 0, 4)).but(
            foot_L=moved(lf, self.s((0, 0.02, 0.05)), (35, self.lead_foot_yaw, 0)),
            knee_L=self.s((self.lead_foot[0] + 0.05, self.lead_foot[1] + 0.8, 0.6)),
            hand_L={"pos": self.s((0.46, 0.18, 1.2)), "aim": (0.8, 0.3, 0.2)},
            hand_R={"pos": self.s((-0.46, -0.04, 1.28)), "aim": (-0.8, 0.0, 0.3)})
        # Hit crouching: stays down, head and shoulders knocked back, the rear
        # hand dropping to the floor behind to catch the weight.
        cd = self.crouch_drop + self.hit_crouch_drop
        out["hit_crouch"] = added(crouch, hips={"offset": self.s((0, -0.04, -self.hit_crouch_drop)), "turn": (-6, 0, 0)},
                                  spine=(-8, 4, 0), chest=(-20, 8, 0), neck=(-10, 0, 0), head=(-20, 10, 0)).but(
            hand_R={"pos": self.s((-0.24, -0.12, 0.1)), "aim": (0, -0.1, -1)},
            hand_L={"pos": self.s((0.2, 0.3, 1.3 - cd)), "aim": (0.2, 0.3, 0.9)})
        # Reeling: a heavy jolt, two steps back (rear foot, lead foot), torso
        # half turned away, arms loose, head lolling, then wobbling.
        loose = {"hand_L": {"pos": self.s((0.26, 0.06, 0.96)), "aim": (0.3, 0.2, -1)},
                 "hand_R": {"pos": self.s((-0.26, -0.06, 0.92)), "aim": (-0.3, 0.1, -1)}}
        jolted = lerp_pose(base, out["hit_head_heavy"], 0.8)
        back = self.s((0, -0.14, 0))
        reel = added(base, hips={"offset": self.s((0, -0.07, -0.06)), "turn": (-4, 16, 4)},
                     spine=(2, 14, 4), chest=(4, 34, 6), neck=(8, 10, 0), head=(14, 20, -16)).but(**loose)
        r1 = reel.but(foot_R=moved(rf, back))
        r2 = added(reel, hips={"offset": self.s((0, -0.06, 0.0)), "turn": (0, 0, -8)}, chest=(0, 0, -10), head=(4, -4, 30)).but(
            foot_R=moved(rf, back), foot_L=moved(lf, self.s((0, -0.12, 0))))
        sway = added(r2, hips={"offset": self.s((0.03, 0, 0)), "turn": (0, 0, 12)}, chest=(0, 0, 14), head=(0, 0, -36))
        end = added(r2, hips={"offset": self.s((0.0, -0.01, -0.01)), "turn": (-2, 0, 6)}, chest=(4, 0, 6), head=(6, 0, -20))
        reeling = {**jolt, "jaw": 0.5, "ko": 0.3, "open_L": 0.6, "open_R": 0.6}
        out = {n: [p.shaped(**{**jolt, **p.parts.get("shapes", {})})] for n, p in out.items()}
        out["stagger"] = [jolted.shaped(**{**jolt, "jaw": 0.8})] + [p.shaped(**reeling) for p in (r1, r2, sway, end)]
        return {n: [self.hit_flavour(n, p.shaped(**self.hit_shapes), crouch if n == "hit_crouch" else base) for p in poses]
                for n, poses in out.items()}

    def hit_peaks(self, base, crouch):
        """The hit reactions' key poses ({name: [poses]}) at this fighter's amount."""
        return {n: [toward(p, crouch if n == "hit_crouch" else base, 1 - self.hit_amount) for p in poses]
                for n, poses in self.hit_raw(base, crouch).items()}

    def hit_reactions(self, base, crouch):
        """{clip: (frames, [(frame, pose)])}: the nine hit reactions."""
        P = self.hit_peaks(base, crouch)
        out = {}
        for name, frames, ease in (("hit_head", 12, self.hit_ease), ("hit_head_2", 12, self.hit_ease), ("hit_head_heavy", 18, self.hit_ease_heavy),
                                   ("hit_body", 12, self.hit_ease), ("hit_body_2", 12, self.hit_ease), ("hit_body_heavy", 18, self.hit_ease_gut),
                                   ("hit_legs", 12, self.hit_ease), ("hit_crouch", 12, self.hit_ease)):
            b = crouch if name == "hit_crouch" else base
            out[name] = (frames, [(1, b)] + [(f, toward(P[name][0], b, back)) for f, back in ease])
        jolted, r1, r2, sway, end = P["stagger"]
        lift = self.s((0, 0, 0.06))
        out["stagger"] = (30, [(1, base), (4, jolted),
                               (7, lerp_pose(jolted, r1, 0.5).but(foot_R=moved(lerp_pose(jolted, r1, 0.5).parts["foot_R"], lift))),
                               (10, r1), (14, lerp_pose(r1, r2, 0.5).but(foot_L=moved(lerp_pose(r1, r2, 0.5).parts["foot_L"], lift))),
                               (18, r2), (22, sway), (26, lerp_pose(sway, end, 0.6)), (30, end)])
        return out

    def block(self, crouching=False):
        """Forearms up in front of the face (or the body, crouching)."""
        base = self.crouch() if crouching else self.base()
        up = 0.88 if crouching else self.block_up
        return base.but(
            hand_L={"pos": self.s((0.06, 0.24, up)), "aim": (-0.3, 0.2, 1), "hint": (0, 1, 0)},
            hand_R={"pos": self.s((-0.06, 0.2, up + 0.04)), "aim": (0.3, 0.2, 1), "hint": (0, 1, 0)},
            chest=((40 if crouching else 14), self.chest_yaw - 4, 0),
            head=((-8 if crouching else self.block_head), -4, 0),
        ).shaped(fist_L=0.15, fist_R=0.15, open_L=0.3, open_R=0.3)


# ---------------------------------------------------------------- state clips

def state_clips(rig, st, data):
    """Every state clip in the BLENDER-TODO table, from the stance."""
    h, k = st.height, st.k
    out = []

    def clip(name, frames, keys, loop=False):
        c = Clip(rig, name, frames, h, loop=loop)
        for f, pose in keys:
            c.key(f, pose)
        out.append(c.finish())

    base = st.base()
    idle = {1: st.base(st.bob), 31: st.base(0), 61: st.base(st.bob)}
    if st.talk:
        # Chattering away to nobody: the jaw flaps in two bursts.
        for f, v in ((6, 0.0), (9, 0.9), (12, 0.1), (15, 0.7), (18, 0.0), (36, 0.0), (39, 1.0), (43, 0.2), (46, 0.8), (50, 0.0)):
            idle[f] = pose_at(idle, f).shaped(jaw=v)
    clip("idle", 60, sorted(idle.items()), loop=True)

    # Walks: each foot steps once a cycle; the planted foot slides back at the
    # walk speed, so the feet don't skate. The cycle length is picked to give
    # a fighting-stance stride (BLENDER-TODO lists 40 as a suggestion).
    for name, speed, sign in (("walk_fwd", data["walk"]["fwd"], 1), ("walk_back", data["walk"]["back"], -1)):
        stride = 0.36 * k
        frames = max(12, min(40, round(stride / speed * 60 / 0.55)))
        # Body travel per cycle; a planted foot covers it in 55% of the cycle.
        travel = speed * frames / 60 * 0.55
        lf, rf = st.lead_foot, st.rear_foot

        def feet(t, lift):
            """Both ankles at cycle time t (0…1): each foot swings forward for
            45% of the cycle (the lead first, the rear half a cycle later) and
            is planted, sliding back at the walk speed, for the rest."""

            def pos(foot, phase):
                u = (t - phase) % 1.0
                if u < 0.45:
                    off = -travel / 2 + travel * (u / 0.45)
                    z = 0.09 * k + lift * math.sin(math.pi * u / 0.45) * 0.07 * k
                else:
                    off = travel / 2 - travel * ((u - 0.45) / 0.55)
                    z = 0.09 * k
                return (foot[0] * k, foot[1] * k + sign * off, z)

            return pos(lf, 0.0), pos(rf, 0.5)

        keys = []
        for f in range(1, frames + 2, max(1, frames // 8)):
            t = (f - 1) / frames
            l, r = feet(t, 1)
            bob = 0.015 * abs(math.sin(2 * math.pi * t))
            keys.append((f, st.base(bob).but(
                foot_L={"pos": l, "turn": (0, st.lead_foot_yaw, 0)},
                foot_R={"pos": r, "turn": (0, st.rear_foot_yaw, 0)})))
        if keys[-1][0] != frames + 1:
            l, r = feet(0, 1)
            keys.append((frames + 1, st.base(0).but(foot_L={"pos": l, "turn": (0, st.lead_foot_yaw, 0)}, foot_R={"pos": r, "turn": (0, st.rear_foot_yaw, 0)})))
        clip(name, frames, keys, loop=True)

    crouch = st.crouch()
    clip("crouch", 6, [(1, base), (6, crouch)])
    clip("crouch_idle", 40, [(1, st.crouch(0.01)), (21, crouch), (41, st.crouch(0.01))], loop=True)
    clip("block_stand", 4, [(1, base), (4, st.block())])
    clip("block_crouch", 4, [(1, crouch), (4, st.block(True))])
    squat = st.base(drop=st.drop + 0.12)
    clip("prejump", 3, [(1, base), (3, squat)])
    air = st.air()
    clip("jump_up", 6, [(1, squat.but(hips={"offset": (0, 0, 0), "turn": (0, st.hips_yaw, 0)})), (6, air)])
    fall = st.air().but(foot_L={"pos": st.s((0.12, 0.16, 0.12)), "turn": (0, -15, 0)}, foot_R={"pos": st.s((-0.14, -0.12, 0.1)), "turn": (0, -45, 0)})
    clip("jump_fall", 8, [(1, air), (8, fall)])
    clip("land", 2, [(1, squat), (2, base)])
    clip("land_attack", 4, [(1, squat), (4, base)])

    # Dashes and Tape Skip step at their speed (the game moves the fighter).
    lean_in = base.but(hips={"offset": (0, 0.12 * k, -st.drop * k), "turn": (8, st.hips_yaw, 0)}, chest=(18, st.chest_yaw, 0))
    lean_back = base.but(hips={"offset": (0, -0.1 * k, -(st.drop + 0.04) * k), "turn": (-8, st.hips_yaw, 0)}, chest=(-6, st.chest_yaw, 0))
    skim = base.but(hips={"offset": (0, 0.16 * k, -(st.drop + 0.08) * k), "turn": (14, st.hips_yaw, 0)}, chest=(28, st.chest_yaw, 0), head=(-14, -4, 0))
    for name, d, sign, pose in (("dash", data["dash"], 1, lean_in), ("backdash", data["backdash"], -1, lean_back), ("tape_skip", data["tapeSkip"], 1, skim)):
        n = d["frames"]
        keys = {1: base, 3: pose, n - 2: pose, n: base}
        step_through(keys, [{"frames": (1, n), "vx": sign * d["speed"]}], k, span=0.6)
        clip(name, n, sorted(keys.items()))

    # Hits snap the head and body back (or double them over) in 3 frames,
    # then ease off; the game holds the clip for as long as the stun lasts.
    hit_high = base.but(hips={"offset": (0, -0.1 * k, -(st.drop + 0.02) * k), "turn": (-10, st.hips_yaw + 6, 0)}, spine=(-14, st.hips_yaw, 0),
                        chest=(-26, st.chest_yaw + 14, 0), neck=(-22, 0, 0), head=(-42, 16, 0), shoulder_L=(-26, st.chest_yaw + 14, 0), shoulder_R=(-26, st.chest_yaw + 14, 0),
                        hand_L={"pos": st.s((0.2, 0.12, 1.2)), "aim": (0.3, 0.4, -0.6)}, hand_R={"pos": st.s((-0.2, 0.0, 1.22)), "aim": (-0.3, 0.3, -0.7)})
    hit_low = base.but(hips={"offset": (0, -0.08 * k, -(st.drop + 0.1) * k), "turn": (16, st.hips_yaw, 0)}, spine=(24, st.hips_yaw, 0), chest=(42, st.chest_yaw, 0),
                       neck=(20, 0, 0), head=(22, 0, 0),
                       hand_L={"pos": st.s((0.06, 0.25, 0.98)), "aim": (0, 0.2, -1)}, hand_R={"pos": st.s((-0.04, 0.22, 1.0)), "aim": (0, 0.2, -1)})
    # Hands thrown open and splayed, the jaw knocked open.
    jolt = {"hurt": 1.0, "jaw": 0.6, "fist_L": 0.0, "fist_R": 0.0, "open_L": 1.0, "open_R": 1.0}
    hit_high = hit_high.shaped(**jolt)
    hit_low = hit_low.shaped(**jolt)
    for name, pose in (("hit_high", hit_high), ("hit_low", hit_low)):
        clip(name, 12, [(1, base), (3, pose), (6, lerp_pose(pose, base, 0.15).shaped(**{**jolt, "jaw": 0.4})),
                        (12, lerp_pose(pose, base, 0.45).shaped(**{**jolt, "jaw": 0.2, "open_L": 0.6, "open_R": 0.6}))])
    # By where and how hard (step 22); the game falls back to the two above.
    for name, (frames, keys) in st.hit_reactions(base, st.crouch()).items():
        clip(name, frames, keys)

    # Lying on the back, head away from the opponent. The body frame is turned
    # by the root, so the limbs below are as if standing.
    flat = base.but(
        root={"offset": (0, 0.85 * k, 0.12 * k), "turn": (-90, 0, 0)},
        hips={"offset": (0, 0, 0), "turn": (0, 0, 0)}, spine=(0, 0, 0), chest=(0, 0, 0), neck=(0, 0, 0), head=(10, 0, 0),
        shoulder_L=(0, 0, 0), shoulder_R=(0, 0, 0),
        foot_L={"pos": st.s((0.16, 0.05, 0.12)), "turn": (0, 0, 0)}, foot_R={"pos": st.s((-0.2, 0.1, 0.2)), "turn": (0, 0, 0)},
        knee_L=st.s((0.16, 0.3, 1.0)), knee_R=st.s((-0.2, 0.4, 0.9)),
        hand_L={"pos": st.s((0.42, 0.05, 1.05)), "aim": (0.5, 0, -1)}, hand_R={"pos": st.s((-0.42, 0.05, 1.1)), "aim": (-0.5, 0, -1)},
    )
    # Launched: tipped flat on the back by frame 6, inside the juggle
    # hurtbox, then held there turning slowly (the game holds the last frame).
    clip("launched", 40, [(1, hit_high), (6, st.aloft()), (40, st.aloft(14))])
    # The juggle reactions (step 16 B): each from and back to launched's held pose.
    for name, (frames, keys) in st.reactions().items():
        clip(name, frames, keys)
    flat = flat.shaped(hurt=0.7, jaw=0.3, fist_L=0.1, fist_R=0.1, open_L=0.5, open_R=0.5)
    clip("down", 30, [(1, flat), (30, flat.but(head=(4, 6, 0)))])
    sit = base.but(root={"offset": (0, 0.1 * k, 0), "turn": (-25, 0, 0)}, hips={"offset": (0, 0, -0.5 * k), "turn": (0, 0, 0)},
                   chest=(15, 0, 0), foot_L={"pos": st.s((0.15, 0.3, 0.09))}, foot_R={"pos": st.s((-0.18, 0.15, 0.09))},
                   hand_L={"pos": st.s((0.3, -0.25, 0.45)), "aim": (0, -0.2, -1)}, hand_R={"pos": st.s((-0.3, -0.25, 0.45)), "aim": (0, -0.2, -1)})
    # Getup ends on idle's first frame: the game goes straight to idle after it.
    clip("getup", 20, [(1, flat), (8, sit.shaped(hurt=0.4)), (14, crouch), (20, st.base(st.bob))])
    lifted = base.but(root={"offset": (0, 0.25 * k, 0.45 * k), "turn": (20, 0, 0)}, chest=(-10, 0, 0), head=(-20, 0, 0),
                      foot_L={"pos": st.s((0.1, 0.0, 0.1)), "turn": (40, 0, 0)}, foot_R={"pos": st.s((-0.1, -0.05, 0.15)), "turn": (40, 0, 0)})
    over = base.but(root={"offset": (0, 0.2 * k, 1.2 * k), "turn": (-150, 0, 0)}, chest=(-20, 0, 0))
    lifted, over = lifted.shaped(hurt=1.0), over.shaped(hurt=1.0)
    clip("thrown", 24, [(1, hit_high), (6, lifted), (12, over), (18, flat.but(root={"offset": (0, 0.7 * k, 0.4 * k), "turn": (-110, 0, 0)})), (24, flat)])
    out_cold = flat.shaped(ko=1.0, hurt=0.0, jaw=0.7, fist_L=0.2, fist_R=0.2, open_L=0.0, open_R=0.0)
    # A K.O. falls through the launched pose (the same space), lands and bounces.
    clip("ko", 90, [(1, hit_high), (6, st.aloft()), (14, st.aloft(8).shaped(ko=0.4)), (24, out_cold),
                    (29, out_cold.but(root={"offset": (0, 0.85 * k, 0.18 * k), "turn": (-94, 0, 0)})), (34, out_cold), (90, out_cold)])
    clip("dazed", 60, [(1 + round(7.5 * i), st.dazed(i / 8)) for i in range(9)], loop=True)
    # Beaten, in the studio audience (step 24 B): seated on the empty the stage gives.
    clip("sit_audience", 60, [(1 + 15 * i, st.sit_audience(i / 4)) for i in range(5)], loop=True)
    # Picking up the stage's prop and hurling it (Feel the Burn's boombox):
    # grab it low by 4, overhead by 6, let go forward on 8 (the game launches
    # it then), follow through and back to stance.
    grab = base.but(hips={"offset": (0, -0.04 * k, -(st.drop + 0.22) * k), "turn": (40, st.hips_yaw * 0.5, 0)},
                    spine=(50, 0, 0), chest=(72, -6, 0), shoulder_L=(72, -6, 0), shoulder_R=(72, -6, 0), neck=(-20, 0, 0), head=(-30, 0, 0),
                    hand_L={"pos": st.s((0.14, 0.58, 0.22)), "aim": (0.2, 0.6, -0.8)}, hand_R={"pos": st.s((-0.14, 0.58, 0.22)), "aim": (-0.2, 0.6, -0.8)})
    overhead = base.but(hips={"offset": (0, -0.06 * k, -(st.drop * 0.5) * k), "turn": (-8, st.hips_yaw * 0.5, 0)},
                        spine=(-8, 0, 0), chest=(-16, -4, 0), shoulder_L=(-16, -4, 0), shoulder_R=(-16, -4, 0), head=(-14, 0, 0),
                        hand_L={"pos": st.s((0.16, -0.12, 2.0)), "aim": (0.1, -0.3, 1)}, hand_R={"pos": st.s((-0.16, -0.12, 2.0)), "aim": (-0.1, -0.3, 1)})
    release = base.but(hips={"offset": (0, 0.14 * k, -(st.drop + 0.04) * k), "turn": (14, st.hips_yaw * 0.5, 0)},
                       spine=(16, 0, 0), chest=(28, -6, 0), shoulder_L=(28, -6, 0), shoulder_R=(28, -6, 0), head=(-6, 0, 0),
                       hand_L={"pos": st.s((0.14, 0.62, 1.55)), "aim": (0.1, 1, 0.2)}, hand_R={"pos": st.s((-0.14, 0.62, 1.55)), "aim": (-0.1, 1, 0.2)})
    through = release.but(chest=(40, -6, 0), shoulder_L=(40, -6, 0), shoulder_R=(40, -6, 0),
                          hand_L={"pos": st.s((0.16, 0.55, 0.95)), "aim": (0.1, 0.6, -0.8)}, hand_R={"pos": st.s((-0.16, 0.55, 0.95)), "aim": (-0.1, 0.6, -0.8)})
    grab, overhead = (q.shaped(fist_L=0.5, fist_R=0.5, jaw=0.3) for q in (grab, overhead))
    release, through = (q.shaped(fist_L=0.0, fist_R=0.0, open_L=0.7, open_R=0.7, jaw=0.8) for q in (release, through))
    clip("interact_throw", 22, [(1, base), (4, grab), (5, grab), (6, overhead), (8, release), (13, through), (22, base)])
    win = [(1, base), (20, st.win().shaped(win=1.0)), (100, st.win(1).shaped(win=1.0)), (120, st.win(1).shaped(win=1.0))]
    clip("win", 120, talking(win, 26, 70, 1))
    relaxed = base.but(hips={"offset": (0, 0, 0), "turn": (0, -10, 0)}, spine=(0, -10, 0), chest=(0, -10, 0), neck=(0, 0, 0), head=(0, 0, 0),
                       shoulder_L=(0, -10, 0), shoulder_R=(0, -10, 0),
                       foot_L={"pos": st.s((0.11, 0.03, 0.09)), "turn": (0, -10, 0)}, foot_R={"pos": st.s((-0.11, -0.03, 0.09)), "turn": (0, -10, 0)},
                       hand_L={"pos": st.s((0.24, 0.02, 0.86)), "aim": (0.1, 0.05, -1)}, hand_R={"pos": st.s((-0.24, 0.02, 0.86)), "aim": (-0.1, 0.05, -1)})
    clip("intro", 90, talking([(1, relaxed), (30, st.intro()), (60, st.intro(1)), (80, base), (90, base)], 6, 40, 2))
    # Second versions, for variety: the game alternates them by round.
    clip("win_2", 120, talking(st.win_2(base), 30, 76, 3))
    clip("intro_2", 90, talking(st.intro_2(relaxed, base), 8, 30, 4))
    clip("td_cinematic", 150, [(1, base), (20, st.td_windup()), (130, st.td_windup()), (140, st.finish()), (150, st.finish())])
    return out


# ---------------------------------------------------------------- move clips

def limb_for(move_id, spec):
    if "limb" in spec:
        return spec["limb"]
    for tok in reversed(move_id.replace(".", " ").split()):
        if tok in BUTTON_LIMB:
            return BUTTON_LIMB[tok]
    return "hand.R"


def base_for(st, move):
    return {"crouch": st.crouch(), "air": st.air()}.get(move["stance"], st.base())


class Fitter:
    """Builds strike poses and fits them to hitboxes by evaluating the rig."""

    def __init__(self, rig, st):
        self.rig, self.st = rig, st
        self.problems = []

    def strike(self, base, limb, target, lunge, overhead=False, chop=False, extra=0.0):
        st, k = self.st, self.st.k
        hand = limb.startswith("hand")
        lead = limb.endswith(".L")
        tx, ty = target
        hips = dict(base.parts.get("hips", {}))
        off = hips.get("offset", (0, 0, 0))
        parts = {}
        if hand:
            yaw = (-60 if lead else 15) if tx >= 0 else 60
            parts["hips"] = {"offset": (off[0], off[1] + lunge, off[2]), "turn": (4 + (8 if chop else 0), st.hips_yaw - (12 if lead else -8), 0)}
            parts["spine"] = (6, (st.hips_yaw + yaw) / 2, 0)
            parts["chest"] = (10 + (10 if overhead else 0) + (8 if chop else 0), yaw, 0)
            parts["shoulder_L"] = parts["shoulder_R"] = (10, yaw, 0)
            side = (0.12 if lead else -0.12) * k
            if chop:
                # A hammer fist: the hand comes down onto the target from above.
                aim = (0.0, 0.57, -0.82)
            else:
                shoulder = (side, 0.12 * k + lunge, 1.38 * k + off[2])
                d = (side * 0.3 - shoulder[0], tx - shoulder[1], ty - shoulder[2])
                n = math.sqrt(sum(c * c for c in d)) or 1
                aim = tuple(c / n for c in d)
            reach = 0.167 * k * 0.85 + extra
            wrist = (side * 0.3 - aim[0] * reach, tx - aim[1] * reach, ty - aim[2] * reach)
            parts[f"hand_{limb[-1]}"] = {"pos": wrist, "aim": aim, "hint": (0, 0, 1) if abs(aim[2]) < 0.8 else (0, 1, 0)}
            parts["shapes"] = {**base.parts.get("shapes", {}), f"fist_{limb[-1]}": 1.0}
        else:
            back = tx < 0
            if ty > 0.5 * k or back:
                # High kicks lean away from the kick (back kicks lean in); low ones keep the base lean.
                parts["hips"] = {"offset": (off[0], off[1] + lunge, off[2] + 0.03 * k), "turn": (-14 if not back else 20, st.hips_yaw, 0)}
                parts["chest"] = (-12 if not back else 30, st.chest_yaw, 0)
            else:
                parts["hips"] = {**hips, "offset": (off[0], off[1] + lunge, off[2])}
            sx = (0.1 if lead else -0.1) * k
            hip = (sx, lunge, 0.88 * k + off[2])
            d = (0.0, tx - hip[1], ty - hip[2])
            n = math.sqrt(sum(c * c for c in d)) or 1
            aim = tuple(c / n for c in d)
            reach = 0.21 * k * 0.9
            ankle = (sx, tx - aim[1] * reach, max(0.05 * k, ty - aim[2] * reach))
            parts[f"foot_{limb[-1]}"] = {"pos": ankle, "aim": aim, "hint": (0, -aim[2], aim[1]) if abs(aim[2]) < 0.95 else (0, 1, 0)}
            parts[f"knee_{limb[-1]}"] = (sx, tx + 0.6 * (1 if not back else -1), 0.9 * k)
            parts[f"toe_{limb[-1]}"] = (0, 0, 0)
        return base.but(**parts)

    def fit(self, base, limb, box, overhead=False, label="", report=True, ty=None, chop=False, extra=0.0, tx=None):
        """The strike pose whose limb tip (or held prop's tip, `extra` past
        the hand) lands inside box (x0, x1, y0, y1), aiming at tx, ty if
        given (else 62% of the way out, and the middle of the box)."""
        x0, x1, y0, y1 = box
        k = self.st.k
        far = x1 if x1 > 0 or x0 >= 0 else x0
        near = x0 if far == x1 else x1
        tx = near + (far - near) * 0.62 if tx is None else tx
        ty = min(max((y0 + y1) / 2, y0 + 0.08), y1 - 0.08) if ty is None else ty
        lunge = 0.0
        sign = 1 if far > 0 else -1
        best = None
        for _ in range(12):
            pose = self.strike(base, limb, (tx, ty), lunge, overhead, chop, extra)
            apply_pose(self.rig, pose, self.st.height)
            _, fx, fy = tip_point(self.rig, limb, extra)
            inside = x0 - TOL + 0.01 <= fx <= x1 + TOL - 0.01 and y0 - TOL + 0.01 <= fy <= y1 + TOL - 0.01
            if inside:
                return pose
            best = pose
            # Short of the box: lunge further (up to 0.35 m) and reach further; past it: pull the target in.
            short = fx < x0 if sign > 0 else fx > x1
            if short:
                lunge += sign * min(0.08 * k, abs(near - fx) + 0.03)
                lunge = max(-0.35 * k, min(0.35 * k, lunge))
                tx += sign * 0.05
            elif fx > x1 or fx < x0:
                tx -= (fx - (x1 if fx > x1 else x0)) * 1.2
            if fy < y0:
                ty += (y0 - fy) + 0.03
            elif fy > y1:
                ty -= (fy - y1) + 0.03
        if report:
            self.problems.append(f"{label}: {limb} can't reach x {x0}…{x1}, y {y0}…{y1}")
        return best

    def place(self, pose, limb, target, tries=24):
        """The pose with the limb moved so its tip lands at target (fwd, up):
        the wrist or ankle for a hand or foot, the ankle for a knee (the
        shin follows), the hips for a shoulder (the hands and feet stay
        put). For hand-keyed strikes; the build's check still has the last
        word."""
        kind, s = limb.split(".")
        if kind == "knee":
            return self.knee(pose, s, target)
        for _ in range(tries):
            apply_pose(self.rig, pose, self.st.height)
            _, fx, fy = tip_point(self.rig, limb)
            d = (0.0, target[0] - fx, target[1] - fy)
            if abs(d[1]) < 0.003 and abs(d[2]) < 0.003:
                break
            if kind == "shoulder":
                hips = pose.parts.get("hips", {})
                pose = pose.but(hips={**hips, "offset": tuple(a + b for a, b in zip(hips.get("offset", (0, 0, 0)), d))})
            else:
                key = f"{'hand' if kind == 'hand' else 'foot'}_{s}"
                pose = pose.but(**{key: moved(pose.parts[key], d)})
        return pose

    def knee(self, pose, s, target, shin=(-0.3, -0.95)):
        """The pose with the knee driven up to target (fwd, up): the thigh
        reaches it from the hip (the hips slid forward or back until it
        can), the shin hangs from it along `shin` (fwd, up)."""
        rig = self.rig
        for _ in range(4):
            apply_pose(rig, pose, self.st.height)
            hip, knee, ankle = (Vector(point(rig, b, "head")) for b in (f"thigh.{s}", f"shin.{s}", f"foot.{s}"))
            a, b = (knee - hip).length, (ankle - knee).length
            # Where the hip must be for the thigh to reach the target.
            up = max(-a * 0.95, min(a * 0.95, target[1] - hip.z))
            d = (0.0, target[0] - math.sqrt(a * a - up * up) - hip.y, target[1] - up - hip.z)
            if abs(d[1]) < 0.003 and abs(d[2]) < 0.003:
                break
            hips = pose.parts.get("hips", {})
            pose = pose.but(hips={**hips, "offset": tuple(p + q for p, q in zip(hips.get("offset", (0, 0, 0)), d))})
        n = math.hypot(*shin)
        foot = dict(pose.parts.get(f"foot_{s}", {}))
        foot["pos"] = (hip.x, target[0] + b * shin[0] / n, target[1] + b * shin[1] / n)
        return pose.but(**{f"foot_{s}": foot, f"knee_{s}": (hip.x, target[0] + 0.6, target[1] + 0.2)})

    def chamber(self, base, limb, overhead=False, low=False, high=False):
        """The limb drawn back before a strike; `high` raises it above the
        head for an overhead (a hand) or into an axe kick (a foot)."""
        st, k = self.st, self.st.k
        s = limb[-1]
        zoff = base.parts.get("hips", {}).get("offset", (0, 0, 0))[2]
        if limb.startswith("hand"):
            side = 0.1 if s == "L" else -0.08
            if high:
                return base.but(**{f"hand_{s}": {"pos": (side * 1.4 * k, -0.04 * k, 2.02 * k + zoff), "aim": (0, -0.15, 1), "hint": (0, 1, 0)}},
                                chest=(-6, st.chest_yaw, 0), head=(-10, -4, 0)).shaped(**{f"fist_{s}": 1.0})
            pos = (side * k, 0.08 * k, (1.9 if overhead else 1.32) * k + zoff)
            return base.but(**{f"hand_{s}": {"pos": pos, "aim": (0, 0.2, 1) if overhead else (0, 0.6, 0.8), "hint": (0, 1, 0)}}).shaped(**{f"fist_{s}": 1.0})
        sx = 0.1 if s == "L" else -0.1
        if high:
            return base.but(**{f"foot_{s}": {"pos": (sx * k, 0.3 * k, 1.42 * k), "aim": (0, 0.35, 1), "hint": (0, -1, 0.3)},
                               f"knee_{s}": (sx * k, 0.9 * k, 1.6 * k), f"toe_{s}": (0, 0, 0)},
                            hips={"offset": (0, -0.05 * k, -st.drop * k + 0.03 * k), "turn": (-20, st.hips_yaw, 0)}, chest=(-16, st.chest_yaw, 0))
        return base.but(**{f"foot_{s}": {"pos": (sx * k, (0.18 if not low else 0.08) * k, (0.5 if not low else 0.2) * k), "turn": (35, 0, 0)}})

    def raised(self, base, limb):
        """Just before an overhead lands: still high, starting forward."""
        st, k = self.st, self.st.k
        s = limb[-1]
        if limb.startswith("hand"):
            side = 0.08 if s == "L" else -0.08
            zoff = base.parts.get("hips", {}).get("offset", (0, 0, 0))[2]
            return base.but(**{f"hand_{s}": {"pos": (side * k, 0.24 * k, 1.98 * k + zoff), "aim": (0, 0.55, 0.85), "hint": (0, 1, 0)}},
                            chest=(-2, st.chest_yaw, 0)).shaped(**{f"fist_{s}": 1.0})
        sx = 0.1 if s == "L" else -0.1
        return self.chamber(base, limb, high=True).but(**{f"foot_{s}": {"pos": (sx * k, 0.5 * k, 1.45 * k), "aim": (0, 0.8, 0.6), "hint": (0, -0.6, 0.8)}})


def move_clips(rig, st, data, overrides, skip=frozenset()):
    """One clip per move in the data. overrides[move id] tunes a move: limb,
    alt (limbs taking turns on multi-hit moves), prop (a weapon or effect
    makes the hit, so the limb only points at it), style (hop, spin,
    teleport, knock, grapevine, rising, braced, yank, prompter, live), chop (every
    hit comes down from overhead, like an overhead: a pound, a cleaver
    chop), palm (strikes with an open hand), keys (a function (st, base, mv)
    giving [(frame, pose)] that replaces the generated keys over its frames:
    hand-keyed poses for a move people watch; given a fourth argument, it
    gets the Fitter, for Fitter.place), tx / ty (where to aim the
    strike), held ({key, limb, reach, show}: a prop shown by shape key `key`
    over frames show, whose tip, `reach` metres past the hand, makes the hit),
    step ("beat": a move that travels takes one step on the beat instead of
    walking), glide (it travels without stepping: a slide).
    The limb can also be a knee (knee.L) or a shoulder (shoulder.L).
    Moves in `skip` (their art is owed: ART_PENDING) get no clip."""
    fitter = Fitter(rig, st)
    strikes = {}
    out = []
    k = st.k
    for mid, mv in data["moves"].items():
        if mid in skip:
            continue
        spec = overrides.get(mid, overrides.get(mid.rstrip("+"), {}))
        total = mv["total"]
        base = base_for(st, mv)
        c = Clip(rig, mid, total, st.height)
        keys = {1: base}
        limb = limb_for(mid, spec)
        style = spec.get("style")
        checks = []
        motion = mv["motion"]
        moving_until = max((m["frames"][1] for m in motion), default=0)

        def at(f, pose):
            if 1 <= f <= total:
                keys[f] = pose

        hits = mv["hits"]
        if style == "teleport":
            # Yanked up on the strings (off screen over the hidden frames), then
            # lowered back in: on the floor, in stance, 2 frames after.
            h0, h1 = mv.get("hidden")
            arms_up = base.but(hand_L={"pos": st.s((0.2, 0.05, 1.7)), "aim": (0.2, 0, 1)}, hand_R={"pos": st.s((-0.2, 0.05, 1.7)), "aim": (-0.2, 0, 1)})
            at(max(2, h0 - 3), arms_up.but(root={"offset": (0, 0, 0.1 * k)}))
            at(h0, arms_up.but(root={"offset": (0, 0, 1.2 * k)}))
            at(h0 + 2, arms_up.but(root={"offset": (0, 0, 4.0)}))
            at(h1, arms_up.but(root={"offset": (0, 0, 4.0)}))
            at(h1 + 1, arms_up.but(root={"offset": (0, 0, 0.45 * k)}))
            at(h1 + 2, base)
        if mv.get("throw"):
            f0, f1 = mv["throw"]["frames"]
            if mv["kind"] == "throw":
                reach = max(0.45, mv["throw"]["range"] - 0.45)
                grab = base.but(hips={"offset": (0, min(0.3, reach - 0.45) * k, -st.drop * k), "turn": (12, st.hips_yaw + 15, 0)}, chest=(20, -10, 0),
                                hand_L={"pos": (0.1 * k, reach, 1.15 * k), "aim": (0, 1, 0.1)}, hand_R={"pos": (-0.1 * k, reach - 0.05, 1.2 * k), "aim": (0, 1, 0.1)})
                reaching = grab.shaped(fist_L=0.0, fist_R=0.0, open_L=0.6, open_R=0.6)
                grab = grab.shaped(fist_L=0.6, fist_R=0.6, jaw=0.3)
                at(max(2, f0 - 3), lerp_pose(base, reaching, 0.5).shaped(**reaching.parts["shapes"]))
                at(f0, grab)
                at(f1, grab)
                heave = grab.but(hips={"offset": (0, 0.05 * k, -0.02 * k), "turn": (-10, st.hips_yaw - 30, 0)}, chest=(-20, -60, 0),
                                 hand_L={"pos": st.s((0.15, 0.1, 1.9)), "aim": (0, -0.3, 1)}, hand_R={"pos": st.s((-0.15, 0.1, 1.9)), "aim": (0, -0.3, 1)})
                at(f1 + max(3, (total - f1) // 3), heave)
                at(f1 + max(6, 2 * (total - f1) // 3), lerp_pose(heave, base, 0.5))
            else:
                # A command grab (the catch plays as `throw`): both hands reach
                # forward at chest height; a whiff over-reaches and is slow back.
                reach = mv["throw"]["range"] - 0.35
                lunge = min(0.35, reach - 0.5)
                grab = base.but(hips={"offset": (0, lunge, -st.drop * k), "turn": (14, st.hips_yaw + 25, 0)}, spine=(10, -5, 0), chest=(22, -8, 0),
                                shoulder_L=(20, -8, 0), shoulder_R=(20, -8, 0), head=(-6, 0, 0),
                                hand_L={"pos": (0.12 * k, reach, 1.22 * k), "aim": (0, 1, 0.05), "hint": (0, 0, 1)},
                                hand_R={"pos": (-0.12 * k, reach - 0.04, 1.2 * k), "aim": (0, 1, 0.05), "hint": (0, 0, 1)})
                wind = base.but(hips={"offset": (0, -0.05 * k, -(st.drop + 0.04) * k), "turn": (4, st.hips_yaw + 10, 0)}, chest=(6, -20, 0),
                                hand_L={"pos": st.s((0.25, 0.15, 1.3)), "aim": (0.3, 0.6, 0.5)}, hand_R={"pos": st.s((-0.25, 0.1, 1.3)), "aim": (-0.3, 0.6, 0.5)})
                over = grab.but(hips={"offset": (0, lunge + 0.12 * k, -(st.drop + 0.1) * k), "turn": (26, st.hips_yaw + 25, 0)}, spine=(22, -5, 0), chest=(40, -8, 0),
                                head=(10, 0, 0), hand_L={"pos": (0.16 * k, reach + 0.22, 0.98 * k), "aim": (0, 0.8, -0.4)},
                                hand_R={"pos": (-0.16 * k, reach + 0.16, 0.95 * k), "aim": (0, 0.8, -0.4)},
                                foot_R={"pos": st.s((-0.12, 0.02, 0.09)), "turn": (0, st.rear_foot_yaw, 0)})
                # Hands open as they reach, closing on the catch; a whiff
                # grabs at nothing and stays open.
                wind = wind.shaped(fist_L=0.0, fist_R=0.0, open_L=0.8, open_R=0.8)
                grab = grab.shaped(fist_L=0.55, fist_R=0.55, jaw=0.4)
                over = over.shaped(fist_L=0.3, fist_R=0.3, open_L=0.3, open_R=0.3, jaw=0.6)
                at(max(2, f0 - 5), wind)
                at(f0, grab)
                at(f1, grab)
                at(f1 + 6, over)
                at(f1 + 16, over.but(head=(16, 0, 0)))
                at(f1 + 28, lerp_pose(over, base, 0.55))
        if mv.get("interact"):
            f = mv.get("interact")
            pose = fitter.strike(base, "foot.L", (0.6 * k, 0.25 * k), 0.05)
            at(max(2, f - 4), fitter.chamber(base, "foot.L", low=True))
            at(f, pose)
            at(min(total - 1, f + 5), lerp_pose(pose, base, 0.5))
        for sp in mv["spawns"]:
            f = sp["frame"]
            x, y = sp["at"]
            if mv.get("decoy"):
                # Set down on the floor in front: bent low, both hands down.
                pose = base.but(hips={"offset": (0, 0.12 * k, -(st.drop + 0.12) * k), "turn": (24, st.hips_yaw + 10, 0)}, spine=(30, -10, 0), chest=(42, -10, 0),
                                hand_L={"pos": (0.12 * k, 0.55 * k, 0.5 * k), "aim": (0, 0.5, -1)}, hand_R={"pos": (-0.06 * k, 0.6 * k, 0.45 * k), "aim": (0, 0.5, -1)})
                at(f, pose)
                at(min(total - 1, f + 5), pose)
                continue
            if style == "live":
                # "We go live": turned to the camera (her right), the rear hand
                # pointing at it, two fingers out.
                pose = base.but(chest=(-2, -60, 0), shoulder_L=(-2, -60, 0), shoulder_R=(-2, -60, 0), head=(-4, -50, 0),
                                hand_R={"pos": st.s((-0.34, 0.26, 1.48)), "aim": (-0.85, 0.45, 0.2), "hint": (0, 0, 1)}).shaped(fist_R=1.0, point_R=1.0, jaw=0.7)
                at(max(2, f - 8), lerp_pose(base, pose, 0.5).shaped(fist_R=1.0, point_R=1.0))
                at(f, pose)
                at(min(total - 1, f + 10), pose.shaped(jaw=0.0))
                continue
            if y > 1.5:  # calling something down from above
                pose = base.but(hand_L={"pos": st.s((0.15, 0.15, 1.95)), "aim": (0.1, 0.2, 1)}, hand_R={"pos": st.s((-0.12, 0.05, 1.9)), "aim": (-0.1, 0.2, 1)}, chest=(-8, st.chest_yaw, 0), head=(-25, 0, 0))
            else:  # pushing it out in front
                hy = max(0.6, min(1.3, y + 0.8)) * k
                pose = base.but(hips={"offset": (0, 0.1 * k, -st.drop * k), "turn": (10, st.hips_yaw + 10, 0)}, chest=(20, -15, 0),
                                hand_L={"pos": (0.12 * k, 0.55 * k, hy), "aim": (0, 1, 0.3), "hint": (0, 0, 1)}, hand_R={"pos": (-0.08 * k, 0.5 * k, hy + 0.05), "aim": (0, 1, 0.3), "hint": (0, 0, 1)})
            at(max(2, f - 6), lerp_pose(base, pose, 0.3).but(hand_L={"pos": st.s((0.12, 0.05, 1.2)), "aim": (0, 0.3, 1)}))
            at(f, pose)
            at(min(total - 1, f + 6), pose)
        if style == "hop":
            # A jumping jack into the air, the hands clapped together over the
            # head, then chopping down onto the target as he lands.
            h0 = hits[0]["frames"][0] if hits else total // 2
            star = base.but(root={"offset": (0, 0, 0.35 * k)}, hand_L={"pos": st.s((0.5, 0.05, 1.75)), "aim": (0.6, 0, 0.8)}, hand_R={"pos": st.s((-0.5, 0.05, 1.75)), "aim": (-0.6, 0, 0.8)},
                            foot_L={"pos": st.s((0.3, 0.1, 0.12)), "turn": (0, 0, 0)}, foot_R={"pos": st.s((-0.3, -0.05, 0.12)), "turn": (0, 0, 0)})
            clap = star.but(root={"offset": (0, 0, 0.25 * k)}, hand_L={"pos": st.s((0.06, 0.08, 2.0)), "aim": (0, 0.1, 1), "hint": (0, 1, 0)},
                            hand_R={"pos": st.s((-0.06, 0.08, 2.0)), "aim": (0, 0.1, 1), "hint": (0, 1, 0)}, chest=(-8, st.chest_yaw, 0),
                            foot_L={"pos": st.s((0.14, 0.2, 0.14)), "turn": (0, -15, 0)}, foot_R={"pos": st.s((-0.15, -0.15, 0.14)), "turn": (0, -45, 0)})
            at(3, st.base(drop=st.drop + 0.1))
            at(max(4, h0 - 8), star)
            at(max(5, h0 - 3), clap)
        if style == "grapevine":
            # The aerobics side-step along the floor: low, feet close, the
            # rear foot crossing behind the lead and the lead stepping out.
            m0, m1 = motion[0]["frames"]
            low = st.base(drop=st.drop + 0.05).but(
                foot_L={"pos": st.s((st.lead_foot[0], 0.05, 0.09)), "turn": (0, -30, 0)},
                foot_R={"pos": st.s((st.rear_foot[0] - 0.06, -0.05, 0.09)), "turn": (0, -40, 0)},
                hand_L={"pos": st.s((0.3, 0.2, 1.3)), "aim": (0.6, 0.4, 0.6)}, hand_R={"pos": st.s((-0.3, 0.0, 1.32)), "aim": (-0.6, 0.2, 0.7)})
            for i, f in enumerate(range(m0 + 1, m1, 4)):
                at(f, low.but(chest=(4, st.chest_yaw + (14 if i % 2 else -14), 0), hips={"offset": (0, 0, -(st.drop + 0.05) * k), "turn": (0, st.hips_yaw + (8 if i % 2 else -8), 0)}))
            at(m1, low)
        if style == "knock":
            # Knock-knock: a lean back and two big knocks on an invisible door
            # (frames 4 and 16, with the sounds), a huge wind-up, then the swing low.
            h0 = hits[0]["frames"][0]
            lean = base.but(hips={"offset": (0, -0.06 * k, -st.drop * k), "turn": (-10, st.hips_yaw + 10, 0)}, spine=(-10, -10, 0), chest=(-22, -5, 0),
                            shoulder_L=(-22, -5, 0), shoulder_R=(-22, -5, 0), head=(-14, 10, 0),
                            hand_L={"pos": st.s((0.2, 0.0, 0.98)), "aim": (0.3, 0.2, -1)})
            door = lean.but(hand_R={"pos": st.s((-0.06, 0.52, 1.66)), "aim": (0, 1, 0.1), "hint": (0, 0, 1)})
            pull = lean.but(hand_R={"pos": st.s((-0.06, 0.22, 1.78)), "aim": (0, 0.45, 0.9), "hint": (0, 1, 0)})
            door, pull = door.shaped(fist_R=1.0, jaw=1.0), pull.shaped(fist_R=1.0)
            for f, pose in ((2, pull), (4, door), (7, pull), (13, pull), (16, door), (19, pull)):
                at(f, pose)
            windup = lean.but(hips={"offset": (0, -0.12 * k, -(st.drop + 0.04) * k), "turn": (-14, st.hips_yaw + 35, 0)}, chest=(-28, 40, 0),
                              shoulder_L=(-28, 40, 0), shoulder_R=(-28, 40, 0),
                              hand_R={"pos": st.s((-0.25, -0.3, 1.9)), "aim": (-0.2, -0.5, 0.8), "hint": (0, 1, 0)})
            at(max(20, h0 - 7), windup)
            at(h0 - 2, windup.but(chest=(-24, 46, 0)))
        if style == "braced":
            # Armoured: squared up and dug in behind the forearms through the
            # armour, then the heavy kick chambers on its last frames.
            a1 = mv["armor"][1]
            brace = st.base(drop=st.drop + 0.1).but(
                hips={"offset": (0, -0.04 * k, -(st.drop + 0.1) * k), "turn": (8, st.hips_yaw + 12, 0)}, spine=(12, -12, 0), chest=(20, -10, 0),
                shoulder_L=(20, -10, 0), shoulder_R=(20, -10, 0), head=(10, -4, 0),
                hand_L={"pos": st.s((0.06, 0.3, 1.36)), "aim": (-0.4, 0.2, 1), "hint": (0, 1, 0)},
                hand_R={"pos": st.s((-0.04, 0.26, 1.42)), "aim": (0.4, 0.2, 1), "hint": (0, 1, 0)}).shaped(fist_L=1.0, fist_R=1.0)
            at(4, brace)
            at(a1 - 4, brace.but(chest=(24, -14, 0), hips={"offset": (0, -0.06 * k, -(st.drop + 0.12) * k), "turn": (10, st.hips_yaw + 16, 0)}))
        if style == "yank":
            # Reaches up the strings for the control bar, grabs one and yanks
            # it down to the shoulder; the strike then whips it out.
            reach = base.but(hand_L={"pos": st.s((0.08, 0.06, 1.95)), "aim": (0, 0.1, 1), "hint": (0, 1, 0)}, chest=(-10, st.chest_yaw, 0), head=(-24, -4, 0))
            at(4, reach.shaped(fist_L=0.2))
            at(7, reach.shaped(fist_L=1.0))
            at(10, base.but(hips={"offset": (0, -0.05 * k, -(st.drop + 0.06) * k), "turn": (4, st.hips_yaw + 10, 0)},
                            hand_L={"pos": st.s((0.06, -0.1, 1.42)), "aim": (0, -0.3, 1), "hint": (0, 1, 0)}).shaped(fist_L=1.0))
        if style == "prompter":
            # A counter stance: standing tall and still, the lead hand raised
            # palm out, eyes on something just off screen (toward the
            # camera), held through the counter window.
            c0, c1 = mv["counter"]["frames"]
            tall = base.but(hips={"offset": (0, -0.02 * k, -st.drop * 0.3 * k), "turn": (-4, st.hips_yaw * 0.6, 0)}, spine=(-2, -14, 0),
                            chest=(-6, -16, 0), shoulder_L=(-6, -16, 0), shoulder_R=(-6, -16, 0), neck=(0, -10, 0), head=(-6, -34, 0),
                            hand_L={"pos": st.s((0.12, 0.34, 1.56)), "aim": (0, 0.3, 1), "hint": (0, 1, 0)},
                            hand_R={"pos": st.s((-0.12, 0.12, 1.12)), "aim": (-0.2, 0.3, -1)}).shaped(fist_L=0.0, open_L=0.5, fist_R=0.4)
            at(max(2, c0 - 4), lerp_pose(base, tall, 0.6).shaped(**tall.parts["shapes"]))
            at(c0, tall)
            at(c1, tall.but(head=(-4, -26, 0)))
        if style == "rising":
            # A rising uppercut: coil low, then drive up through the box onto
            # the toes; the arm stays high through the recovery.
            at(max(2, hits[0]["frames"][0] - 2), st.base(drop=st.drop + 0.16).but(
                chest=(24, st.chest_yaw, 0), hand_L={"pos": st.s((0.12, 0.22, 0.98)), "aim": (0, 0.3, 1), "hint": (0, 1, 0)}))

        # The hits.
        alt = spec.get("alt")
        held = spec.get("held")
        prev_end = None
        opening = None  # (frame, pose, chamber, chop) of the first strike, for rhythm()
        for i, hit in enumerate(hits):
            f0, f1 = hit["frames"]
            lb = alt[i % len(alt)] if alt else limb
            over = hit["height"] == "overhead" and lb.startswith("hand")
            # On the ground an overhead must read as one: raised high, chopping down.
            chop = (hit["height"] == "overhead" and mv["stance"] != "air" and style != "spin") or spec.get("chop", False)
            low = hit["box"][3] < 0.5
            x0, x1, y0, y1 = hit["box"]
            label = f"{mid} hit {i + 1}"
            report = not spec.get("prop")
            # A hand-keyed move replaces the fit; the check still applies.
            fitter_report = report and not spec.get("keys")
            extra = held["reach"] if held and held["limb"] == lb else 0.0
            aim = {"extra": extra, "tx": spec.get("tx")}
            if style == "spin":
                pose = end = spin_pose(st, base, i)
                checks.append(((f0, f1), ["hand.L", "hand.R"], hit["box"], 0.0))
            elif style == "rising":
                tiptoe = {"foot_L": {"pos": st.s((st.lead_foot[0], st.lead_foot[1], 0.1)), "turn": (40, st.lead_foot_yaw, 0)},
                          "foot_R": {"pos": st.s((st.rear_foot[0], st.rear_foot[1], 0.1)), "turn": (40, st.rear_foot_yaw, 0)}}
                pose = fitter.fit(base, lb, hit["box"], over, label, fitter_report, ty=y0 + 0.35 * (y1 - y0), **aim)
                end = fitter.fit(base.but(root={"offset": (0, 0, 0.06 * k)}, **tiptoe), lb, hit["box"], over, label, fitter_report, ty=y1 - 0.12, **aim)
                checks.append(((f0, f1), [lb], hit["box"], extra))
            elif chop:
                pose = fitter.fit(base, lb, hit["box"], over, label, fitter_report, ty=y1 - 0.08, chop=lb.startswith("hand"), **aim)
                end = fitter.fit(base, lb, hit["box"], over, label, fitter_report, ty=y0 + 0.35 * (y1 - y0), chop=lb.startswith("hand"), **aim)
                if report:
                    checks.append(((f0, f1), [lb], hit["box"], extra))
            else:
                pose = end = fitter.fit(base, lb, hit["box"], over, label, fitter_report, ty=spec.get("ty"), **aim)
                if report:
                    checks.append(((f0, f1), [lb], hit["box"], extra))
            if spec.get("palm"):
                side = lb[-1]
                pose, end = (q.shaped(**{f"fist_{side}": 0.0, f"open_{side}": 0.5}) for q in (pose, end))
            if prev_end is None and style == "hop":
                pass  # the hop is its own wind-up
            elif prev_end is None:
                ch = max(2, round(f0 * (0.42 if chop else 0.55)))
                if style in ("braced", "yank"):
                    ch = f0 - 3
                if moving_until and moving_until < f0 and lb.startswith("foot"):
                    ch = max(ch, min(f0 - 1, moving_until + 1))  # step first, then chamber the kick
                drawn = fitter.chamber(base, lb, over, low, high=chop)
                opening = (f0, pose, drawn, chop, lb)
                if ch < f0 and ch not in keys:
                    at(ch, drawn)
                if chop and f0 - ch >= 4:
                    at(f0 - 2, fitter.raised(base, lb))
            elif f0 - prev_end >= 2:
                at((prev_end + f0) // 2, lerp_pose(keys.get(prev_end, base), fitter.chamber(base, lb, over, low, high=chop), 0.6))
            at(f0, pose)
            at(f1, end)
            prev_end = f1
        if prev_end:
            rec = total - prev_end
            if style == "rising":
                high = end.but(root={"offset": (0, 0, 0)}, foot_L=base.parts["foot_L"], foot_R=base.parts["foot_R"])
                at(prev_end + max(2, round(rec * 0.3)), high)
                at(prev_end + max(3, round(rec * 0.65)), lerp_pose(high, base, 0.5))
            elif rec > 3 and prev_end + max(1, round(rec * 0.35)) not in keys:
                at(prev_end + max(1, round(rec * 0.35)), lerp_pose(keys[prev_end], base, 0.55))
        keys[total] = base
        # Each fighter's rhythm on the plain strikes (step 25 A).
        anticipation = None
        if opening and style is None and not (mv["spawns"] or mv.get("throw") or mv.get("interact")):
            anticipation = rhythm(keys, st, base, opening, (prev_end, end), total, mv["stance"])
        # The moves people watch get the showcase: specials (boosted ones
        # bigger), the launcher and the string enders.
        ender = " " in mid and not any(o.startswith(mid + " ") for o in data["moves"])
        if ((mv["kind"] in ("special", "super") and mid != "td") or mid == "c.BP" or ender) and style not in ("teleport", "spin", "hop", "knock"):
            spans = [h["frames"] for h in hits] + [(s["frame"], s["frame"]) for s in mv["spawns"]]
            if mv.get("throw"):
                spans.append(tuple(mv["throw"]["frames"]))
            if spans:
                first = (alt[0] if alt else limb) if hits else None
                boosted = mid.endswith("+") or "(" in mid
                showcase(keys, st, base, min(a for a, _ in spans), max(b for _, b in spans), total, first, 1.6 if boosted else 1.0,
                         {alt[i % len(alt)] if alt else limb for i in range(len(hits))}, anticipation)
        if spec.get("keys"):
            fn = spec["keys"]
            custom = fn(st, base, mv, fitter) if len(inspect.signature(fn).parameters) > 3 else fn(st, base, mv)
            lo, hi = min(f for f, _ in custom), max(f for f, _ in custom)
            for f in [f for f in keys if lo <= f <= hi]:
                del keys[f]
            for f, pose in custom:
                at(f, pose)

        if held:
            # The prop pops out (and away) over one frame.
            a, b = held["show"]
            for f in (a - 1, a, b, b + 1):
                if 1 <= f <= total and f not in keys:
                    keys[f] = pose_at(keys, f)
            for f in keys:
                keys[f] = keys[f].shaped(**{held["key"]: 1.0 if a <= f <= b else 0.0})

        # Moves that travel step at their speed (the game moves the fighter).
        if motion and not spec.get("glide"):
            alt = spec.get("alt")
            kicks = []  # (foot side, first frame, last frame) a kicking foot is left to the clip
            for i, h in enumerate(hits):
                lb = alt[i % len(alt)] if alt else limb
                if lb.startswith(("foot", "knee")):
                    kicks.append((lb[-1], h["frames"][0] - 3, h["frames"][1] + 3))

            def free(f, s, pose):
                return off_floor(pose, k) or any(s == side and a <= f <= b for side, a, b in kicks)

            step_through(keys, motion, k, free, span=0.7 if style == "grapevine" else 0.5, walk=beat if spec.get("step") == "beat" else gait)

        if mv["kind"] in ("special", "super"):
            shout(keys, mv, total)
        for f in sorted(keys):
            c.key(f, keys[f])
        out.append(c.finish())
        strikes[mid] = checks
    return out, strikes, fitter.problems


def rhythm(keys, st, base, opening, closing, total, stance):
    """A fighter's timing on a plain strike (step 25 A; Stance.windup, snap,
    follow, settle): rekeys the startup before the first strike and the
    recovery after the last, never the active frames, so every strike check
    still holds. Returns the frame of the drawn-back key (for showcase's
    coil), if it keyed one."""
    f0, strike, chamber, chop, limb = opening
    f1, end = closing
    k = st.k
    drawn_at = None
    if st.windup and not chop and f0 >= 5:
        draw, a, b = st.windup
        span = f0 - 1
        frames, power = st.snap or (1, 1.0)
        hold = f0 - frames  # the drawn pose is held until the snap starts
        b_f = max(2, min(round(1 + b * span), hold))
        a_f = min(round(1 + a * span), b_f - 1)
        drawn = toward(chamber, base, 1 - draw)
        if draw > 1:
            # A big draw loads the body up behind it: back, down, turned away.
            g = (draw - 1) * 2
            sign = 1 if limb.endswith(".L") else -1
            drawn = added(drawn, hips={"offset": (0, -0.05 * k * g, -0.025 * k * g), "turn": (0, 8 * g * sign, 0)},
                          spine=(0, 6 * g * sign, 0), chest=(-4 * g, 12 * g * sign, 0), head=(4 * g, -6 * g * sign, 0))
        for f in [f for f in keys if 1 < f < f0]:
            del keys[f]
        if a_f > 1:
            keys[a_f] = base
        keys[b_f] = drawn
        drawn_at = b_f
        if hold > b_f:
            keys[hold] = toward(drawn, base, -0.06)  # still creeping back
        for i in range(1, frames):
            f = f0 - i
            if f > b_f and f != hold:
                keys[f] = lerp_pose(keys[hold], strike, (1 - i / frames) ** power)
    if st.follow and f1 and total - f1 >= 6:
        carry, hold = st.follow
        aloft = stance == "air"
        for f in [f for f in keys if f1 < f < total]:
            del keys[f]
        # Carried past the strike: the hips through and onto the front foot.
        carried = added(end, hips={"offset": (0, 0.07 * k * carry, (0 if aloft else -0.035) * k * carry), "turn": (6 * carry, 0, 0)},
                        chest=(8 * carry, 0, 0), head=(4 * carry, 0, 0))
        fc = min(total - 3, f1 + (2 if carry >= 0.5 else 1))
        keys[fc] = carried
        fh = min(total - 2, fc + hold)
        if fh > fc:
            keys[fh] = added(carried, hips={"offset": (0, 0.01 * k * carry, (0 if aloft else -0.01) * k * carry)})
        rec = total - fh
        fm = fh + max(1, round(rec * 0.4))
        keys[fm] = lerp_pose(carried, base, 0.65)
        fs = total - max(2, round(rec * 0.25))
        if st.settle and rec >= 8 and fs > fm:
            if st.settle > 0:
                keys[fs] = toward(end, base, 1 + st.settle)  # sprung back past the stance
            elif not aloft:
                d = -st.settle
                keys[fs] = added(base, hips={"offset": (0, 0, -0.035 * k * d)}, spine=(3 * d, 0, 0), chest=(5 * d, 0, 0))
    return drawn_at


def showcase(keys, st, base, b0, b1, total, limb, g, strikers=(), anticipation=None):
    """The moves people watch (specials, the launcher, string enders, step
    16 C): the key before the business (b0…b1) coils further back, the body
    stretches into it over the business (the free arm thrown back, the rear
    heel up) without moving the striking limb, then overshoots past it and
    follows through for longer. g: how much (boosted versions go bigger);
    strikers: every limb that hits in the move, left where the fit put it;
    anticipation: the key to coil (rhythm()'s drawn pose), else the last before b0.
    Only the striking limb is checked against the hitbox, on the active
    frames, so the rest of the body is free."""
    k = st.k
    lead = limb is None or limb.endswith(".L")
    sign = 1 if lead else -1
    hand = limb is not None and limb.startswith("hand")
    # Anticipation: wound up away from the strike, lower and back.
    pre = [f for f in keys if 1 < f < b0]
    f = anticipation or (max(pre) if pre else (b0 - 4 if b0 - 4 >= 2 else None))
    if f is not None:
        keys[f] = added(pose_at(keys, f), hips={"offset": (0, -0.05 * k * g, -0.03 * k * g), "turn": (0, 8 * g * sign, 0)},
                        spine=(0, 8 * g * sign, 0), chest=(-4 * g, 14 * g * sign, 0), head=(6 * g, -8 * g * sign, 0))
    # The stretch: the free arm thrown back (both, for a kick), the rear heel up.
    for f in [f for f in keys if b0 <= f <= b1]:
        p = keys[f]
        # Shoulder height wherever the hips are (crouched, or in the air).
        z = p.parts.get("hips", {}).get("offset", (0, 0, 0))[2]
        parts = {}
        if limb is not None:  # a spawn or a grab has both hands at the business
            if (not hand or limb.endswith(".L")) and "hand.R" not in strikers:
                parts["hand_R"] = {"pos": (-(0.22 + 0.04 * g) * k, -(0.12 + 0.1 * g) * k, 1.24 * k + z), "aim": (-0.4, -0.6, 0.2)}
            if (not hand or limb.endswith(".R")) and "hand.L" not in strikers:
                parts["hand_L"] = {"pos": ((0.24 + 0.04 * g) * k, -(0.08 + 0.1 * g) * k, 1.26 * k + z), "aim": (0.4, -0.6, 0.2)}
        rear = p.parts.get("foot_R")
        if hand and rear and "pos" in rear and "aim" not in rear and z > -0.2 * k and "foot.R" not in strikers:
            parts["foot_R"] = moved(rear, (0, 0, 0.025 * k * g), (18 * g, rear.get("turn", (0, st.rear_foot_yaw, 0))[1], 0))
        # Boosted: sunk lower and further in over the business (the striking
        # hand or foot is placed in body space, so it stays on the box).
        big = max(0.0, g - 1.0) * 2
        keys[f] = added(p.but(**parts), head=(5 * g, 0, 0), hips={"offset": (0, 0.03 * k * big, -0.05 * k * big), "turn": (4 * big, 0, 0)})
    # Overshoot past the business, then a longer follow-through.
    f = b1 + 2
    if total - b1 >= 10 and not any(b1 < x <= f for x in keys):
        p = keys.get(b1) or pose_at(keys, b1)
        parts = {}
        if limb is not None:
            key = f"{'hand' if hand else 'foot'}_{limb[-1]}"
            if "pos" in p.parts.get(key, {}):
                parts[key] = moved(p.parts[key], (0, 0.07 * k * g, 0))
        over = added(p.but(**parts), hips={"offset": (0, 0.04 * k * g, -0.01 * k)}, chest=(5 * g, 0, 0), head=(4 * g, 0, 0))
        for x in [x for x in keys if f < x < total]:
            del keys[x]
        keys[f] = over
        keys[f + round((total - f) * 0.5)] = lerp_pose(over, base, 0.45)


def shout(keys, mv, total):
    """A special's shout: the jaw open over the move's business (its hits,
    spawns or throw), from a couple of frames before. A counter stance
    waits in silence."""
    frames = [f for h in mv["hits"] for f in h["frames"]] + [sp["frame"] for sp in mv["spawns"]]
    for key in ("throw",):
        if mv.get(key) and mv[key].get("frames"):
            frames += list(mv[key]["frames"])
    if not frames:
        return
    f0, f1 = max(1, min(frames) - 2), min(total, max(frames) + 4)
    for f in (f0 - 2, f0, f1, f1 + 4):
        if 1 <= f <= total and f not in keys:
            keys[f] = pose_at(keys, f)
    for f in list(keys):
        if f0 <= f <= f1:
            keys[f] = keys[f].shaped(jaw=0.85)


def talking(keys, f0, f1, seed):
    """The jaw working over frames f0…f1 (intros and wins: talking to
    camera), as extra keys over the clip's own: a syllable every 3–5 frames."""
    import random

    keys = dict(keys)
    base = sorted(keys.items())
    r = random.Random(seed)
    f = f0
    while f < f1:
        keys[f] = pose_at(dict(base), f).shaped(jaw=0.0)
        f2 = f + r.choice((2, 2, 3))
        if f2 <= f1:
            keys[f2] = pose_at(dict(base), f2).shaped(jaw=r.uniform(0.45, 1.0))
        f = f2 + r.choice((1, 2, 3))
    if f1 not in keys:
        keys[f1] = pose_at(dict(base), f1).shaped(jaw=0.0)
    return sorted(keys.items())


def spin_pose(st, base, i):
    """Arms out, the body turned a quarter more each hit (the lariat)."""
    k = st.k
    yaw = st.hips_yaw + 90 * (i % 4)
    return base.but(hips={"offset": (0, 0, -st.drop * k), "turn": (0, yaw, 0)}, chest=(0, yaw, 0), spine=(0, yaw, 0),
                    shoulder_L=(0, yaw, 0), shoulder_R=(0, yaw, 0),
                    hand_L={"pos": rot((0.6 * k, 0.12 * k, 1.32 * k), yaw), "aim": rot((1, 0.2, 0), yaw)},
                    hand_R={"pos": rot((-0.6 * k, 0.12 * k, 1.32 * k), yaw), "aim": rot((-1, 0.2, 0), yaw)})


def rot(v, yaw):
    """Turn a fighter-space vector by yaw degrees (toward the character's left)."""
    a = math.radians(yaw)
    x, f, u = v
    # Blender x = side, y = -fwd; rotating about Z by a.
    bx, by = x, -f
    rx, ry = bx * math.cos(a) - by * math.sin(a), bx * math.sin(a) + by * math.cos(a)
    return (rx, -ry, u)


def check(rig, actions, strikes):
    """Every listed hit: some limb's tip inside the hitbox on every active frame."""
    problems = []
    by_name = {a.name: a for a in actions}
    for name, checks in strikes.items():
        a = by_name[name]
        rig.animation_data.action = a
        for (f0, f1), limbs, (x0, x1, y0, y1), extra in checks:
            for f in range(f0, f1 + 1):
                bpy.context.scene.frame_set(f)
                tips = [tip_point(rig, lb, extra) for lb in limbs]
                if not any(x0 - TOL <= t[1] <= x1 + TOL and y0 - TOL <= t[2] <= y1 + TOL for t in tips):
                    t = tips[0]
                    problems.append(f"{name} frame {f}: {limbs[0]} tip at x {t[1]:.2f}, y {t[2]:.2f}, outside x {x0}…{x1}, y {y0}…{y1}")
    return problems
