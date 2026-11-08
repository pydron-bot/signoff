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
import json
import math
from pathlib import Path

import bpy

from .rig import Clip, Pose, apply_pose, point

DATA = json.loads((Path(__file__).resolve().parents[1] / "data" / "fighters.json").read_text())
TIP = {"hand.L": "hand.L", "hand.R": "hand.R", "foot.L": "toe.L", "foot.R": "toe.R"}
BUTTON_LIMB = {"FP": "hand.L", "BP": "hand.R", "FK": "foot.L", "BK": "foot.R"}
TOL = 0.04  # how far outside the hitbox a tip may be (m), as in rig.check_strikes


def lerp(a, b, t):
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def lerp_pose(a, b, t):
    """Blend two poses part by part (positions, aims and turns)."""
    out = {}
    for key in set(a.parts) | set(b.parts):
        pa, pb = a.parts.get(key), b.parts.get(key)
        if pa is None or pb is None:
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


def step_through(keys, windows, k, free=lambda f, s, pose: False, span=0.5):
    """Key every frame of each motion window ({frames, vx}) with the feet
    stepping at its speed, over whatever the clip's keys do above them.
    free(frame, "L"/"R", pose) leaves a foot to the clip (a kicking foot, or
    feet off the floor)."""
    new = {}
    for w in windows:
        f0, f1 = w["frames"]
        for f, feet in gait(f0, f1, w["vx"], k, span).items():
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
    # Crouch depth and lean; fighter.build solves crouch_drop so the head
    # tops out at the crouching hurtbox.
    crouch_drop = 0.5
    crouch_pitch = 32

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

    def windup(self):
        """Technical Difficulties: a huge wind-up (seen in the first 20 frames)."""
        return self.base(drop=self.drop + 0.05).but(
            chest=(-10, 40, 0), hips={"offset": (0, -0.1 * self.k, -(self.drop + 0.05) * self.k), "turn": (0, 10, 0)},
            hand_R={"pos": self.s((-0.3, -0.35, 1.6)), "aim": (-0.3, -0.5, 0.8)})

    def finish(self):
        """…and the finishing pose (the last 20 frames)."""
        return self.base(drop=self.drop + 0.08).but(
            chest=(20, -70, 0), hips={"offset": (0, 0.2 * self.k, -(self.drop + 0.08) * self.k), "turn": (8, -45, 0)},
            hand_R={"pos": self.s((-0.05, 0.7, 1.3)), "aim": (0, 1, 0)})

    def block(self, crouching=False):
        """Forearms up in front of the face (or the body, crouching)."""
        base = self.crouch() if crouching else self.base()
        up = 0.88 if crouching else 1.42
        return base.but(
            hand_L={"pos": self.s((0.06, 0.24, up)), "aim": (-0.3, 0.2, 1), "hint": (0, 1, 0)},
            hand_R={"pos": self.s((-0.06, 0.2, up + 0.04)), "aim": (0.3, 0.2, 1), "hint": (0, 1, 0)},
            chest=((40 if crouching else 14), self.chest_yaw - 4, 0),
            head=((-8 if crouching else 6), -4, 0),
        )


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
    clip("idle", 60, [(1, st.base(st.bob)), (31, st.base(0)), (61, st.base(st.bob))], loop=True)

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
    for name, pose in (("hit_high", hit_high), ("hit_low", hit_low)):
        clip(name, 12, [(1, base), (3, pose), (6, lerp_pose(pose, base, 0.15)), (12, lerp_pose(pose, base, 0.45))])

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
    airborne = base.but(root={"offset": (0, -0.2 * k, 0.5 * k), "turn": (-35, 0, 0)}, chest=(-20, 0, 0), head=(-20, 0, 0),
                        foot_L={"pos": st.s((0.1, 0.25, 0.15)), "turn": (30, 0, 0)}, foot_R={"pos": st.s((-0.12, 0.1, 0.25)), "turn": (30, 0, 0)},
                        hand_L={"pos": st.s((0.4, -0.05, 1.5)), "aim": (0.5, -0.3, 1)}, hand_R={"pos": st.s((-0.4, 0.0, 1.55)), "aim": (-0.5, -0.3, 1)})
    clip("launched", 10, [(1, hit_high), (10, airborne)])
    clip("down", 30, [(1, flat), (30, flat.but(head=(4, 6, 0)))])
    sit = base.but(root={"offset": (0, 0.1 * k, 0), "turn": (-25, 0, 0)}, hips={"offset": (0, 0, -0.5 * k), "turn": (0, 0, 0)},
                   chest=(15, 0, 0), foot_L={"pos": st.s((0.15, 0.3, 0.09))}, foot_R={"pos": st.s((-0.18, 0.15, 0.09))},
                   hand_L={"pos": st.s((0.3, -0.25, 0.45)), "aim": (0, -0.2, -1)}, hand_R={"pos": st.s((-0.3, -0.25, 0.45)), "aim": (0, -0.2, -1)})
    # Getup ends on idle's first frame: the game goes straight to idle after it.
    clip("getup", 20, [(1, flat), (8, sit), (14, crouch), (20, st.base(st.bob))])
    lifted = base.but(root={"offset": (0, 0.25 * k, 0.45 * k), "turn": (20, 0, 0)}, chest=(-10, 0, 0), head=(-20, 0, 0),
                      foot_L={"pos": st.s((0.1, 0.0, 0.1)), "turn": (40, 0, 0)}, foot_R={"pos": st.s((-0.1, -0.05, 0.15)), "turn": (40, 0, 0)})
    over = base.but(root={"offset": (0, 0.2 * k, 1.2 * k), "turn": (-150, 0, 0)}, chest=(-20, 0, 0))
    clip("thrown", 24, [(1, hit_high), (6, lifted), (12, over), (18, flat.but(root={"offset": (0, 0.7 * k, 0.4 * k), "turn": (-110, 0, 0)})), (24, flat)])
    stagger = base.but(hips={"offset": (0, -0.15 * k, -0.12 * k), "turn": (-10, st.hips_yaw + 15, 0)}, chest=(-25, 10, 0), head=(-35, 20, 0),
                       hand_L={"pos": st.s((0.35, 0.0, 1.0)), "aim": (0.4, 0, -1)}, hand_R={"pos": st.s((-0.35, -0.05, 1.0)), "aim": (-0.4, 0, -1)})
    kneel = crouch.but(root={"offset": (0, -0.2 * k, 0), "turn": (-20, 0, 0)}, chest=(10, 0, 0), head=(-10, 0, 0))
    clip("ko", 90, [(1, hit_high), (14, stagger), (30, kneel), (44, flat.but(root={"offset": (0, 0.85 * k, 0.2 * k), "turn": (-95, 0, 0)})), (50, flat), (90, flat)])
    clip("win", 120, [(1, base), (20, st.win()), (100, st.win(1)), (120, st.win(1))])
    relaxed = base.but(hips={"offset": (0, 0, 0), "turn": (0, -10, 0)}, spine=(0, -10, 0), chest=(0, -10, 0), neck=(0, 0, 0), head=(0, 0, 0),
                       shoulder_L=(0, -10, 0), shoulder_R=(0, -10, 0),
                       foot_L={"pos": st.s((0.11, 0.03, 0.09)), "turn": (0, -10, 0)}, foot_R={"pos": st.s((-0.11, -0.03, 0.09)), "turn": (0, -10, 0)},
                       hand_L={"pos": st.s((0.24, 0.02, 0.86)), "aim": (0.1, 0.05, -1)}, hand_R={"pos": st.s((-0.24, 0.02, 0.86)), "aim": (-0.1, 0.05, -1)})
    clip("intro", 90, [(1, relaxed), (30, st.intro()), (60, st.intro(1)), (80, base), (90, base)])
    clip("td_cinematic", 150, [(1, base), (20, st.windup()), (130, st.windup()), (140, st.finish()), (150, st.finish())])
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

    def strike(self, base, limb, target, lunge, overhead=False, chop=False):
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
            reach = 0.167 * k * 0.85
            wrist = (side * 0.3 - aim[0] * reach, tx - aim[1] * reach, ty - aim[2] * reach)
            parts[f"hand_{limb[-1]}"] = {"pos": wrist, "aim": aim, "hint": (0, 0, 1) if abs(aim[2]) < 0.8 else (0, 1, 0)}
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

    def fit(self, base, limb, box, overhead=False, label="", report=True, ty=None, chop=False):
        """The strike pose whose limb tip lands inside box (x0, x1, y0, y1),
        aiming at height ty if given (else the middle of the box)."""
        x0, x1, y0, y1 = box
        k = self.st.k
        far = x1 if x1 > 0 or x0 >= 0 else x0
        near = x0 if far == x1 else x1
        tx = near + (far - near) * 0.62
        ty = min(max((y0 + y1) / 2, y0 + 0.08), y1 - 0.08) if ty is None else ty
        lunge = 0.0
        sign = 1 if far > 0 else -1
        tip = TIP[limb]
        best = None
        for _ in range(12):
            pose = self.strike(base, limb, (tx, ty), lunge, overhead, chop)
            apply_pose(self.rig, pose, self.st.height)
            _, fx, fy = point(self.rig, tip)
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
                                chest=(-6, st.chest_yaw, 0), head=(-10, -4, 0))
            pos = (side * k, 0.08 * k, (1.9 if overhead else 1.32) * k + zoff)
            return base.but(**{f"hand_{s}": {"pos": pos, "aim": (0, 0.2, 1) if overhead else (0, 0.6, 0.8), "hint": (0, 1, 0)}})
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
                            chest=(-2, st.chest_yaw, 0))
        sx = 0.1 if s == "L" else -0.1
        return self.chamber(base, limb, high=True).but(**{f"foot_{s}": {"pos": (sx * k, 0.5 * k, 1.45 * k), "aim": (0, 0.8, 0.6), "hint": (0, -0.6, 0.8)}})


def move_clips(rig, st, data, overrides):
    """One clip per move in the data. overrides[move id] tunes a move: limb,
    alt (limbs taking turns on multi-hit moves), prop (a weapon or effect
    makes the hit, so the limb only points at it), style (hop, spin,
    teleport, knock, grapevine, rising)."""
    fitter = Fitter(rig, st)
    strikes = {}
    out = []
    k = st.k
    for mid, mv in data["moves"].items():
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
                at(max(2, f0 - 3), lerp_pose(base, grab, 0.5))
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
            for f, pose in ((2, pull), (4, door), (7, pull), (13, pull), (16, door), (19, pull)):
                at(f, pose)
            windup = lean.but(hips={"offset": (0, -0.12 * k, -(st.drop + 0.04) * k), "turn": (-14, st.hips_yaw + 35, 0)}, chest=(-28, 40, 0),
                              shoulder_L=(-28, 40, 0), shoulder_R=(-28, 40, 0),
                              hand_R={"pos": st.s((-0.25, -0.3, 1.9)), "aim": (-0.2, -0.5, 0.8), "hint": (0, 1, 0)})
            at(max(20, h0 - 7), windup)
            at(h0 - 2, windup.but(chest=(-24, 46, 0)))
        if style == "rising":
            # A rising uppercut: coil low, then drive up through the box onto
            # the toes; the arm stays high through the recovery.
            at(max(2, hits[0]["frames"][0] - 2), st.base(drop=st.drop + 0.16).but(
                chest=(24, st.chest_yaw, 0), hand_L={"pos": st.s((0.12, 0.22, 0.98)), "aim": (0, 0.3, 1), "hint": (0, 1, 0)}))

        # The hits.
        alt = spec.get("alt")
        prev_end = None
        for i, hit in enumerate(hits):
            f0, f1 = hit["frames"]
            lb = alt[i % len(alt)] if alt else limb
            over = hit["height"] == "overhead" and lb.startswith("hand")
            # On the ground an overhead must read as one: raised high, chopping down.
            chop = hit["height"] == "overhead" and mv["stance"] != "air" and style != "spin"
            low = hit["box"][3] < 0.5
            x0, x1, y0, y1 = hit["box"]
            label = f"{mid} hit {i + 1}"
            report = not spec.get("prop")
            if style == "spin":
                pose = end = spin_pose(st, base, i)
                checks.append(((f0, f1), ["hand.L", "hand.R"], hit["box"]))
            elif style == "rising":
                tiptoe = {"foot_L": {"pos": st.s((st.lead_foot[0], st.lead_foot[1], 0.1)), "turn": (40, st.lead_foot_yaw, 0)},
                          "foot_R": {"pos": st.s((st.rear_foot[0], st.rear_foot[1], 0.1)), "turn": (40, st.rear_foot_yaw, 0)}}
                pose = fitter.fit(base, lb, hit["box"], over, label, report, ty=y0 + 0.35 * (y1 - y0))
                end = fitter.fit(base.but(root={"offset": (0, 0, 0.06 * k)}, **tiptoe), lb, hit["box"], over, label, report, ty=y1 - 0.12)
                checks.append(((f0, f1), [lb], hit["box"]))
            elif chop:
                pose = fitter.fit(base, lb, hit["box"], over, label, report, ty=y1 - 0.08, chop=lb.startswith("hand"))
                end = fitter.fit(base, lb, hit["box"], over, label, report, ty=y0 + 0.35 * (y1 - y0), chop=lb.startswith("hand"))
                if report:
                    checks.append(((f0, f1), [lb], hit["box"]))
            else:
                pose = end = fitter.fit(base, lb, hit["box"], over, label, report)
                if report:
                    checks.append(((f0, f1), [lb], hit["box"]))
            if prev_end is None and style == "hop":
                pass  # the hop is its own wind-up
            elif prev_end is None:
                ch = max(2, round(f0 * (0.42 if chop else 0.55)))
                if moving_until and moving_until < f0 and lb.startswith("foot"):
                    ch = max(ch, min(f0 - 1, moving_until + 1))  # step first, then chamber the kick
                if ch < f0 and ch not in keys:
                    at(ch, fitter.chamber(base, lb, over, low, high=chop))
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

        # Moves that travel step at their speed (the game moves the fighter).
        if motion:
            alt = spec.get("alt")
            kicks = []  # (foot side, first frame, last frame) a kicking foot is left to the clip
            for i, h in enumerate(hits):
                lb = alt[i % len(alt)] if alt else limb
                if lb.startswith("foot"):
                    kicks.append((lb[-1], h["frames"][0] - 3, h["frames"][1] + 3))

            def free(f, s, pose):
                return off_floor(pose, k) or any(s == side and a <= f <= b for side, a, b in kicks)

            step_through(keys, motion, k, free, span=0.7 if style == "grapevine" else 0.5)

        for f in sorted(keys):
            c.key(f, keys[f])
        out.append(c.finish())
        strikes[mid] = checks
    return out, strikes, fitter.problems


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
        for (f0, f1), limbs, (x0, x1, y0, y1) in checks:
            for f in range(f0, f1 + 1):
                bpy.context.scene.frame_set(f)
                tips = [point(rig, TIP[lb]) for lb in limbs]
                if not any(x0 - TOL <= t[1] <= x1 + TOL and y0 - TOL <= t[2] <= y1 + TOL for t in tips):
                    t = tips[0]
                    problems.append(f"{name} frame {f}: {limbs[0]} tip at x {t[1]:.2f}, y {t[2]:.2f}, outside x {x0}…{x1}, y {y0}…{y1}")
    return problems
