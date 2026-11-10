"""Hollis Bey, night security guard of the transmitter building: broad,
heavy and tired. A faded, creased grey-blue uniform shirt (SECURITY on the
shoulder, a BEY name tag, a TRANSMITTER SITE badge, a coffee stain) with
epaulettes, pockets and a tie; navy trousers, a duty belt with pouches, the
flashlight and the key ring; a peaked cap, a heavy moustache, stubble,
heavy-lidded eyes, big hands and heavy boots. Grappler: slow, huge throws."""
import numpy as np

from lib import paint as P
from lib.anim import Stance, added, lerp_pose, moved, toward
from lib.body import arms, clump, face_paint, grip, hair_cover, head, head_frame, legs, lerp, lit, mouth, ring, torso

ID = "hollis"
HEIGHT = 1.90
GIRTH = 1.25
HAND = 1.2  # bigger hands than the others

SKIN = (122, 84, 62)
SHIRT = (120, 140, 164)
CREASE = (96, 114, 138)
STAIN = (130, 100, 70)
NAVY = (36, 44, 72)
BELT = (24, 22, 22)
BOOTS = (20, 20, 22)
HAIR = (30, 26, 24)
STUBBLE = (78, 56, 44)
GOLD = (214, 176, 72)
METAL = (150, 152, 158)
PATCH = (32, 40, 70)
TAG = (20, 20, 24)
BEAM = (255, 240, 170)


def costume(p, b):
    k, g = b.k, b.g

    def shirt(t):
        """Faded, creased uniform fabric with a coffee stain on the belly."""
        x, f, u = t.side / (k * g), t.fwd / (k * g), t.up / k
        sh = P.near(t.c, SHIRT)
        c = P.put(t.c, sh, (150, 160, 170), np.clip((u - 1.2) * 0.8, 0, 0.25))  # sun-faded shoulders
        crease = (P.lines(u + 0.6 * np.abs(x), 0.09, 0.006) & (u < 1.15)) | (P.lines(u - 0.8 * x, 0.13, 0.005) & (u > 1.25))
        c = P.put(c, sh & crease, CREASE, 0.7)
        stain = (f > 0) & (P.ellipse(x, u, -0.06, 1.07, 0.03, 0.022) | P.ellipse(x, u, -0.04, 1.055, 0.018, 0.016) | P.ellipse(x, u, -0.075, 1.088, 0.012, 0.01))
        c = P.put(c, sh & stain, STAIN, 0.55)
        t.c = c
        return P.light(t)

    def patch(t):
        # SECURITY on the left shoulder's patch, read from the side.
        sh = b.j["upper_arm.L"][0]
        ink = P.text(-(t.fwd - sh[1]), t.up - (sh[2] - 0.095 * k), "SECURITY", 0.013 * k, 0, -0.0065 * k)
        t.c = P.put(t.c, ink, GOLD)
        return P.light(t)

    def tag(t):
        ink = P.text(t.side - (-0.09 * k * g), t.up - 1.355 * k, "BEY", 0.014 * k, 0, -0.007 * k)
        t.c = P.put(t.c, ink, (240, 240, 230))
        return P.light(t)

    def badge(t):
        # TRANSMITTER SITE in two rows round a tower, on the gold badge.
        x, u = t.side - 0.08 * k * g, t.up - 1.36 * k
        ink = P.text(x, u, "TRANSMITTER", 0.0045 * k, 0, 0.008 * k) | P.text(x, u, "SITE", 0.0045 * k, 0, -0.013 * k)
        tower = (np.abs(x) < 0.003 * k + (0.006 * k - u) * 0.3) & (u > -0.006 * k) & (u < 0.006 * k)
        t.c = P.put(t.c, ink | tower, NAVY)
        return P.light(t)

    def boots(t):
        t.c = P.put(t.c, P.facing(t, (0.2, 0.6, 0.8), 0.85), (70, 70, 80), 0.6)  # polished toes
        return P.light(t)

    skin = face_paint(b, SKIN, stubble=STUBBLE)

    c = {"skin": SKIN, "top": SHIRT, "bottom": NAVY, "shoes": BOOTS, "hair": HAIR, "shoulders": 0.23, "lids": 0.8, "hand": HAND,
         "eye": (0.02, 0.008, 0.015), "brows": HAIR, "sole": (12, 12, 12)}
    torso(p, b, c, paint=shirt)  # shirt tucked in at the belt
    # A slight gut, over the belt.
    p.blob("gut", b.p(0, 0.05, 1.07), (b.r(0.13), 0.075 * k * g, 0.11 * k), SHIRT, "spine", subdiv=2, paint=shirt)
    p.hull("tie", [b.p(x, f, u) for f in (0.112, 0.122) for x, u in ((-0.018, 1.44), (0.018, 1.44), (-0.03, 1.22), (0.03, 1.22), (0, 1.19))], NAVY, "chest", paint=lit)
    p.hull("collar", [b.p(x, f, u) for f in (0.06, 0.11) for x, u in ((-0.075, 1.48), (0.075, 1.48), (-0.04, 1.43), (0.04, 1.43), (0, 1.445))], SHIRT, "chest", paint=shirt)
    for sd in (1, -1):
        p.hull(f"collar_point{sd}", [b.p(sd * x, f, u) for x, f, u in ((0.014, 0.118, 1.465), (0.07, 0.106, 1.475), (0.045, 0.12, 1.42),
                                                                     (0.014, 0.11, 1.465), (0.07, 0.098, 1.475), (0.045, 0.112, 1.42))], SHIRT, "chest", paint=shirt)
    # The duty belt, with pouches, the buckle, the flashlight and the keys.
    p.hull("belt", b.ring(0.178, 0.112, 0.035, 0.93) + b.ring(0.178, 0.112, 0.035, 0.995), BELT, "hips", paint=lit)
    p.box("buckle", b.p(0, 0.12, 0.962), (0.055, 0.012, 0.045), METAL, "hips", mat=1, paint=lit)
    for i, x in enumerate((-0.07, 0.055, -0.17, 0.17)):
        p.box(f"belt_loop{i}", b.p(x, 0.118 - abs(x) * 0.3, 0.962), (0.014, 0.008, 0.075), BELT, "hips", paint=lit)
    for i, x in enumerate((0.1, 0.15, -0.12)):
        p.box(f"pouch{i}", b.p(x, 0.115 - abs(x) * 0.25, 0.945), (0.05, 0.03, 0.065), BELT, "hips", paint=lit)
    p.box("badge", b.p(0.08, 0.12, 1.36), (0.04, 0.008, 0.048), GOLD, "chest", mat=1, paint=badge)
    p.box("tag", b.p(-0.09, 0.118, 1.36), (0.06, 0.006, 0.018), TAG, "chest", mat=1, paint=tag)
    for s in (1, -1):
        p.box(f"pocket{s}", b.p(s * 0.085, 0.112, 1.28), (0.065, 0.008, 0.06), SHIRT, "chest", paint=shirt)
        p.box(f"pocket_flap{s}", b.p(s * 0.085, 0.118, 1.305), (0.068, 0.01, 0.018), CREASE, "chest", paint=lit)
        p.blob(f"pocket_button{s}", b.p(s * 0.085, 0.124, 1.3), (0.006, 0.004, 0.006), METAL, "chest", mat=1)
        p.box(f"epaulette{s}", b.p(s * 0.17, 0, 1.455), (0.1, 0.055, 0.014), NAVY, "chest", paint=lit)
        p.blob(f"epaulette_button{s}", b.p(s * 0.125, 0.0, 1.465), (0.008, 0.008, 0.006), GOLD, "chest", mat=1)
    p.seg("flashlight", b.p(-0.2, 0.02, 0.98), b.p(-0.2, 0.06, 0.74), 0.025, 0.03, BELT, "hips", mat=1, paint=lit)
    p.seg("lens", b.p(-0.2, 0.06, 0.75), b.p(-0.2, 0.065, 0.73), 0.034, 0.034, METAL, "hips", mat=1, paint=lit)
    # The key ring swings from the belt (x_keys).
    p.seg("key_ring", b.p(0.2, 0.0, 0.92), b.p(0.2, 0.0, 0.9), 0.03, 0.03, METAL, "x_keys", mat=1)
    for i, d in enumerate((-0.02, 0.0, 0.02)):
        p.box(f"key{i}", b.p(0.2 + d, 0.01, 0.86), (0.008, 0.004, 0.05), GOLD, "x_keys", mat=1)

    hp, hr = head(p, b, c, paint=skin)
    mouth(p, b, (0, 0.112, 1.618), 0.05, 0.008, SKIN, kind="line", inner=(70, 40, 36))
    # A heavy moustache, in three chunks.
    p.hull("moustache", [hp(x, f, u) for x, f, u in ((-0.045, 0.108, 1.628), (0.045, 0.108, 1.628), (-0.05, 0.1, 1.61), (0.05, 0.1, 1.61),
                                                     (-0.02, 0.13, 1.64), (0.02, 0.13, 1.64), (0, 0.13, 1.632), (-0.03, 0.122, 1.614), (0.03, 0.122, 1.614))],
           HAIR, "head", paint=lit)
    p.blob("hair", hp(0, -0.04, 1.66), hr(0.096, 0.08, 0.08), HAIR, "head", paint=lit)
    # Cropped short under the cap, and the moustache's bristling lower edge.
    hair_cover(p, b, "crop", (0, -0.04, 1.66), (0.096, 0.08, 0.08), HAIR, paint=lit, rows=((-30, 8), (0, 9)), az=(95, 265), flow=(0, -18), width=0.02, lift=1.0, flat=0.3)
    for i, x in enumerate((-0.042, -0.025, -0.008, 0.008, 0.025, 0.042)):
        clump(p, f"bristle{i}", hp(x, 0.118, 1.622), hp(x * 1.12, 0.122, 1.6), 0.008 * k, HAIR, "head", paint=lit, flat=0.5)
    # The peaked cap: an eight-sided crown, the band, the visor and the badge.
    p.seg("cap", hp(0, -0.005, 1.7), hp(0, 0.005, 1.775), b.k * b.head * 0.106, b.k * b.head * 0.12, NAVY, "head", verts=12, paint=lit)
    p.seg("cap_top", hp(0, 0.005, 1.775), hp(0, 0.005, 1.782), b.k * b.head * 0.12, b.k * b.head * 0.1, NAVY, "head", verts=12, paint=lit)
    p.seg("cap_band", hp(0, -0.005, 1.695), hp(0, -0.003, 1.725), b.k * b.head * 0.108, b.k * b.head * 0.109, BELT, "head", verts=12, paint=lit)
    p.hull("visor", [hp(x, f, 1.69 + d) for d in (0, 0.008) for x, f in ((-0.09, 0.07), (0.09, 0.07), (-0.07, 0.17), (0.07, 0.17), (0, 0.185))], BELT, "x_peak", mat=1, paint=lit)
    p.box("cap_badge", hp(0, 0.122, 1.742), hr(0.032, 0.01, 0.034), GOLD, "head", mat=1, paint=lit)

    arms(p, b, c, sleeve=0.45, paint=shirt, hand_paint=skin)
    sh = b.j["upper_arm.L"]
    mid = lerp(*sh, 0.35)
    p.box("patch", (mid[0] + b.r(0.054), mid[1], mid[2]), (0.008, 0.07 * k, 0.06 * k), PATCH, "upper_arm.L", paint=patch)
    legs(p, b, c, shin=BOOTS, shoe_h=0.13, paint=lit, shoe_paint=boots)

    # Handcuffs, out of the lead hand for Cuff 'Em: one cuff round his
    # fingers, a short chain, the open one swinging out in front.
    wr, a, w, L, held_at = grip(b, "L")
    c1, c2 = wr + a * (L + 0.02), wr + a * (L + 0.17)
    ring(p, "cuff_near", tuple(c1), tuple(a), tuple(w), 0.042, 0.008, METAL, "hand.L", paint=lit)
    ring(p, "cuff_far", tuple(c2), tuple(a), tuple(w), 0.042, 0.008, METAL, "hand.L", paint=lit)
    for i, t in enumerate((0.072, 0.098)):
        p.blob(f"cuff_link{i}", tuple(wr + a * (L + t)), (0.011, 0.011, 0.011), METAL, "hand.L", mat=1, paint=lit)
    p.held("cuffs", held_at, "cuff_near", "cuff_far", "cuff_link0", "cuff_link1")
    for s in ("L", "R"):
        knee, ankle = b.j[f"shin.{s}"]
        # The boots' tops, a rim over the trousers.
        p.seg(f"boot_top.{s}", lerp(knee, ankle, 0.45), lerp(knee, ankle, 0.52), b.r(0.064), b.r(0.062), BOOTS, f"shin.{s}", verts=12, paint=boots)
        # Laces criss-crossing up the boot's front.
        for i, t in enumerate((0.6, 0.72, 0.84)):
            q = lerp(knee, ankle, t)
            p.box(f"lace{i}.{s}", (q[0], q[1] + b.r(0.058), q[2]), (0.04 * k, 0.006, 0.008 * k), (150, 120, 80), f"shin.{s}", paint=lit)


def xbones(b):
    """Secondary motion: the key ring on his belt, and a little give in the cap's peak."""
    hp, _, _ = head_frame(b)
    return [
        {"name": "x_keys", "parent": "hips", "head": b.p(0.2, 0.0, 0.925), "tail": b.p(0.2, 0.01, 0.84), "stiff": 0.14, "damp": 0.2, "max": 40},
        {"name": "x_peak", "parent": "head", "head": hp(0, 0.08, 1.694), "tail": hp(0, 0.185, 1.694), "stiff": 0.45, "damp": 0.4, "max": 5},
    ]


class STANCE(Stance):
    """Wide and low, open hands forward: ready to grab."""

    drop = 0.09
    bob = 0.01
    hips_yaw = -20
    chest_yaw = -22
    chest_pitch = 12
    lead_foot = (0.16, 0.18)
    rear_foot = (-0.2, -0.2)
    lead_hand = (0.17, 0.42, 1.18)
    rear_hand = (-0.12, 0.32, 1.14)
    lead_aim = (0, 1, 0.3)
    rear_aim = (0, 1, 0.3)
    guard_fist = 0.0
    block_head = -4  # ducking would lift the back of his cap over the hurtbox
    # Rhythm (step 25 A): a big, visible load early in the startup, still
    # accelerating into the strike, a heavy carry-through held a beat, and
    # he sinks back into his stance.
    windup = (1.5, 0.0, 0.6)
    snap = (4, 2.0)
    follow = (1.0, 4)
    settle = -1.0
    # A big man: moves least, and the head barely turns on light hits.
    hit_amount = 0.7
    hit_turn = 0.35

    def win(self, t=0):
        """Arms folded, unimpressed."""
        return self.base(drop=0.0).but(
            hand_L={"pos": self.s((-0.12, 0.2, 1.24 + 0.01 * t)), "aim": (-1, 0.1, 0)},
            hand_R={"pos": self.s((0.12, 0.22, 1.2 + 0.01 * t)), "aim": (1, 0.1, 0)},
            elbow_L=self.s((0.4, 0.3, 1.1)), elbow_R=self.s((-0.4, 0.3, 1.1)),
            chest=(-4, -10, 0), head=(-8, 0, 0))

    def intro_keys(self, relaxed, base):
        """Checks his watch (the lead wrist up, head down to it), then
        cracks his knuckles, twice, and squares up (step 16 C)."""
        watch = self.base(drop=0.02).but(
            chest=(8, -16, 0), head=(26, -8, 0),
            hand_L={"pos": self.s((0.04, 0.34, 1.32)), "aim": (-0.9, 0.2, 0.3), "hint": (0, 0, 1)}, elbow_L=self.s((0.5, 0.3, 1.1)),
            hand_R={"pos": self.s((-0.24, 0.02, 0.9)), "aim": (-0.1, 0.05, -1)}).shaped(fist_L=0.6)

        def knuckles(push):
            return self.base(drop=0.03).but(
                chest=(6 + 4 * push, -18, 0), head=(4, -6, 0),
                hand_L={"pos": self.s((0.04, 0.3 + 0.12 * push, 1.24)), "aim": (-0.6, 0.6, 0.2), "hint": (0, 0, 1)},
                hand_R={"pos": self.s((-0.04, 0.3 + 0.12 * push, 1.22)), "aim": (0.6, 0.6, 0.2), "hint": (0, 0, 1)},
            ).shaped(fist_L=1.0, fist_R=0.6, jaw=0.2 * push)

        return [(1, relaxed), (16, watch), (34, watch.but(head=(24, -2, 0))), (44, knuckles(0)), (50, knuckles(1)), (56, knuckles(0)), (62, knuckles(1)),
                (80, base), (90, base)]

    def win_keys(self, base):
        """Arms folded, a slow shake of the head, then a thumb jerked over his
        shoulder: move along (step 16 C)."""
        folded = self.win().shaped(win=0.4)
        thumb = self.base(drop=0.0).but(
            chest=(-4, -14, 0), head=(-8, 10, 0),
            hand_L={"pos": self.s((0.26, -0.22, 1.56)), "aim": (0.1, -1, 0.3), "hint": (1, 0, 0)}, elbow_L=self.s((0.6, 0.4, 1.2)),
            hand_R=folded.parts["hand_R"], elbow_R=folded.parts["elbow_R"]).shaped(win=0.4, fist_L=1.0, point_L=0.0)
        return [(1, base), (18, folded), (34, folded.but(head=(-8, 26, 0))), (46, folded.but(head=(-8, -26, 0))), (58, folded.but(head=(-8, 20, 0))),
                (70, folded), (84, thumb), (88, thumb.but(hand_L={**thumb.parts["hand_L"], "pos": self.s((0.28, -0.3, 1.6))})), (94, thumb), (120, thumb)]

    def win_2(self, base):
        """End of shift: checks his watch, then a long yawn."""
        belt = {"pos": self.s((-0.24, 0.02, 1.0)), "aim": (0, -0.2, -1)}
        watch = self.base(drop=0.0).but(
            chest=(4, -14, 0), head=(22, -10, 0),
            hand_L={"pos": self.s((0.04, 0.34, 1.32)), "aim": (-1, 0.2, 0.1)},
            hand_R=belt).shaped(win=1.0, fist_L=0.6, fist_R=0.3)
        yawn = self.base(drop=0.0).but(
            chest=(-12, -12, 0), head=(-26, 0, 0),
            hand_L={"pos": self.s((0.32, 0.05, 1.05)), "aim": (0.2, 0, -1)},
            hand_R={"pos": self.s((-0.02, 0.2, 1.6)), "aim": (0.3, 0.2, 1)}).shaped(win=0.4, ko=0.5)
        done = watch.but(head=(4, 0, 0))
        return [(1, base), (18, watch), (40, watch.but(head=(26, -10, 0))), (54, watch), (70, yawn), (98, yawn), (112, done), (120, done)]

    def intro_2(self, relaxed, base):
        """Touches the cap's peak, then cracks his knuckles."""
        cap = relaxed.but(head=(8, 0, 0), hand_L={"pos": self.s((0.05, 0.22, 1.7)), "aim": (0, 0.2, 1)})
        crack = relaxed.but(chest=(8, -10, 0), head=(6, 0, 0),
                            hand_L={"pos": self.s((0.03, 0.34, 1.24)), "aim": (-0.4, 0.6, 0.4)},
                            hand_R={"pos": self.s((-0.03, 0.32, 1.22)), "aim": (0.4, 0.6, 0.4)}).shaped(fist_L=1.0, fist_R=0.5)
        push = crack.but(hand_L={"pos": self.s((0.03, 0.44, 1.24)), "aim": (-0.4, 0.6, 0.4)}, hand_R={"pos": self.s((-0.03, 0.42, 1.22)), "aim": (0.4, 0.6, 0.4)})
        return [(1, relaxed), (16, cap), (28, cap), (44, crack), (52, push), (58, crack), (66, push), (80, base), (90, base)]


def _searchlight(st, base, mv):
    """Searchlight (air): hanging there, the flashlight swept down across the
    floor in front of him on the hits (from near to far)."""
    s = st.s
    h0, h1 = mv["hits"][0]["frames"]
    up = base.but(chest=(-4, -20, 0), hand_R={"pos": s((-0.1, 0.25, 1.4)), "aim": (0, 0.4, 0.9)}).shaped(fist_R=0.8)
    near = base.but(chest=(24, -10, 0), head=(26, 0, 0), hand_R={"pos": s((-0.1, 0.5, 0.8)), "aim": (0, 0.3, -0.95)}).shaped(fist_R=0.8, jaw=0.5)
    far = near.but(chest=(12, -10, 0), head=(14, 0, 0), hand_R={"pos": s((-0.1, 0.68, 0.98)), "aim": (0, 0.85, -0.5)})
    return [(6, up), (h0 - 2, near), (h0, near), (h1, far), (h1 + 6, far), (mv["total"], base)]


def _sink(st, base, d=1.0):
    """Settling back into the stance: a little lower, folded over it."""
    return added(base, hips={"offset": (0, 0, -0.035 * st.k * d)}, spine=(3 * d, 0, 0), chest=(5 * d, 0, 0))


def _collar_grab(st, base, mv, fit):
    """Collar Grab (s.FP): the lead hand shoots out open, closes on a collar
    on the hits and yanks it back to his chest by 14."""
    s, k = st.s, st.k
    h0, h1 = mv["hits"][0]["frames"]
    total = mv["total"]
    load = base.but(hips={"offset": (0, -0.06 * k, -(st.drop + 0.03) * k), "turn": (0, st.hips_yaw + 10, 0)}, spine=(10, -4, 0), chest=(10, 0, 0),
                    shoulder_L=(10, 0, 0), shoulder_R=(10, 0, 0), head=(6, -8, 0),
                    hand_L={"pos": s((0.18, 0.12, 1.34)), "aim": (0, 0.8, 0.5), "hint": (0, 0, -1)}).shaped(fist_L=0.0, open_L=0.9)
    reach = base.but(hips={"offset": (0, 0.12 * k, -st.drop * k), "turn": (6, st.hips_yaw - 16, 0)}, spine=(6, -40, 0), chest=(12, -56, 0),
                     shoulder_L=(12, -56, 0), shoulder_R=(12, -56, 0), head=(0, -10, 0),
                     hand_L={"pos": s((0.1, 0.6, 1.4)), "aim": (0, 1, 0.05), "hint": (0, 0.3, -1)})
    reach = fit.place(reach, "hand.L", (0.74, 1.42)).shaped(fist_L=0.0, open_L=0.8, jaw=0.4)
    grip = reach.shaped(fist_L=0.85, open_L=0.0, jaw=0.6)
    yank = base.but(hips={"offset": (0, -0.03 * k, -st.drop * k), "turn": (-4, st.hips_yaw + 4, 0)}, spine=(-2, -20, 0), chest=(-6, -24, 0),
                    shoulder_L=(-6, -24, 0), shoulder_R=(-6, -24, 0), head=(-6, -6, 0),
                    hand_L={"pos": s((0.1, 0.22, 1.32)), "aim": (0, 0.4, 0.9), "hint": (0, 1, 0)}).shaped(fist_L=1.0, jaw=0.2)
    return [(3, load), (5, toward(load, base, -0.06)), (6, lerp_pose(load, reach, 0.25)), (7, lerp_pose(load, reach, 0.6)),
            (h0, reach), (h1, grip), (h1 + 2, lerp_pose(grip, yank, 0.6)), (14, yank), (16, yank), (total - 2, _sink(st, base)), (total, base)]


def _knee(side):
    """Knee (s.FK, the lead knee) and Patrol (FK FK, the rear one, walking
    in): grabs the shoulders, pulls them down onto a knee driven up into
    the gut on the hits, then a heavy carry-through."""
    def keys(st, base, mv, fit):
        s, k = st.s, st.k
        h0, h1 = mv["hits"][0]["frames"]
        total = mv["total"]
        x0, x1, y0, y1 = mv["hits"][0]["box"]
        sx = 0.13 if side == "L" else -0.13
        other = "R" if side == "L" else "L"
        hands = {"hand_L": {"pos": s((0.17, 0.62, 1.5)), "aim": (-0.2, 0.9, -0.3), "hint": (0, 0, -1)},
                 "hand_R": {"pos": s((-0.17, 0.6, 1.48)), "aim": (0.2, 0.9, -0.3), "hint": (0, 0, -1)}}
        reach = base.but(hips={"offset": (0, 0.05 * k, -st.drop * k), "turn": (6, st.hips_yaw + 6, 0)}, spine=(8, -12, 0), chest=(14, -14, 0),
                         shoulder_L=(14, -14, 0), shoulder_R=(14, -14, 0), head=(2, -6, 0), **hands).shaped(fist_L=0.0, fist_R=0.0, open_L=0.7, open_R=0.7)
        # Hands closed on the shoulders, pulling them down.
        grab = added(reach.but(hand_L={**hands["hand_L"], "pos": s((0.17, 0.56, 1.42))}, hand_R={**hands["hand_R"], "pos": s((-0.17, 0.54, 1.4))}),
                     chest=(6, 0, 0)).shaped(fist_L=0.7, fist_R=0.7, open_L=0.0, open_R=0.0, jaw=0.3)
        of = base.parts[f"foot_{other}"]
        chamber = grab.but(**{f"foot_{side}": {"pos": (sx * k, -0.06 * k, 0.4 * k), "turn": (50, 0, 0)}, f"knee_{side}": (sx * k, 1.2 * k, 1.0 * k)})

        def drive(target, lean):
            p = grab.but(hips={"offset": (0, 0.14 * k, -(st.drop - 0.04) * k), "turn": (-6, st.hips_yaw + 4, 0)}, spine=(8 + lean, -12, 0),
                         chest=(18 + lean, -14, 0), shoulder_L=(18 + lean, -14, 0), shoulder_R=(18 + lean, -14, 0), head=(12, -6, 0),
                         **{f"foot_{side}": {"pos": (sx * k, 0.3 * k, 0.6 * k), "turn": (60, 0, 0)}, f"knee_{side}": (sx * k, 1.5 * k, 1.4 * k),
                            f"foot_{other}": moved(of, (0, 0.04 * k, 0.03 * k), (22, of["turn"][1], 0))})
            return fit.place(p, f"knee.{side}", target).shaped(jaw=0.8)

        hit = drive((min(x1 - 0.2, 0.56), (y0 + y1) / 2 - 0.04), 0)
        high = drive((min(x1 - 0.18, 0.58), (y0 + y1) / 2 + 0.04), 6)
        carry = added(high, hips={"offset": (0, 0.06 * k, -0.02 * k), "turn": (6, 0, 0)}, chest=(10, 0, 0), head=(6, 0, 0))
        down = lerp_pose(carry.but(**{f"foot_{side}": base.parts[f"foot_{side}"], f"foot_{other}": of}), base, 0.5).shaped(
            fist_L=0.3, fist_R=0.3, open_L=0.4, open_R=0.4)
        return [(max(2, h0 - 6), reach), (h0 - 4, grab), (h0 - 2, chamber), (h0, hit), (h1, high), (h1 + 3, carry), (h1 + 6, carry),
                (h1 + round((total - h1) * 0.65), down), (total - 2, _sink(st, base)), (total, base)]
    return keys


def _shoulder_check(st, base, mv, fit):
    """Shoulder Check (f.BP): a barge, tucked behind the lead shoulder,
    moving (the game carries him) through the armour, then the shoulder
    rising and dropping onto them on the hits."""
    s, k = st.s, st.k
    h0, h1 = mv["hits"][0]["frames"]
    total = mv["total"]
    turn = dict(spine=(16, -62, 0), chest=(26, -80, 0), shoulder_L=(26, -80, 0), shoulder_R=(26, -80, 0), neck=(10, -36, 0), head=(4, -12, 0))
    arms = {"hand_L": {"pos": s((0.02, 0.22, 1.2)), "aim": (-0.7, 0.3, 0.6)}, "hand_R": {"pos": s((-0.14, 0.08, 1.12)), "aim": (0.4, 0.6, 0.5)}}
    tuck = base.but(hips={"offset": (0, 0.04 * k, -(st.drop + 0.06) * k), "turn": (12, -56, 0)}, **turn, **arms).shaped(fist_L=1.0, fist_R=1.0, jaw=0.3)
    lf, rf = base.parts["foot_L"], base.parts["foot_R"]
    lunge = {"foot_L": moved(lf, s((0, 0.3, 0))), "foot_R": moved(rf, s((0, 0.05, 0.03)), (24, rf["turn"][1], 0))}
    rise = added(tuck, hips={"offset": (0, 0, 0.06 * k), "turn": (-8, 0, 0)}, chest=(-12, 0, 0), shoulder_L=(-12, 0, 0), shoulder_R=(-12, 0, 0)).but(**lunge)

    def bash(target, pitch):
        p = added(tuck.but(**lunge), chest=(pitch, 0, 0), shoulder_L=(pitch, 0, 0), shoulder_R=(pitch, 0, 0), spine=(pitch * 0.5, 0, 0))
        return fit.place(p, "shoulder.L", target).shaped(jaw=0.9)

    hit = bash((0.5, 1.48), 0)
    drop = bash((0.58, 1.22), 18)
    carry = added(drop, hips={"offset": (0, 0.07 * k, -0.04 * k)}, chest=(8, 0, 0), shoulder_L=(8, 0, 0), shoulder_R=(8, 0, 0))
    return [(4, tuck), (h0 - 6, tuck.but(head=(8, -12, 0))), (h0 - 2, rise), (h0, hit), (h1, drop), (h1 + 4, carry), (h1 + 8, carry),
            (h1 + 14, lerp_pose(carry, base, 0.6).shaped(fist_L=0.5, fist_R=0.5)), (total - 3, _sink(st, base)), (total, base)]


def _stiff_arm(st, base, mv, fit):
    """Stiff Arm (f.FK): his slowest normal. A big wind-up, the lead arm
    drawn right back, then a slow locked-arm shove, the heel of the palm
    into the chest on the hits and the weight thrown through it."""
    s, k = st.s, st.k
    h0, h1 = mv["hits"][0]["frames"]
    total = mv["total"]
    x0, x1, y0, y1 = mv["hits"][0]["box"]
    lf, rf = base.parts["foot_L"], base.parts["foot_R"]
    palm = {"aim": (0, 0.3, 1), "hint": (0, 1, 0)}  # fingers up, palm to them
    wind = base.but(hips={"offset": (0, -0.12 * k, -(st.drop + 0.05) * k), "turn": (-4, st.hips_yaw + 22, 0)}, spine=(0, 0, 0), chest=(-6, 18, 0),
                    shoulder_L=(-6, 18, 0), shoulder_R=(-6, 18, 0), head=(4, -14, 0),
                    hand_L={"pos": s((0.24, -0.16, 1.32)), **palm}, hand_R={"pos": s((-0.2, -0.05, 1.05)), "aim": (-0.2, 0.3, -1)},
                    foot_L=moved(lf, (0, 0, 0.02 * k), (16, lf["turn"][1], 0))).shaped(fist_L=0.0, open_L=0.6, fist_R=0.6, jaw=0.0)
    shove = base.but(hips={"offset": (0, 0.24 * k, -(st.drop + 0.03) * k), "turn": (8, st.hips_yaw - 30, 0)}, spine=(8, -48, 0), chest=(14, -66, 0),
                     shoulder_L=(14, -66, 0), shoulder_R=(14, -66, 0), head=(4, -12, 0),
                     hand_L={"pos": s((0.08, 0.8, 1.3)), **palm}, hand_R={"pos": s((-0.24, -0.1, 1.15)), "aim": (-0.3, -0.6, 0.2)},
                     foot_L=moved(lf, s((0, 0.24, 0))), foot_R=moved(rf, s((0, 0.06, 0.03)), (22, rf["turn"][1], 0))).shaped(
        fist_L=0.0, open_L=0.5, fist_R=0.6, jaw=0.9)
    hit = fit.place(shove, "hand.L", (x1 - 0.1, (y0 + y1) / 2 + 0.05))
    through = fit.place(added(shove, hips={"offset": (0, 0.03 * k, 0)}), "hand.L", (x1 - 0.06, (y0 + y1) / 2 + 0.03))
    carry = added(through, hips={"offset": (0, 0.08 * k, -0.04 * k), "turn": (6, 0, 0)}, chest=(10, 0, 0), head=(6, 0, 0))
    return [(8, lerp_pose(base, wind, 0.5)), (13, wind), (h0 - 4, toward(wind, base, -0.08)), (h0 - 2, lerp_pose(wind, hit, 0.3)), (h0 - 1, lerp_pose(wind, hit, 0.65)),
            (h0, hit), (h1, through), (h1 + 4, carry), (h1 + 8, carry), (h1 + 13, lerp_pose(carry, base, 0.6)), (total - 3, _sink(st, base)), (total, base)]


def _frisk(st, base, mv):
    """Frisk (BP FP FK): pats them down, then grabs a wrist and twists it
    behind their back on the catch (the game plays the reeling grab); the
    generated whiff after it grabs at air and stumbles."""
    s, k = st.s, st.k
    f0, f1 = mv["throw"]["frames"]
    reach = mv["throw"]["range"] - 0.35  # as the command grab's
    lean = dict(hips={"offset": (0, 0.1 * k, -(st.drop + 0.04) * k), "turn": (10, st.hips_yaw + 20, 0)}, spine=(10, -6, 0), chest=(18, -8, 0),
                shoulder_L=(18, -8, 0), shoulder_R=(18, -8, 0), head=(10, 0, 0))
    down = (0, 0.25, -1)

    def pat(l_up, r_up, press=0.0):
        """Palms on them (to the front), each hand at its height."""
        return base.but(**lean, hand_L={"pos": (0.15 * k, reach - 0.06 + press, l_up * k), "aim": down, "hint": (0, 1, 0)},
                        hand_R={"pos": (-0.15 * k, reach - 0.1 + press, r_up * k), "aim": down, "hint": (0, 1, 0)}).shaped(
            fist_L=0.0, fist_R=0.0, open_L=0.3, open_R=0.3, jaw=0.2)

    grab = base.but(**lean, hand_L={"pos": (0.06 * k, reach, 1.0 * k), "aim": (0, 1, -0.2), "hint": (-1, 0, 0)},
                    hand_R={"pos": (-0.08 * k, reach - 0.04, 1.1 * k), "aim": (0.3, 0.9, 0.1), "hint": (0, 0, 1)}).shaped(fist_L=0.75, fist_R=0.5, jaw=0.5)
    # The twist: the wrist turned over and up their back.
    twist = grab.but(hand_L={"pos": (0.0, reach - 0.06, 1.18 * k), "aim": (-0.6, 0.6, 0.5), "hint": (0, 0, -1)},
                     hand_R={"pos": (-0.1 * k, reach - 0.08, 1.2 * k), "aim": (0.2, 0.9, 0.3), "hint": (0, 0, 1)}).shaped(fist_L=0.9, fist_R=0.7, jaw=0.7)
    return [(2, pat(1.42, 1.36)), (3, pat(1.38, 1.4, 0.03)), (4, pat(1.2, 1.26)), (5, pat(1.16, 1.12, 0.03)), (6, pat(1.0, 1.06)),
            (f0 - 1, lerp_pose(pat(1.0, 1.06), grab, 0.6)), (f0, grab), (f1, twist)]


def _elbow_drop(st, base, mv, fit):
    """Elbow Drop (air, step 28): hanging with the lead elbow raised high,
    the fist by his ear (armoured: it glows), then all of him down elbow
    first from 7, folded over it, the legs kicked up behind."""
    s, k = st.s, st.k
    h0, h1 = mv["hits"][0]["frames"]
    x0, x1, y0, y1 = mv["hits"][0]["box"]
    raised = base.but(chest=(-10, -30, 0), spine=(-4, -20, 0), head=(4, -10, 0),
                      hand_L={"pos": s((0.14, 0.02, 1.62)), "aim": (0, -0.3, 0.95)}, elbow_L=s((0.3, 0.3, 2.4)),
                      hand_R={"pos": s((-0.4, -0.1, 1.35)), "aim": (-0.7, -0.2, 0.4)}).shaped(fist_L=1.0, fist_R=0.0, open_R=0.6, jaw=0.6)
    drop = base.but(hips={"offset": (0, 0.1 * k, 0.1 * k), "turn": (55, st.hips_yaw, 0)}, spine=(22, -20, 0), chest=(30, -24, 0),
                    shoulder_L=(30, -24, 0), shoulder_R=(30, -24, 0), head=(-10, -10, 0),
                    hand_L={"pos": s((0.04, 0.75, 0.95)), "aim": (-0.6, 0.3, 0.6)}, elbow_L=s((0.2, 0.9, -0.6)),
                    hand_R={"pos": s((-0.36, 0.3, 0.6)), "aim": (-0.4, -0.3, -0.8)},
                    foot_L={"pos": s((0.12, -0.6, 0.85)), "turn": (100, -10, 0)}, foot_R={"pos": s((-0.14, -0.7, 0.75)), "turn": (100, -30, 0)},
                    knee_L=s((0.12, 0.2, 0.4)), knee_R=s((-0.14, 0.1, 0.35))).shaped(fist_L=1.0, fist_R=0.6, jaw=1.0)
    drop = fit.place(drop, "elbow.L", (x0 + 0.45 * (x1 - x0), y1 - 0.12))
    return [(3, lerp_pose(base, raised, 0.7).shaped(**raised.parts["shapes"])), (6, raised), (7, lerp_pose(raised, drop, 0.6).shaped(**drop.parts["shapes"])),
            (h0, drop), (h1, drop.but(head=(24, -10, 0))), (mv["total"], drop)]


def _yank(st, base, mv):
    """Yank (Key Ring BP, step 28): out of the key ring's throw, both hands
    on the chain low and out in front, wrenched back and up to his chest on
    the hits, leaning right back into it (the chain is the game's)."""
    s, k = st.s, st.k
    h0, h1 = mv["hits"][0]["frames"]
    total = mv["total"]
    grip = base.but(hips={"offset": (0, 0.1 * k, -(st.drop + 0.08) * k), "turn": (16, st.hips_yaw - 10, 0)}, spine=(14, -24, 0), chest=(26, -30, 0),
                    shoulder_L=(26, -30, 0), shoulder_R=(26, -30, 0), head=(6, -10, 0),
                    hand_R={"pos": s((-0.04, 0.62, 0.78)), "aim": (0, 1, -0.2), "hint": (0, 0, 1)},
                    hand_L={"pos": s((0.08, 0.5, 0.82)), "aim": (0, 1, -0.2), "hint": (0, 0, 1)}).shaped(fist_L=1.0, fist_R=1.0, jaw=0.3)
    haul = base.but(hips={"offset": (0, -0.14 * k, -(st.drop + 0.04) * k), "turn": (-14, st.hips_yaw + 10, 0)}, spine=(-10, -10, 0), chest=(-20, -16, 0),
                    shoulder_L=(-20, -16, 0), shoulder_R=(-20, -16, 0), head=(-14, -6, 0),
                    hand_R={"pos": s((-0.1, 0.12, 1.4)), "aim": (0.2, -0.6, 0.6), "hint": (0, 1, 0)},
                    hand_L={"pos": s((0.12, 0.2, 1.34)), "aim": (-0.2, -0.6, 0.6), "hint": (0, 1, 0)},
                    foot_L=moved(base.parts["foot_L"], (0, 0, 0.03 * k), (24, base.parts["foot_L"]["turn"][1], 0))).shaped(fist_L=1.0, fist_R=1.0, jaw=1.0)
    return [(4, grip), (h0 - 2, toward(grip, base, -0.06)), (h0, lerp_pose(grip, haul, 0.6).shaped(**haul.parts["shapes"])), (h1, haul), (h1 + 6, haul.but(head=(-18, -6, 0))),
            (h1 + 12, lerp_pose(haul, base, 0.5).shaped(fist_L=0.6, fist_R=0.6)), (total - 3, _sink(st, base)), (total, base)]


def _baton(st, base, mv, fit):
    """Baton Swing (j.FK BP, step 28): the rear fist swung up from his hip
    through them, low on 6 to high on 9, the body turning into it."""
    s = st.s
    h0, h1 = mv["hits"][0]["frames"]
    x0, x1, y0, y1 = mv["hits"][0]["box"]
    turn = dict(chest=(4, -50, 0), spine=(2, -30, 0), shoulder_L=(4, -50, 0), shoulder_R=(4, -50, 0))
    drawn = base.but(chest=(14, 10, 0), hand_R={"pos": s((-0.3, -0.2, 0.95)), "aim": (-0.2, -0.3, -0.9)}).shaped(fist_R=1.0)
    low = fit.place(base.but(**turn, hand_R={"pos": s((-0.05, 0.5, 0.95)), "aim": (0, 0.8, 0.6), "hint": (0, 0, 1)}).shaped(fist_R=1.0, jaw=0.6), "hand.R",
                    (x0 + 0.5 * (x1 - x0), y0 + 0.5))
    high = base.but(**{**turn, "chest": (-14, -60, 0)}, head=(-12, -10, 0), hand_R={"pos": s((-0.02, 0.38, 1.3)), "aim": (0, 0.3, 0.95), "hint": (0, 1, 0)}
                    ).shaped(fist_R=1.0, jaw=0.9)
    return [(3, drawn), (h0, low), (h1, high), (h1 + 3, high), (mv["total"], lerp_pose(high, base, 0.6))]


def _hammer_fist(st, base, mv, fit):
    """Hammer Fist (j.BP BK, step 28): both fists locked together over his
    head, brought straight down through the spike box, high on 6 to low on 9."""
    s, k = st.s, st.k
    h0, h1 = mv["hits"][0]["frames"]
    x0, x1, y0, y1 = mv["hits"][0]["box"]

    def both(p):
        r = p.parts["hand_R"]["pos"]
        return p.but(hand_L={**p.parts["hand_R"], "pos": (r[0] + 0.09 * k, r[1], r[2])})

    up = both(base.but(chest=(-16, -20, 0), head=(-8, 0, 0), hand_R={"pos": s((-0.04, -0.05, 2.05)), "aim": (0, -0.4, 0.9), "hint": (0, 1, 0)})).shaped(
        fist_L=1.0, fist_R=1.0, jaw=0.5)
    high = both(fit.place(base.but(chest=(4, -20, 0), hand_R={"pos": s((-0.04, 0.45, 1.6)), "aim": (0, 0.8, -0.3), "hint": (0, 1, 0)}), "hand.R",
                          (x0 + 0.5 * (x1 - x0), y1 - 0.3))).shaped(fist_L=1.0, fist_R=1.0, jaw=0.9)
    low = both(fit.place(base.but(chest=(40, -20, 0), spine=(14, -10, 0), head=(26, 0, 0), hand_R={"pos": s((-0.04, 0.45, 0.7)), "aim": (0, 0.3, -0.95), "hint": (0, 1, 0)}),
                         "hand.R", (x0 + 0.45 * (x1 - x0), 0.55))).shaped(fist_L=1.0, fist_R=1.0, jaw=0.9)
    return [(3, up), (h0 - 1, toward(up, base, -0.05)), (h0, high), (h1, low), (h1 + 4, low), (mv["total"], lerp_pose(low, base, 0.6))]


OVERRIDES = {
    # The specials pass (step 28).
    "Elbow Drop": {"limb": "elbow.L", "keys": _elbow_drop},
    "Key Ring BP": {"limb": "hand.R", "prop": True, "keys": _yank},
    "j.FK BP": {"limb": "hand.R", "keys": _baton},
    "j.BP BK": {"limb": "hand.R", "keys": _hammer_fist},
    # The fighting styles pilot (step 25 C): the night watch.
    "s.FP": {"keys": _collar_grab},
    "s.FK": {"limb": "knee.L", "keys": _knee("L")},
    "FK FK": {"limb": "knee.R", "keys": _knee("R")},
    "c.BP": {"style": "braced"},
    "f.BP": {"limb": "shoulder.L", "keys": _shoulder_check},
    "f.FK": {"limb": "hand.L", "palm": True, "keys": _stiff_arm},
    "BP FP FK": {"keys": _frisk},
    # Air special (step 26): the beam is the hit; the hand sweeps it.
    "Searchlight": {"limb": "hand.R", "prop": True, "keys": _searchlight},
    "Searchlight+": {"limb": "hand.R", "prop": True, "keys": _searchlight},
    # The beam and the chain make these hits (effects); the hand points them.
    "Flashlight": {"limb": "hand.R", "prop": True},
    "Key Ring": {"limb": "hand.R", "prop": True},
    "Night Shift": {"limb": "hand.L"},
    "td": {"limb": "hand.R"},
    "FP FP FK": {"held": {"key": "cuffs", "limb": "hand.L", "reach": 0.0, "show": (3, 28)}},
    # Armoured through 1–14: dug in behind the forearms, then the heavy kick.
    "s.BK": {"style": "braced"},
}


def fx(make, b):
    def beam(p):
        # The flashlight beam: a cone from the lens forward, 1.8 m long,
        # brightest at its core.
        def glow(t):
            r = np.hypot(t.side, t.up) / (0.04 + 0.21 * np.clip(t.fwd / 1.8, 0, 1))
            t.c = P.put(t.c, np.ones(len(t.c), bool), (255, 255, 235), np.clip(1 - r, 0, 1) * 0.8)
            return t.c

        p.seg("beam", (0, 0, 0), (0, 1.8, 0), 0.04, 0.42, BEAM, "fx", verts=12, mat=1, paint=glow)

    def key_ring(p):
        # The key ring flung on its chain: links sweeping low from the hand
        # (0.4 m out, 0.45 m up) to the keys at 1.9 m, along the floor.
        n = 18
        pts = [(0.0, 0.4 + 1.5 * i / n, 0.45 - 0.33 * (i / n) ** 0.7) for i in range(n + 1)]
        for i, (a, e) in enumerate(zip(pts, pts[1:])):
            mid = tuple((x + y) / 2 for x, y in zip(a, e))
            d = tuple((y - x) * 0.55 for x, y in zip(a, e))
            w = (0.018, 0.0, 0.0) if i % 2 else (0.0, 0.0, 0.018)
            q = [tuple(m + s * dd + t * ww for m, dd, ww in zip(mid, d, w)) for s in (-1, 1) for t in (-1, 1)]
            q += [tuple(m + t * ww * 0.6 + (0.006 if i % 2 == 0 else 0) * s for m, ww in zip(mid, w)) for s in (-1, 1) for t in (-1, 1)]
            p.hull(f"link{i}", q + [tuple(m + dd * 0.0 + (0.008, 0.0, 0.008)[j] * (1 if i % 2 else -1) for j, (m, dd) in enumerate(zip(mid, d)))], METAL, "fx", mat=1, paint=lit)
        end = pts[-1]
        p.seg("ring", (end[0], end[1], end[2] - 0.006), (end[0], end[1], end[2] + 0.006), 0.05, 0.05, METAL, "fx", verts=12, mat=1, paint=lit)
        for i, (dx, df) in enumerate(((-0.03, 0.06), (0.02, 0.08), (0.05, 0.03))):
            base = (end[0] + dx, end[1] + df, end[2])
            p.box(f"key{i}", (base[0], base[1] + 0.05, base[2]), (0.025, 0.1, 0.012), GOLD, "fx", mat=1, paint=lit)
            p.blob(f"key_bow{i}", (base[0], base[1], base[2]), (0.03, 0.03, 0.01), GOLD, "fx", mat=1, paint=lit)

    make("fx_flashlight_beam", beam)
    make("fx_key_ring", key_ring)
