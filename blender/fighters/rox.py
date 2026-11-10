"""Rox Vega, host of Feel the Burn at Dawn, still exercising since 1983:
a high-cut hot-pink leotard with a lightning flash and a belt, shiny purple
tights, slouchy ribbed teal leg warmers, a two-colour FEEL THE BURN
headband, sweatbands, big permed hair, white high-tops with pink laces,
bright eye shadow and a determined grin. Rushdown: fast, relentless."""
import numpy as np

from lib import paint as P
from lib.anim import Stance, added, lerp_pose, moved, toward
from lib.body import about, arms, clump, face_paint, hair_cover, head, head_frame, legs, lerp, lit, mouth, torso

ID = "rox"
HEIGHT = 1.75
GIRTH = 0.9

SKIN = (198, 140, 104)
LEOTARD = (236, 52, 140)
LEOTARD_HI = (255, 120, 90)
FLASH = (250, 226, 70)
TIGHTS = (104, 54, 150)
TIGHTS_SHINE = (176, 120, 220)
WARMERS = (40, 196, 186)
HAIR = (150, 84, 42)
HAIR_DARK = (110, 58, 30)
HAIR_LIGHT = (206, 134, 74)
SHOES = (236, 236, 230)
LACES = (236, 70, 150)
LIPS = (214, 40, 96)
SHADOW = (60, 170, 226)
SWEAT = (190, 230, 255)


def _near_polyline(x, y, pts, width):
    m = np.zeros(x.shape, dtype=bool)
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        dx, dy = x1 - x0, y1 - y0
        s = np.clip(((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy), 0, 1)
        m |= np.hypot(x - (x0 + s * dx), y - (y0 + s * dy)) < width
    return m


def costume(p, b):
    k = b.k

    def leotard(t):
        """Neon pink fading up to orange, a lightning flash across the
        front, and high-cut legs (the tights show up the hips' sides)."""
        x, f, u = t.side / (k * b.g), t.fwd / (k * b.g), t.up / k
        c = P.put(t.c, np.ones(len(t.c), bool), LEOTARD_HI, np.clip((u - 1.05) / 0.5, 0, 0.55))
        c = P.put(c, (f > 0.02) & _near_polyline(x, u, [(-0.13, 1.4), (0.02, 1.27), (-0.03, 1.25), (0.13, 1.08)], 0.02), FLASH)
        c = P.put(c, u < 0.8 + 0.18 * np.clip(np.abs(x) / 0.15, 0, 1) ** 1.6, TIGHTS)
        t.c = c
        return P.light(t)

    def tights(t):
        """A shine down the legs."""
        c = P.put(t.c, P.near(t.c, TIGHTS) & P.facing(t, (0.4, 0.5, 0.2), 0.75), TIGHTS_SHINE, 0.7)
        t.c = c
        return P.light(t)

    def warmers(t):
        """Ribbing down the leg warmers."""
        x0 = np.sign(t.side) * b.j["shin.L"][1][0]
        rib = P.lines(P.angle_around(t, x0, 0.0), 0.016, 0.006)
        t.c = P.shade(t.c, rib, 0.8)
        return P.light(t)

    def hair(t):
        """Perm curls: wavy dark lines, a highlight on top."""
        wave = t.up + 0.012 * np.sin(t.side * 90 + t.fwd * 70)
        c = P.put(t.c, P.lines(wave, 0.022, 0.006), HAIR_DARK, 0.8)
        t.c = P.put(c, P.facing(t, (0.1, 0.5, 0.85), 0.8), HAIR_LIGHT, 0.6)
        return P.light(t)

    def shoes(t):
        """Pink laces criss-crossing the high-tops' fronts."""
        front = (t.fwd > 0.04 * k) & (t.up > 0.05 * k) & P.facing(t, (0, 0.6, 0.8), 0.2)
        x = np.abs(t.side - np.sign(t.side) * b.j["shin.L"][1][0])
        laces = front & (x < 0.03 * k) & (P.lines(t.up + x, 0.025, 0.006) | P.lines(t.up - x, 0.025, 0.006))
        t.c = P.put(t.c, laces, LACES)
        return P.light(t)

    def headband(t):
        hz = b.j["head"][0][2]
        u = P.angle_around(t, 0.0, -0.01 * k * b.head)
        v = t.up - (hz + (1.741 - 1.55) * k * b.head)
        ink = P.text(u, v, "FEEL THE BURN", 0.017 * k, 0.0, -0.0085 * k)
        t.c = P.put(t.c, ink & (t.fwd > -0.02), (255, 250, 240))
        return P.light(t)

    def lips(t, c, x, f, u):
        return P.put(c, (f > 0.06) & P.ellipse(x, u, 0, 1.626, 0.038, 0.017), LIPS)

    skin = face_paint(b, SKIN, eyes_shadow=SHADOW, blush=(222, 120, 110), extra=lips)

    c = {"skin": SKIN, "top": LEOTARD, "bottom": LEOTARD, "shoes": SHOES, "hair": HAIR, "shoulders": 0.19, "eye": (0.022, 0.008, 0.016), "brows": HAIR_DARK}
    torso(p, b, c, waist=0.8, paint=leotard, shape=[
        (0.80, 0.13, 0.085), (0.88, 0.158, 0.094), (0.98, 0.16, 0.094), (1.08, 0.146, 0.09), (1.17, 0.143, 0.092),
        (1.26, 0.155, 0.1), (1.35, 0.178, 0.104), (1.43, 0.19, 0.1), (1.475, 0.15, 0.072)])
    p.hull("neckline", [b.p(x, 0.104, u) for x, u in ((-0.08, 1.445), (0.08, 1.445), (0, 1.36))] + [b.p(x, 0.09, u) for x, u in ((-0.08, 1.445), (0.08, 1.445), (0, 1.36))], SKIN, "chest", paint=skin)
    # The belt, slung at the waist.
    p.hull("belt", b.ring(0.15, 0.092, 0.03, 0.97) + b.ring(0.15, 0.092, 0.03, 1.01), WARMERS, "hips", paint=lit)
    p.box("belt_buckle", b.p(0, 0.098, 0.99), (0.05, 0.012, 0.035), FLASH, "hips", paint=lit)

    hp, hr = head(p, b, c, paint=skin)
    mouth(p, b, (0, 0.111, 1.626), 0.058, 0.016, LIPS, kind="grin", inner=(120, 30, 50), teeth=(250, 248, 240), lips=LIPS, skin=SKIN)
    # Big permed hair in clumps, nothing above the hurtbox's top (the build
    # sizes her to it).
    for i, (x, f, u, r) in enumerate((
            (0, 0.0, 1.755, 0.075), (0.055, 0.04, 1.752, 0.05), (-0.055, 0.04, 1.752, 0.05), (0, 0.06, 1.762, 0.045),
            (0.065, -0.045, 1.73, 0.06), (-0.065, -0.045, 1.73, 0.06), (0.1, 0.01, 1.68, 0.055), (-0.1, 0.01, 1.68, 0.055),
            (0.11, -0.04, 1.62, 0.06), (-0.11, -0.04, 1.62, 0.06), (0.09, -0.07, 1.56, 0.055), (-0.09, -0.07, 1.56, 0.055),
            (0, -0.085, 1.68, 0.075), (0, -0.095, 1.6, 0.07), (0.04, -0.08, 1.54, 0.05), (-0.04, -0.08, 1.54, 0.05))):
        # The perm's lower curls swing (x_perm at the back, x_perm.L/R at the sides).
        bone = {13: "x_perm", 14: "x_perm", 15: "x_perm", 8: "x_perm.L", 10: "x_perm.L", 9: "x_perm.R", 11: "x_perm.R"}.get(i, "head")
        p.blob(f"hair{i}", hp(x, f, u), hr(r, r * 0.9, r * 0.85), HAIR, bone, paint=hair)
    # Curls all over the perm, the face left clear.
    hair_cover(p, b, "curl", (0, -0.02, 1.665), (0.13, 0.115, 0.125), HAIR, paint=hair, rows=((-35, 10), (-8, 14), (20, 14), (48, 9), (72, 4)),
               flow=(18, -22), width=0.03, lift=1.0, flat=0.55, skip=lambda a, e: abs(a) < 52 and e < 40)
    # The two-colour headband: teal with FEEL THE BURN, a pink edge.
    p.seg("headband", hp(0, 0.0, 1.729), hp(0, 0.0, 1.753), b.k * b.head * 0.106, b.k * b.head * 0.1, WARMERS, "head", verts=16, paint=headband)
    p.seg("headband_edge", hp(0, 0.0, 1.753), hp(0, 0.0, 1.76), b.k * b.head * 0.1, b.k * b.head * 0.096, LEOTARD, "head", verts=16, paint=lit)
    # Tied at the back, two tails hanging out of the perm (x_band).
    p.blob("headband_knot", hp(0, -0.155, 1.735), hr(0.02, 0.016, 0.018), WARMERS, "head", paint=lit)
    for sd in (1, -1):
        clump(p, f"headband_tail{sd}", hp(sd * 0.008, -0.158, 1.73), hp(sd * 0.04, -0.19, 1.6), 0.016 * b.k, WARMERS, "x_band", paint=lit, flat=0.3)
    # A sweat drop on her brow, out only when she wins.
    drop = hp(0.07, 0.0, 1.7)
    p.blob("sweat", drop, hr(0.009, 0.006, 0.014), SWEAT, "head", mat=1, paint=lit, shapes={"win": about(drop, move=(0.004 * k, 0.07 * k, 0))})

    arms(p, b, c, sleeve=0.0, paint=lit, hand_paint=skin)
    for s in ("L", "R"):
        el, wr = b.j[f"forearm.{s}"]
        # Terry sweatbands on both wrists.
        p.seg(f"sweatband.{s}", lerp(el, wr, 0.74), lerp(el, wr, 0.96), b.r(0.05), b.r(0.048), WARMERS, f"forearm.{s}", verts=12, paint=warmers)
    legs(p, b, {**c, "bottom": TIGHTS}, shin=TIGHTS, shoe_h=0.12, paint=tights, shoe_paint=shoes)
    for s in ("L", "R"):
        knee, ankle = b.j[f"shin.{s}"]
        # Slouchy leg warmers in rings from mid-shin to the ankle, and the
        # high-tops' collars.
        for i, (t0, t1, r0, r1) in enumerate(((0.32, 0.5, 0.066, 0.07), (0.5, 0.68, 0.071, 0.067), (0.68, 0.86, 0.068, 0.073), (0.86, 0.97, 0.072, 0.064))):
            p.seg(f"warmer{i}.{s}", lerp(knee, ankle, t0), lerp(knee, ankle, t1), b.r(r0), b.r(r1), WARMERS, f"shin.{s}", verts=12, paint=warmers)
        p.seg(f"hightop.{s}", (ankle[0], 0.0, 0.07 * k), (ankle[0], 0.0, 0.15 * k), b.r(0.062), b.r(0.058), SHOES, f"shin.{s}", verts=12, paint=shoes)


def xbones(b):
    """Secondary motion: the perm's lower curls (back and sides), the headband's tails."""
    hp, _, _ = head_frame(b)
    return [
        {"name": "x_perm", "parent": "head", "head": hp(0, -0.07, 1.68), "tail": hp(0, -0.1, 1.53), "stiff": 0.26, "damp": 0.4, "max": 9},
        {"name": "x_perm.L", "parent": "head", "head": hp(0.09, -0.02, 1.67), "tail": hp(0.105, -0.06, 1.54), "stiff": 0.26, "damp": 0.4, "max": 9},
        {"name": "x_perm.R", "parent": "head", "head": hp(-0.09, -0.02, 1.67), "tail": hp(-0.105, -0.06, 1.54), "stiff": 0.26, "damp": 0.4, "max": 9},
        {"name": "x_band", "parent": "head", "head": hp(0, -0.158, 1.73), "tail": hp(0, -0.19, 1.6), "stiff": 0.15, "damp": 0.25, "max": 20},
    ]


class STANCE(Stance):
    """Low and bouncy, lead hand forward and low, always moving."""

    drop = 0.1
    bob = 0.028
    hips_yaw = -30
    chest_yaw = -36
    lead_hand = (0.1, 0.42, 1.2)
    rear_hand = (-0.05, 0.2, 1.3)
    lead_foot = (0.11, 0.22)
    rear_foot = (-0.15, -0.22)
    # Rhythm (step 25 A): a small draw late in the startup, there hard by
    # the first active frame, already on to the next beat, a bounce back.
    windup = (0.5, 0.7, 0.9)
    snap = (2, 0.3)
    follow = (0.15, 0)
    settle = 0.15
    # Springy: a little further, and snapping back faster (half back by 9).
    hit_amount = 1.1
    hit_ease = ((3, 0.0), (5, 0.25), (9, 0.5), (12, 0.55))
    hit_ease_heavy = ((4, 0.0), (7, 0.05), (13, 0.45), (18, 0.5))

    def win(self, t=0):
        """Both arms up in a V: and… hold."""
        return self.base(drop=0.02).but(
            hand_L={"pos": self.s((0.42, 0.05, 1.98 - 0.03 * t)), "aim": (0.5, 0, 1)},
            hand_R={"pos": self.s((-0.42, 0.05, 1.98 - 0.03 * t)), "aim": (-0.5, 0, 1)},
            chest=(-8, -10, 0), head=(-14, 0, 0))

    def win_2(self, base):
        """Hands on hips, marching it out: high knees, and… hold."""
        def march(knee=None):
            p = self.base(drop=0.02).but(
                chest=(-4, -14, 0), head=(-10, 0, 0),
                hand_L={"pos": self.s((0.2, 0.02, 1.0)), "aim": (0.3, -0.2, -1)}, elbow_L=self.s((0.5, 0.05, 1.15)),
                hand_R={"pos": self.s((-0.2, 0.02, 1.0)), "aim": (-0.3, -0.2, -1)}, elbow_R=self.s((-0.5, 0.05, 1.15)),
            ).shaped(win=1.0, fist_L=0.0, fist_R=0.0)
            if knee == "L":
                p = p.but(foot_L={"pos": self.s((0.11, 0.24, 0.42)), "turn": (30, -15, 0)}, knee_L=self.s((0.11, 0.9, 0.8)))
            elif knee == "R":
                p = p.but(foot_R={"pos": self.s((-0.13, -0.1, 0.42)), "turn": (30, -50, 0)}, knee_R=self.s((-0.13, 0.7, 0.8)))
            return p
        keys = [(1, base), (12, march())]
        for i in range(9):
            f = 12 + 10 * i
            keys += [(f + 5, march("LR"[i % 2])), (f + 10, march())]
        return keys + [(120, march())]

    def intro_2(self, relaxed, base):
        """An overhead stretch, reaching to each side."""
        up = relaxed.but(hand_L={"pos": self.s((0.1, 0.08, 2.02)), "aim": (0, 0, 1)}, hand_R={"pos": self.s((-0.1, 0.08, 2.04)), "aim": (0, 0, 1)},
                         head=(-10, 0, 0)).shaped(fist_L=0.0, fist_R=0.0)
        return [(1, relaxed), (16, up), (32, up.but(spine=(0, 0, 10), chest=(0, -6, 20))), (48, up.but(spine=(0, 0, -10), chest=(0, -6, -20))), (60, up), (80, base), (90, base)]


def _dive(st, base, mv):
    """Aerobic Dive (air): a beat's pause, arms up (1–5), then down at 45°
    heel first from 6, the lead leg out straight, the other tucked, arms
    swept back; the game cuts it short when she lands."""
    s, k = st.s, st.k
    pause = base.but(chest=(-8, 0, 0), head=(-10, 0, 0),
                     hand_L={"pos": s((0.18, 0.05, 1.95)), "aim": (0.1, 0.1, 1)},
                     hand_R={"pos": s((-0.18, 0.05, 1.95)), "aim": (-0.1, 0.1, 1)}).shaped(open_L=0.6, open_R=0.6, jaw=0.4)
    dive = base.but(hips={"offset": (0, 0, -0.12 * k), "turn": (-20, st.hips_yaw, 0)}, spine=(8, 0, 0), chest=(14, 0, 0), head=(10, 0, 0),
                    foot_L={"pos": s((0.1, 0.5, 0.18)), "aim": (0, 0.7, -0.7)},
                    foot_R={"pos": s((-0.12, -0.05, 0.62)), "turn": (40, -20, 0)},
                    knee_L=s((0.1, 0.9, 0.6)), knee_R=s((-0.12, 0.6, 0.9)),
                    hand_L={"pos": s((0.22, -0.45, 1.0)), "aim": (0.2, -0.8, -0.3)},
                    hand_R={"pos": s((-0.22, -0.45, 1.0)), "aim": (-0.2, -0.8, -0.3)}).shaped(fist_L=0.0, fist_R=0.0, open_L=0.8, open_R=0.8, jaw=0.7)
    h0, h1 = mv["hits"][0]["frames"]
    return [(3, pause), (5, pause), (h0, dive), (h1, dive.but(head=(14, 0, 0))), (mv["total"], dive)]


def _toes(p, k, up):
    """Up on her toes by `up` (0…1): both heels raised and the body with them."""
    lf, rf, hips = p.parts["foot_L"], p.parts["foot_R"], p.parts["hips"]
    o = hips["offset"]
    return p.but(foot_L=moved(lf, (0, 0, 0.035 * k * up), (26 * up, lf["turn"][1], 0)),
                 foot_R=moved(rf, (0, 0, 0.035 * k * up), (26 * up, rf["turn"][1], 0)),
                 hips={**hips, "offset": (o[0], o[1], o[2] + 0.04 * k * up)})


def _clap_clap(st, base, mv, fit):
    """Clap Clap (s.BP): two claps in front of the opponent's face (8–9 and
    12–13), elbows wide, bouncing on her toes, grinning."""
    s, k = st.s, st.k
    (a0, a1), (b0, b1) = (h["frames"] for h in mv["hits"])
    square = base.but(hips={"offset": (0, 0.04 * k, -st.drop * k), "turn": (2, -18, 0)}, spine=(3, -16, 0), chest=(2, -14, 0),
                      shoulder_L=(2, -14, 0), shoulder_R=(2, -14, 0), neck=(0, -6, 0), head=(-6, -4, 0))

    def hands(apart, fwd, up, toes, splay=0.1):
        """Palms facing, fingers up and forward, elbows out wide; up on her
        toes on the claps, the knees dipping between them."""
        p = square.but(
            hand_L={"pos": (apart * k, fwd * k, up * k), "aim": (-0.1 + splay, 0.6, 0.8), "hint": (-1, 0.4 * splay, 0)},
            hand_R={"pos": (-apart * k, fwd * k, up * k), "aim": (0.1 - splay, 0.6, 0.8), "hint": (1, 0.4 * splay, 0)},
            elbow_L=s((0.6, fwd - 0.25, up - 0.25)), elbow_R=s((-0.6, fwd - 0.25, up - 0.25)))
        if not toes:
            p = added(p, hips={"offset": (0, -0.01 * k, -0.04 * k)})
        return _toes(p, k, toes).shaped(fist_L=0.0, fist_R=0.0, open_L=0.15 + splay, open_R=0.15 + splay, jaw=0.25)

    clap = fit.place(hands(0.028, 0.36, 1.28, 1.0), "hand.R", (0.5, 1.36))
    r = clap.parts["hand_R"]["pos"]
    clap = clap.but(hand_L={**clap.parts["hand_L"], "pos": (-r[0], r[1], r[2])}).shaped(jaw=0.45)
    # Between the claps the hands fly open, wide and back by the shoulders.
    wide = hands(0.4, 0.06, 1.44, 0, splay=0.5)
    split = hands(0.36, 0.1, 1.42, 0, splay=0.5)
    total = mv["total"]
    return [(3, _toes(square, k, 0.2)), (5, wide), (7, lerp_pose(wide, clap, 0.7)), (a0, clap), (a1, clap), (a1 + 1, split),
            (b0 - 1, lerp_pose(split, clap, 0.7)), (b0, clap), (b1, clap), (b1 + 3, hands(0.34, 0.26, 1.36, 0.5).shaped(jaw=0.3)),
            (total - 3, toward(clap, base, 1.12)), (total, base)]


def _high_kick(st, base, mv, fit):
    """High Kick (s.FK): a straight-leg dance kick, the toe up over her head
    on the hits, arms flung back and up for balance, the standing heel up."""
    s, k = st.s, st.k
    h0, h1 = mv["hits"][0]["frames"]
    rf = base.parts["foot_R"]
    lean = base.but(hips={"offset": (0, -0.05 * k, -0.02 * k), "turn": (-24, st.hips_yaw, 0)}, spine=(-12, -30, 0), chest=(-18, -30, 0),
                    shoulder_L=(-18, -30, 0), shoulder_R=(-18, -30, 0), neck=(-6, -10, 0), head=(-2, -4, 0),
                    foot_R=moved(rf, (0, 0.02 * k, 0.04 * k), (30, st.rear_foot_yaw, 0)),
                    hand_L={"pos": s((0.28, 0.2, 1.62)), "aim": (0.3, 0.3, 0.9)},
                    hand_R={"pos": s((-0.28, -0.46, 1.42)), "aim": (-0.3, -0.85, 0.3)}).shaped(fist_L=0.0, fist_R=0.0, open_L=0.8, open_R=0.8, jaw=0.5)
    kick = fit.place(lean.but(foot_L={"pos": s((0.11, 0.4, 1.4)), "aim": (0, 0.4, 0.92), "hint": (0, -0.92, 0.4)},
                              knee_L=s((0.11, 1.0, 1.6)), toe_L=(0, 0, 0)), "foot.L", (0.42, 2.02))
    chamber = base.but(foot_L={"pos": s((0.11, 0.3, 0.55)), "turn": (40, -10, 0)}, knee_L=s((0.11, 1.0, 1.0)),
                       hand_L={"pos": s((0.2, 0.2, 1.4)), "aim": (0.2, 0.4, 0.9)}).shaped(fist_L=0.4, fist_R=0.6)
    land = _toes(base.but(foot_L=moved(base.parts["foot_L"], s((0, 0.06, 0)))), k, 0.4)
    total = mv["total"]
    return [(h0 - 3, chamber), (h0 - 1, lerp_pose(chamber, kick, 0.8)), (h0, kick), (h1, kick.but(head=(4, -4, 0))),
            (h1 + 2, lerp_pose(kick, land, 0.3)), (h1 + 6, land), (total - 3, toward(land, base, 1.2)), (total, base)]


def _splits(st, base, mv, fit):
    """Splits Sweep (c.BK): she drops into the splits and slides (the game
    moves her, 2–10), the front foot along the floor into the box on the
    hits, arms up in a V; then back up to the crouch."""
    s, k = st.s, st.k
    h0, h1 = mv["hits"][0]["frames"]
    split = base.but(hips={"offset": (0, 0.06 * k, -0.64 * k), "turn": (-4, st.hips_yaw * 0.5, 0)}, spine=(2, -18, 0), chest=(-2, -20, 0),
                     shoulder_L=(-2, -20, 0), shoulder_R=(-2, -20, 0), neck=(-4, -10, 0), head=(-8, -4, 0),
                     foot_L={"pos": s((0.08, 0.76, 0.07)), "aim": (0, 0.96, -0.28), "hint": (0, 0.28, 0.96)}, knee_L=s((0.08, 0.5, 1.2)), toe_L=(0, 0, 0),
                     foot_R={"pos": s((-0.1, -0.72, 0.07)), "aim": (0, -0.96, -0.28), "hint": (0, 0.28, -0.96)}, knee_R=s((-0.1, -0.5, -0.6)), toe_R=(0, 0, 0),
                     hand_L={"pos": s((0.3, 0.3, 1.28)), "aim": (0.3, 0.4, 0.86)},
                     hand_R={"pos": s((-0.3, -0.26, 1.28)), "aim": (-0.3, -0.36, 0.88)}).shaped(fist_L=0.0, fist_R=0.0, open_L=0.9, open_R=0.9, jaw=0.4)
    split = fit.place(split, "foot.L", (0.9, 0.1))
    drop = lerp_pose(base, split, 0.55).shaped(fist_L=0.5, fist_R=0.5)
    total = mv["total"]
    rise = lerp_pose(split, base, 0.55)
    return [(4, drop), (7, split.shaped(jaw=0.2)), (h0, split), (h1, split), (h1 + 8, split.but(head=(-12, 0, 0))),
            (total - 9, rise), (total - 4, toward(split, base, 1.1)), (total, base)]


def _five_six(st, base, mv, fit):
    """Five, Six, Seven, Eight: a hop and a clap overhead, both fists
    hammering down together on the hits, landing in a pose (one arm up,
    hip out) through the recovery."""
    s, k = st.s, st.k
    h0, h1 = mv["hits"][0]["frames"]
    total = mv["total"]
    tuck = {"foot_L": {"pos": s((0.12, 0.2, 0.26)), "turn": (30, -15, 0)}, "foot_R": {"pos": s((-0.14, -0.08, 0.22)), "turn": (30, -45, 0)},
            "knee_L": s((0.12, 0.9, 0.9)), "knee_R": s((-0.14, 0.8, 0.85))}
    dip = st.base(drop=st.drop + 0.1).but(hand_L={"pos": s((0.2, 0.15, 1.0)), "aim": (0.2, 0.3, -0.9)},
                                          hand_R={"pos": s((-0.2, 0.1, 1.0)), "aim": (-0.2, 0.3, -0.9)}).shaped(fist_L=0.0, fist_R=0.0)
    clap = base.but(root={"offset": (0, 0, 0.3 * k)}, chest=(-8, -20, 0), shoulder_L=(-8, -20, 0), shoulder_R=(-8, -20, 0), head=(-16, 0, 0),
                    hand_L={"pos": s((0.03, 0.12, 2.0)), "aim": (0, 0.1, 1), "hint": (-1, 0, 0)},
                    hand_R={"pos": s((-0.03, 0.12, 2.0)), "aim": (0, 0.1, 1), "hint": (1, 0, 0)}, **tuck).shaped(
        fist_L=0.0, fist_R=0.0, open_L=0.2, open_R=0.2, jaw=0.7)

    def hammer(target, up):
        """Both fists together, the rear one's knuckles on the target."""
        p = base.but(root={"offset": (0, 0, up * k)}, hips={"offset": (0, 0.06 * k, -(st.drop + 0.04) * k), "turn": (10, -24, 0)},
                     spine=(12, -20, 0), chest=(20, -18, 0), shoulder_L=(20, -18, 0), shoulder_R=(20, -18, 0), head=(6, 0, 0),
                     hand_R={"pos": s((-0.04, 0.4, 1.5)), "aim": (0, 0.57, -0.82), "hint": (0, 1, 0)},
                     hand_L={"pos": s((0.04, 0.4, 1.5)), "aim": (0, 0.57, -0.82), "hint": (0, 1, 0)}).shaped(fist_L=1.0, fist_R=1.0, jaw=0.9)
        p = fit.place(p, "hand.R", target)
        r = p.parts["hand_R"]["pos"]
        return p.but(hand_L={**p.parts["hand_L"], "pos": (r[0] + 0.08 * k, r[1], r[2])})

    raised = clap.but(root={"offset": (0, 0, 0.12 * k)}, hand_L={"pos": s((0.04, 0.3, 2.0)), "aim": (0, 0.6, 0.8), "hint": (0, 1, 0)},
                      hand_R={"pos": s((-0.04, 0.3, 2.0)), "aim": (0, 0.6, 0.8), "hint": (0, 1, 0)}).shaped(fist_L=1.0, fist_R=1.0, open_L=0.0, open_R=0.0)
    # The finish: hip out to her lead side, the lead arm up pointing at the
    # lights, the rear hand on her hip.
    pose = base.but(hips={"offset": (0.07 * k, 0.02 * k, -0.06 * k), "turn": (0, -30, -10)}, spine=(0, -26, 6), chest=(-4, -24, 10),
                    shoulder_L=(-4, -24, 10), shoulder_R=(-4, -24, 10), head=(-10, 0, -8),
                    hand_L={"pos": s((0.22, 0.12, 2.0)), "aim": (0.2, 0.1, 1), "hint": (0, 1, 0)},
                    hand_R={"pos": s((-0.2, 0.0, 1.0)), "aim": (-0.3, -0.2, -1)}, elbow_R=s((-0.5, -0.15, 1.15))).shaped(
        win=0.6, fist_L=1.0, point_L=1.0, fist_R=0.0, open_R=0.3, jaw=0.2)
    return [(4, dip), (7, lerp_pose(dip, clap, 0.6).but(root={"offset": (0, 0, 0.2 * k)})), (9, clap), (10, clap.but(root={"offset": (0, 0, 0.32 * k)})),
            (h0 - 2, raised), (h0, hammer((0.55, 1.46), 0.0)), (h1, hammer((0.62, 1.12), 0.0)), (h1 + 4, pose), (total - 6, pose.but(head=(-12, 0, -10))),
            (total, base)]


def _splits_drop(st, base, mv, fit):
    """Splits Drop (air, step 28): hanging with the knees tucked and the arms
    up (1–4), then straight down into the full splits, a heel each side
    (the lead one checked in the box), arms out in a V; the game cuts it
    short when she lands."""
    s, k = st.s, st.k
    h0, h1 = mv["hits"][0]["frames"]
    x0, x1, y0, y1 = mv["hits"][0]["box"]
    tuck = base.but(foot_L={"pos": s((0.11, 0.12, 0.5)), "turn": (30, -15, 0)}, foot_R={"pos": s((-0.12, -0.06, 0.46)), "turn": (30, -40, 0)},
                    knee_L=s((0.11, 0.8, 1.0)), knee_R=s((-0.12, 0.7, 0.95)), chest=(-6, -10, 0), head=(-10, 0, 0),
                    hand_L={"pos": s((0.2, 0.05, 1.95)), "aim": (0.2, 0.1, 1)}, hand_R={"pos": s((-0.2, 0.05, 1.95)), "aim": (-0.2, 0.1, 1)}
                    ).shaped(fist_L=0.0, fist_R=0.0, open_L=0.6, open_R=0.6, jaw=0.3)
    split = base.but(hips={"offset": (0, 0.02 * k, -0.5 * k), "turn": (-4, st.hips_yaw * 0.5, 0)}, spine=(2, -18, 0), chest=(-4, -20, 0),
                     shoulder_L=(-4, -20, 0), shoulder_R=(-4, -20, 0), neck=(-4, -10, 0), head=(-6, -4, 0),
                     foot_L={"pos": s((0.08, 0.7, 0.2)), "aim": (0, 0.96, -0.28), "hint": (0, 0.28, 0.96)}, knee_L=s((0.08, 0.5, 1.2)), toe_L=(0, 0, 0),
                     foot_R={"pos": s((-0.1, -0.66, 0.2)), "aim": (0, -0.96, -0.28), "hint": (0, 0.28, -0.96)}, knee_R=s((-0.1, -0.5, -0.6)), toe_R=(0, 0, 0),
                     hand_L={"pos": s((0.42, 0.24, 1.5)), "aim": (0.6, 0.3, 0.75)},
                     hand_R={"pos": s((-0.42, -0.2, 1.5)), "aim": (-0.6, -0.3, 0.75)}).shaped(fist_L=0.0, fist_R=0.0, open_L=0.9, open_R=0.9, jaw=0.8)
    split = fit.place(split, "foot.L", (min(x1 - 0.15, 0.62), y0 + 0.4 * (y1 - y0)))
    return [(2, lerp_pose(base, tuck, 0.6).shaped(**tuck.parts["shapes"])), (4, tuck), (h0 - 1, lerp_pose(tuck, split, 0.6).shaped(**split.parts["shapes"])),
            (h0, split), (h1, split.but(head=(-10, -4, 0))), (mv["total"], split)]


def _air_clap(st, base, mv, fit):
    """Air Clap (j.BP FP, step 28): the hands thrown wide, then clapped
    together high in front of her (over their heads) on the hits."""
    s, k = st.s, st.k
    h0, h1 = mv["hits"][0]["frames"]
    x0, x1, y0, y1 = mv["hits"][0]["box"]
    wide = base.but(chest=(-8, -14, 0), head=(-8, 0, 0), hand_L={"pos": s((0.5, 0.0, 1.6)), "aim": (0.6, 0.2, 0.75)},
                    hand_R={"pos": s((-0.5, -0.05, 1.6)), "aim": (-0.6, 0.2, 0.75)}).shaped(fist_L=0.0, fist_R=0.0, open_L=0.8, open_R=0.8, jaw=0.3)
    clap = base.but(chest=(-10, -18, 0), head=(-14, 0, 0),
                    hand_R={"pos": s((-0.03, 0.3, 1.9)), "aim": (0.1, 0.3, 0.95), "hint": (1, 0, 0)},
                    hand_L={"pos": s((0.03, 0.3, 1.9)), "aim": (-0.1, 0.3, 0.95), "hint": (-1, 0, 0)}).shaped(fist_L=0.0, fist_R=0.0, open_L=0.2, open_R=0.2, jaw=0.7)
    clap = fit.place(clap, "hand.R", (x0 + 0.35 * (x1 - x0), y1 - 0.08))
    r = clap.parts["hand_R"]["pos"]
    clap = clap.but(hand_L={**clap.parts["hand_L"], "pos": (r[0] + 0.06 * k, r[1], r[2])})
    return [(3, wide), (h0 - 1, lerp_pose(wide, clap, 0.75)), (h0, clap), (h1, clap), (h1 + 3, lerp_pose(clap, wide, 0.4)), (mv["total"], base)]


def _heel_drop(st, base, mv, fit):
    """Heel Drop (j.FK BK, step 28): an axe kick in the air, the lead leg
    swung up straight over her head, then the heel brought straight down
    through the spike box, high on 6 to low on 9."""
    s, k = st.s, st.k
    h0, h1 = mv["hits"][0]["frames"]
    x0, x1, y0, y1 = mv["hits"][0]["box"]
    arms = {"hand_L": {"pos": s((0.3, -0.2, 1.4)), "aim": (0.4, -0.6, 0.4)}, "hand_R": {"pos": s((-0.3, -0.25, 1.35)), "aim": (-0.4, -0.6, 0.4)}}
    lean = base.but(hips={"offset": (0, -0.04 * k, 0), "turn": (-24, st.hips_yaw, 0)}, chest=(-16, -24, 0), head=(-6, 0, 0), **arms).shaped(
        fist_L=0.0, fist_R=0.0, open_L=0.6, open_R=0.6, jaw=0.4)
    up = lean.but(foot_L={"pos": s((0.11, 0.3, 1.85)), "aim": (0, 0.3, 0.95), "hint": (0, -0.95, 0.3)}, knee_L=s((0.11, 0.9, 1.8)), toe_L=(0, 0, 0))
    high = fit.place(up.but(foot_L={"pos": s((0.11, 0.45, 1.6)), "aim": (0, 0.9, 0.4), "hint": (0, -0.4, 0.9)}), "foot.L", (x0 + 0.45 * (x1 - x0), y1 - 0.2))
    down = added(lean, hips={"turn": (30, 0, 0)}, chest=(34, 0, 0), head=(24, 0, 0)).shaped(jaw=0.9)
    low = fit.place(down.but(foot_L={"pos": s((0.11, 0.5, 0.1)), "aim": (0, 0.3, -0.95), "hint": (0, 0.95, 0.3)}, knee_L=s((0.11, 1.0, 0.6)), toe_L=(0, 0, 0)),
                    "foot.L", (x0 + 0.45 * (x1 - x0), y0 + 0.25))
    return [(3, up), (h0 - 1, lerp_pose(up, high, 0.6)), (h0, high), (h0 + 1, lerp_pose(high, low, 0.45)), (h1, low), (h1 + 4, low),
            (mv["total"], lerp_pose(low, base, 0.6))]


OVERRIDES = {
    # The specials pass (step 28).
    "Splits Drop": {"limb": "foot.L", "keys": _splits_drop},
    "j.BP FP": {"limb": "hand.R", "keys": _air_clap},
    "j.FK BK": {"limb": "foot.L", "keys": _heel_drop},
    # Star Jump's follow-ups, out of its landing: an uppercut onto her toes, a low sweep.
    "Star Jump FP": {"limb": "hand.L", "style": "rising"},
    "Star Jump BK": {"limb": "foot.L"},
    # The fighting styles pilot (step 25 B): the routine.
    "s.BP": {"keys": _clap_clap},
    "s.FK": {"keys": _high_kick},
    "c.BK": {"limb": "foot.L", "glide": True, "keys": _splits},
    "FP FP": {"step": "beat"},
    "FP FP FK": {"step": "beat"},
    "BP BP": {"step": "beat"},
    "BP BP FK": {"step": "beat"},
    "FK FK": {"step": "beat"},
    "FK FK BP": {"step": "beat"},
    "FP FP FK FK": {"style": "grapevine", "limb": "foot.R"},
    "FP FP FK FK BP": {"keys": _five_six},
    # Air special (step 26): heel first at 45°, the lead leg making the hit.
    "Aerobic Dive": {"limb": "foot.L", "keys": _dive},
    "Aerobic Dive+": {"limb": "foot.L", "keys": _dive},
    "Leg Warmer Lariat": {"style": "spin"},
    "Count of Eight": {"limb": "foot.L"},
    "Star Jump": {"style": "hop", "limb": "hand.L"},
    "Grapevine": {"style": "grapevine", "limb": "foot.R"},
    "td": {"limb": "hand.R"},
    # Two kicks, one off each leg.
    "s.BK": {"alt": ["foot.R", "foot.L"]},
}


def fx(make, b):
    import math

    from lib.fx import ribbon

    def trail(t):
        """Hot pink at the head of the arc, fading paler toward its tail."""
        a = np.arctan2(t.side, t.fwd)
        t.c = P.put(t.c, np.ones(len(t.c), bool), (255, 200, 230), np.clip((a + 2.0) / 4.0, 0, 1) * 0.8)
        return P.light(t, lo=0.95)

    def lariat_trail(p):
        # The Leg Warmer Lariat's ribbon: a pink arc round her at hand height
        # (1.1–1.4 m), 0.6 m out, two-thirds of a turn, tapering to the tail.
        path, n = [], 20
        for i in range(n + 1):
            a = math.radians(120 - 240 * i / n)
            path.append((0.62 * math.sin(a), 0.62 * math.cos(a), 1.25 + 0.06 * math.sin(i / n * math.pi)))
        ribbon(p, "trail", path, lambda i: 0.06 + 0.2 * (1 - i / n), LEOTARD, thick=0.015, paint=trail, across=(0, 0, 1))

    make("fx_lariat_trail", lariat_trail)
