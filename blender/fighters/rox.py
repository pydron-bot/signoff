"""Rox Vega, host of Feel the Burn at Dawn, still exercising since 1983:
a high-cut hot-pink leotard with a lightning flash and a belt, shiny purple
tights, slouchy ribbed teal leg warmers, a two-colour FEEL THE BURN
headband, sweatbands, big permed hair, white high-tops with pink laces,
bright eye shadow and a determined grin. Rushdown: fast, relentless."""
import numpy as np

from lib import paint as P
from lib.anim import Stance
from lib.body import about, arms, clump, face_paint, head, head_frame, legs, lerp, lit, mouth, torso

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
        p.seg(f"sweatband.{s}", lerp(el, wr, 0.74), lerp(el, wr, 0.96), b.r(0.05), b.r(0.048), WARMERS, f"forearm.{s}", verts=10, paint=warmers)
    legs(p, b, {**c, "bottom": TIGHTS}, shin=TIGHTS, shoe_h=0.12, paint=tights, shoe_paint=shoes)
    for s in ("L", "R"):
        knee, ankle = b.j[f"shin.{s}"]
        # Slouchy leg warmers in rings from mid-shin to the ankle, and the
        # high-tops' collars.
        for i, (t0, t1, r0, r1) in enumerate(((0.32, 0.5, 0.066, 0.07), (0.5, 0.68, 0.071, 0.067), (0.68, 0.86, 0.068, 0.073), (0.86, 0.97, 0.072, 0.064))):
            p.seg(f"warmer{i}.{s}", lerp(knee, ankle, t0), lerp(knee, ankle, t1), b.r(r0), b.r(r1), WARMERS, f"shin.{s}", verts=10, paint=warmers)
        p.seg(f"hightop.{s}", (ankle[0], 0.0, 0.07 * k), (ankle[0], 0.0, 0.15 * k), b.r(0.062), b.r(0.058), SHOES, f"shin.{s}", verts=10, paint=shoes)


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


OVERRIDES = {
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
