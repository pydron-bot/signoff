"""Dale Storm, Channel 0's weatherman (1987): a camel check blazer with 1987
shoulder pads and a pocket square, the widest striped tie on air, a
side-parted quiff, a fixed, too-white grin under permanently raised
eyebrows, a "CH 0" pin and the forecast clicker. Zoner: keeps you out."""
import numpy as np

from lib import paint as P
from lib.anim import Stance
from lib.body import arms, clump, face_paint, head, legs, lerp, lit, mouth, torso

ID = "dale"
HEIGHT = 1.80

SKIN = (226, 184, 150)
TAN = (214, 150, 104)
JACKET = (184, 146, 98)
CHECK = (150, 112, 70)
LAPEL = (150, 116, 76)
TROUSERS = (92, 72, 58)
SHIRT = (238, 234, 224)
TIE = (186, 52, 42)
TIE_STRIPE = (232, 196, 92)
HAIR = (78, 52, 34)
HAIR_LIGHT = (130, 92, 58)
SHOES = (44, 32, 26)
TEETH = (255, 255, 255)
DARK = (34, 28, 28)
PLASTIC = (58, 58, 64)
BUTTON = (220, 40, 40)
SQUARE = (120, 170, 220)
PIN = (200, 30, 40)
ICE = (206, 232, 246)
WIND = (170, 205, 225)
ISOBAR = (236, 242, 255)
HEAT = (255, 214, 90)


def suit(t):
    """A faint 1980s check on the blazer; a crease down the trousers."""
    c = t.c
    j = P.near(c, JACKET)
    check = P.lines(t.side, 0.06, 0.007) | P.lines(t.up, 0.06, 0.007)
    c = P.put(c, j & check, CHECK, 0.55)
    c = P.shade(c, P.near(t.c, TROUSERS) & P.lines(t.side, 0.1, 0.006), 0.85)
    t.c = c
    return P.light(t)


def tie(t):
    """Diagonal stripes, 1987 wide."""
    t.c = P.put(t.c, P.lines(t.side + t.up * 0.9, 0.045, 0.012), TIE_STRIPE)
    return P.light(t)


def hair(t):
    """Strands swept from the parting, and a highlight on top."""
    c = P.shade(t.c, P.lines(t.fwd * 0.6 + t.up, 0.022, 0.005), 0.78)
    t.c = P.put(c, P.facing(t, (0.2, 0.6, 0.8), 0.75), HAIR_LIGHT, 0.6)
    return P.light(t)


def costume(p, b):
    c = {"skin": SKIN, "top": JACKET, "bottom": TROUSERS, "shoes": SHOES, "hair": HAIR, "brow_raise": 0.008, "eye": (0.021, 0.008, 0.016)}
    torso(p, b, c, waist=0.93, paint=suit)  # the blazer covers the hips
    p.hull("shirt", [b.p(-0.075, 0.104, 1.455), b.p(0.075, 0.104, 1.455), b.p(0, 0.104, 1.25),
                     b.p(-0.075, 0.116, 1.455), b.p(0.075, 0.116, 1.455), b.p(0, 0.116, 1.25)], SHIRT, "chest", paint=lit)
    # The wide tie, 1987's widest, and its knot.
    p.hull("tie", [b.p(x, f, u) for f in (0.118, 0.13) for x, u in ((-0.022, 1.43), (0.022, 1.43), (-0.05, 1.2), (0.05, 1.2), (0, 1.12))], TIE, "chest", paint=tie)
    p.hull("tie_knot", [b.p(x, f, u) for f in (0.118, 0.138) for x, u in ((-0.028, 1.462), (0.028, 1.462), (-0.016, 1.425), (0.016, 1.425))], TIE, "chest", paint=tie)
    for s in (1, -1):
        # Wide notched lapels: a lower and an upper piece.
        p.hull(f"lapel{s}", [b.p(s * x, f + d, u) for d in (0, 0.012) for x, f, u in ((0.075, 0.112, 1.455), (0.15, 0.108, 1.4), (0.13, 0.11, 1.37), (0.03, 0.112, 1.25))], LAPEL, "chest", paint=lit)
        p.hull(f"lapel_top{s}", [b.p(s * x, f + d, u) for d in (0, 0.01) for x, f, u in ((0.06, 0.108, 1.47), (0.12, 0.1, 1.462), (0.14, 0.104, 1.418), (0.08, 0.11, 1.44))], LAPEL, "chest", paint=lit)
    for i, u in enumerate((1.2, 1.1)):
        p.blob(f"button{i}", b.p(0.012, 0.116, u), (0.012, 0.006, 0.012), DARK, "spine" if u < 1.16 else "chest")
    # A pocket square in the breast pocket.
    p.box("pocket", b.p(0.12, 0.107, 1.315), (0.07, 0.01, 0.012), CHECK, "chest", paint=lit)
    p.hull("pocket_square", [b.p(x, f, u) for f in (0.104, 0.112) for x, u in ((0.095, 1.322), (0.145, 1.322), (0.105, 1.35), (0.122, 1.36), (0.138, 1.348))], SQUARE, "chest", paint=lit)
    p.seg("collar", b.p(0, 0.005, 1.43), b.p(0, 0.008, 1.485), b.r(0.06), b.r(0.056), SHIRT, "chest", paint=lit)
    p.box("mic", b.p(-0.1, 0.122, 1.385), (0.016, 0.014, 0.026), DARK, "chest", mat=1)

    pin_at = b.p(0.105, 0.128, 1.395)

    def pin(t):
        # The station logo: a white "CH 0" on the red pin.
        ink = P.text(t.side - pin_at[0], t.up - pin_at[2], "CH0", 0.011, 0, -0.0055)
        return P.put(P.light(t), ink, (255, 240, 220))

    p.seg("pin", b.p(0.105, 0.12, 1.395), pin_at, 0.017, 0.017, PIN, "chest", verts=10, mat=1, paint=pin)

    def forehead(t, col, x, f, u):
        # Permanently raised brows leave lines across the forehead.
        for k in range(3):
            col = P.shade(col, (f > 0.05) & (np.abs(u - (1.742 + 0.01 * k + 4 * x * x)) < 0.0018) & (np.abs(x) < 0.05), 0.84)
        return col

    skin = face_paint(b, SKIN, tan=TAN, extra=forehead)
    hp, hr = head(p, b, c, paint=skin)
    mouth(p, b, (0, 0.111, 1.63), 0.086, 0.026, SKIN, kind="grin", inner=(110, 30, 40), teeth=TEETH)
    # Helmet hair, parted on his left and swept right, with a quiff in front.
    p.blob("hair", hp(0, -0.01, 1.725), hr(0.1, 0.112, 0.07), HAIR, "head", subdiv=2, paint=hair)
    p.blob("hair_back", hp(0, -0.04, 1.665), hr(0.097, 0.08, 0.085), HAIR, "head", paint=hair)
    for i, f in enumerate((0.06, 0.0, -0.05, -0.09)):
        clump(p, f"hair_sweep{i}", hp(0.045, f, 1.762), hp(-0.1, f - 0.01, 1.705), 0.026 * b.k, HAIR, "head", paint=hair, flat=0.3)
    # The quiff: three broad, flat waves rolling forward off the parting.
    for i, (x, u) in enumerate(((0.035, 1.778), (0.0, 1.784), (-0.04, 1.776))):
        clump(p, f"quiff{i}", hp(x + 0.03, 0.0, u - 0.004), hp(x - 0.02, 0.118, u + 0.004), 0.034 * b.k, HAIR, "head", paint=hair, flat=0.35)
    for sd in (1, -1):
        clump(p, f"sideburn{sd}", hp(sd * 0.088, 0.03, 1.715), hp(sd * 0.091, 0.04, 1.66), 0.012 * b.k, HAIR, "head", paint=hair)

    arms(p, b, c, sleeve=1.0, pads=True, paint=suit, hand_paint=skin, cuff_rim=SHIRT)
    legs(p, b, c, paint=suit)

    # The forecast clicker, in his lead hand.
    wr, ht = b.j["hand.L"]
    a, e = lerp(wr, ht, 0.1), lerp(wr, ht, 0.7)
    p.seg("clicker", (a[0] - 0.01, a[1] + 0.05, a[2]), (e[0] - 0.01, e[1] + 0.07, e[2]), 0.016, 0.014, PLASTIC, "hand.L", verts=6, mat=1)
    p.blob("clicker_button", (e[0] - 0.01, e[1] + 0.08, e[2] + 0.01), (0.009, 0.009, 0.009), BUTTON, "hand.L", mat=1)


class STANCE(Stance):
    """Upright and smiling: a weatherman's half-turn to camera, hands up."""

    def win_2(self, base):
        """"…and that's the forecast": hand on hip, clicking the map along."""
        def present(click=0.0):
            return self.base(drop=0.01).but(
                chest=(-4, -48, 0), head=(-8, -18, 8),
                hand_L={"pos": self.s((0.28, 0.42, 1.62 - 0.05 * click)), "aim": (0.2, 1, 0.45 - 0.3 * click), "hint": (0, 1, 0)},
                hand_R={"pos": self.s((-0.22, 0.0, 1.0)), "aim": (0.1, -0.4, -1)}, elbow_R=self.s((-0.5, -0.1, 1.15)),
            ).shaped(win=1.0, fist_L=0.9, fist_R=0.2)
        keys = [(1, base), (18, present())]
        for f in (40, 58, 76):
            keys += [(f, present(1)), (f + 5, present())]
        return keys + [(120, present())]

    def intro_2(self, relaxed, base):
        """Straightens the tie, smooths the quiff, then squares up."""
        tie = relaxed.but(head=(14, 0, 0),
                          hand_L={"pos": self.s((0.03, 0.17, 1.44)), "aim": (0, 0.2, 1)},
                          hand_R={"pos": self.s((-0.02, 0.16, 1.36)), "aim": (0, 0.2, 1)})
        tug = tie.but(hand_L={"pos": self.s((0.03, 0.18, 1.5)), "aim": (0, 0.2, 1)}, head=(6, 0, 0))
        quiff = relaxed.but(head=(-6, 0, 0), hand_L={"pos": self.s((0.08, 0.1, 1.86)), "aim": (-0.3, -0.6, 0.3)}).shaped(win=1.0)
        return [(1, relaxed), (18, tie), (26, tug), (34, tie), (50, quiff), (62, quiff.but(hand_L={"pos": self.s((0.06, -0.06, 1.88)), "aim": (-0.3, -0.8, 0)})), (80, base), (90, base)]


OVERRIDES = {
    # The lasso does the reaching (it's an effect); Dale throws it with the lead hand.
    "Isobar Lasso": {"limb": "hand.L", "prop": True},
    "Heat Lightning": {"limb": "hand.L", "style": "rising"},
    "td": {"limb": "hand.R"},
}


def fx(make, b):
    import math

    from lib.fx import bolt, ribbon

    def wind(t):
        """Streaks along the gusts, and a few big ice flecks."""
        c = P.put(t.c, P.lines(t.fwd * 0.4 + t.up, 0.06, 0.012), (240, 250, 255), 0.7)
        t.c = P.put(c, P.lines(t.side, 0.17, 0.03) & P.lines(t.up + t.fwd, 0.13, 0.03), ICE)
        return P.light(t, lo=0.9)

    def cold_front(p):
        # A rolling wall of wind, 0.7 × 1.4 m: three curls breaking forward
        # (each spirals up the back and over the top toward the opponent),
        # stacked, with the gusts' ribbons lying across the stage.
        for c, (u0, r0) in enumerate(((0.3, 0.3), (0.72, 0.28), (1.12, 0.26))):
            path = []
            for i in range(17):
                a = math.radians(-90 - 330 * i / 16)
                r = r0 * (1 - 0.72 * i / 16)
                path.append((0.0, -r * math.cos(a) * 0.9 + 0.05, u0 + r * math.sin(a) * -1 * 0.95 - r0 * 0.05))
            ribbon(p, f"curl{c}_", path, lambda i: 0.66 - 0.025 * i, WIND, thick=0.025, paint=wind)

    def hail(p):
        # A hailstone cluster, about 0.6 × 0.5 m.
        for i, (x, f, u, r) in enumerate(((0, 0, 0.25, 0.14), (0.12, 0.08, 0.12, 0.09), (-0.13, -0.05, 0.14, 0.1), (0.05, -0.12, 0.38, 0.08), (-0.06, 0.13, 0.4, 0.07))):
            p.blob(f"stone{i}", (x, f, u), (r, r, r * 0.9), ICE, "fx", mat=1, paint=lit)

    def lasso(p):
        # A curling isobar from the hand out to 2.6 m, 0.8 to 1.4 m up, with a
        # loop at the end, and pressure readings along it.
        path = []
        for i in range(25):
            s_ = i / 24
            path.append((0.0, 0.6 + 1.7 * s_, 1.1 + 0.18 * math.sin(s_ * math.pi * 3) * (1 - s_ * 0.4)))
        c0 = (0.0, 2.35, 1.1)
        for i in range(1, 17):
            a = math.radians(-90 + 360 * i / 16)
            path.append((0.0, c0[1] + 0.25 * math.sin(a + math.pi / 2) * -1 + 0.0, c0[2] + 0.28 * math.sin(a)))
        ribbon(p, "isobar", path, 0.05, ISOBAR, thick=0.03, paint=lit)
        for i, (f, u, text) in enumerate(((0.95, 1.33, "1004"), (1.6, 0.9, "996"), (2.2, 1.43, "988"))):
            def number(t, f=f, u=u, text=text):
                ink = P.text(-(t.side) * 0 + (t.fwd - f), t.up - u, text, 0.07, 0.0, -0.035)
                t.c = P.put(t.c, ink, (30, 40, 90))
                return P.light(t, lo=0.95)

            p.box(f"pressure{i}", (0.0, f, u), (0.02, 0.24, 0.1), (240, 244, 250), "fx", mat=1, paint=number)
        p.blob("low", (0.0, 2.35, 1.1), (0.04, 0.12, 0.12), (230, 60, 50), "fx", mat=1, paint=lit)

    def heat_lightning(p):
        # A crackle round the rising fist: bolts out from a hot core, about
        # 0.7 m across, centred on the fist (the game puts it there).
        rng = np.random.default_rng(11)
        p.blob("core", (0, 0, 0), (0.07, 0.07, 0.09), (255, 250, 210), "fx", mat=1)
        for i in range(7):
            a = 2 * math.pi * i / 7
            bolt(p, f"bolt{i}_", (0, 0, 0), (math.cos(a) * 0.6, math.sin(a) * 0.6, rng.uniform(-0.2, 1.0)), 0.36, HEAT, rng, paint=lit)

    def tape_skip(p):
        # The VHS-smear afterimage a Tape Skip leaves behind (every fighter's):
        # torn horizontal bars trailing back from a body-sized smear, cyan and
        # magenta like a bad tracking line.
        rng = np.random.default_rng(5)

        def smear(t):
            band = np.floor(t.up / 0.03).astype(int) % 3
            c = P.put(t.c, band == 0, (90, 240, 255), 0.75)
            t.c = P.put(c, band == 1, (255, 70, 200), 0.75)
            return t.c

        for i in range(16):
            u = 0.08 + 1.7 * i / 15
            length = rng.uniform(0.35, 1.1) * (1.0 - 0.35 * abs(u - 1.0))
            p.box(f"streak{i}", (0.0, -length / 2 + rng.uniform(-0.1, 0.1), u), (0.04, length, 0.07), (200, 200, 220), "fx", mat=1, paint=smear)

    make("fx_cold_front", cold_front)
    make("fx_hail", hail)
    make("fx_isobar_lasso", lasso)
    make("fx_heat_lightning", heat_lightning)
    make("fx_tape_skip", tape_skip)
