"""Dale Storm, Channel 0's weatherman (1987): a camel check blazer with 1987
shoulder pads and a pocket square, the widest striped tie on air, a
side-parted quiff, a fixed, too-white grin under permanently raised
eyebrows, a "CH 0" pin and the forecast clicker. Zoner: keeps you out."""
import numpy as np

from lib import paint as P
from lib.anim import Stance, added, lerp_pose, toward
from lib.body import arms, clump, face_paint, grip, hair_cover, head, head_frame, legs, lerp, lit, mouth, torso

ID = "dale"
# What gives off light (step 23 C), on the effect meshes only: the body's
# emission belongs to the game's hit-flash tint.
EMISSION = {r"curl\d+_.*": 1.5, r"core|bolt\d+_.*": 3, r"streak\d+": 1.5}
HEIGHT = 1.80

SKIN = (226, 184, 150)
TAN = (214, 150, 104)
LIPS = (184, 104, 92)
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
CANOPY = (40, 50, 96)
CANE = (120, 74, 40)
STEEL = (196, 200, 206)
# The umbrella's tip, this far past his rear hand's fingertips (Umbrella Jab).
UMBRELLA = 0.66


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
    # The wide tie, 1987's widest, and its knot. It swings in two pieces
    # (x_tie, x_tie_end), blended across the middle.
    def tie_weights(q):
        t = min(1.0, max(0.0, (1.33 * b.k - q[2]) / (0.1 * b.k)))
        return {"x_tie": 1 - t, "x_tie_end": t} if t < 1 else {"x_tie_end": 1.0}

    p.hull("tie", [b.p(x, f, u) for f in (0.118, 0.13) for x, u in ((-0.022, 1.43), (0.022, 1.43), (-0.04, 1.33), (0.04, 1.33), (-0.046, 1.27), (0.046, 1.27),
                                                                    (-0.05, 1.2), (0.05, 1.2), (0, 1.12))], TIE, "chest", paint=tie, weigh=tie_weights)
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
    # The shirt collar's points over the lapels, and a hem round the blazer.
    for sd in (1, -1):
        p.hull(f"collar_point{sd}", [b.p(sd * x, f, u) for x, f, u in ((0.012, 0.118, 1.47), (0.06, 0.104, 1.478), (0.042, 0.118, 1.43),
                                                                     (0.012, 0.11, 1.47), (0.06, 0.096, 1.478), (0.042, 0.11, 1.43))], SHIRT, "chest", paint=lit)
    p.tube("jacket_hem", [(b.p(0, 0, u), (0.14 * b.k * b.g, 0.09 * b.k * b.g), {"hips": 1.0}, JACKET) for u in (0.79, 0.825)], verts=18, paint=suit)
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
    mouth(p, b, (0, 0.111, 1.63), 0.086, 0.026, SKIN, kind="grin", inner=(110, 30, 40), teeth=TEETH, lips=LIPS, skin=(222, 172, 134))  # skin: his face under the tan
    # Helmet hair, parted on his left and swept right, with a quiff in front.
    p.blob("hair", hp(0, -0.01, 1.725), hr(0.1, 0.112, 0.07), HAIR, "head", subdiv=2, paint=hair)
    p.blob("hair_back", hp(0, -0.04, 1.665), hr(0.097, 0.08, 0.085), HAIR, "head", paint=hair)
    for i, f in enumerate((0.06, 0.0, -0.05, -0.09)):
        clump(p, f"hair_sweep{i}", hp(0.045, f, 1.762), hp(-0.1, f - 0.01, 1.705), 0.026 * b.k, HAIR, "head", paint=hair, flat=0.3)
    # The quiff: three broad, flat waves rolling forward off the parting.
    for i, (x, u) in enumerate(((0.035, 1.778), (0.0, 1.784), (-0.04, 1.776))):
        clump(p, f"quiff{i}", hp(x + 0.03, 0.0, u - 0.004), hp(x - 0.02, 0.118, u + 0.004), 0.034 * b.k, HAIR, "x_quiff", paint=hair, flat=0.35)
    # Locks over the back and sides, and the top swept to his right off the parting.
    hair_cover(p, b, "hair_lock", (0, -0.04, 1.665), (0.097, 0.08, 0.085), HAIR, paint=hair, rows=((-15, 9), (15, 10)), az=(75, 285), flow=(6, -30), width=0.026)
    hair_cover(p, b, "hair_top", (0, -0.01, 1.725), (0.1, 0.112, 0.07), HAIR, paint=hair, rows=((20, 7), (50, 5)), az=(-60, 200), flow=(-40, -12),
               width=0.028, lift=0.99, flat=0.3, mirror=False, skip=lambda a, e: -40 < a < 40)
    for sd in (1, -1):
        clump(p, f"sideburn{sd}", hp(sd * 0.088, 0.03, 1.715), hp(sd * 0.091, 0.04, 1.66), 0.012 * b.k, HAIR, "head", paint=hair)

    arms(p, b, c, sleeve=1.0, pads=True, paint=suit, hand_paint=skin, cuff_rim=SHIRT)
    legs(p, b, c, paint=suit)

    # The forecast clicker, in his lead hand.
    wr, ht = b.j["hand.L"]
    a, e = lerp(wr, ht, 0.1), lerp(wr, ht, 0.7)
    p.seg("clicker", (a[0] - 0.01, a[1] + 0.05, a[2]), (e[0] - 0.01, e[1] + 0.07, e[2]), 0.016, 0.014, PLASTIC, "hand.L", verts=6, mat=1)
    p.blob("clicker_button", (e[0] - 0.01, e[1] + 0.08, e[2] + 0.01), (0.009, 0.009, 0.009), BUTTON, "hand.L", mat=1)

    # The station umbrella, furled, in his rear hand for Umbrella Jab only:
    # a cane crook behind the fist, the navy canopy with a yellow strap, a
    # steel ferrule at the tip.
    wr, a, w, L, held_at = grip(b, "R")

    def at(t, side=0.0):
        return tuple(wr + a * t + w * side)

    def canopy(t):
        t.c = P.put(t.c, P.lines(t.up + t.side * 3, 0.05, 0.004), (24, 30, 64), 0.6)
        return P.light(t)

    tip = L + UMBRELLA
    p.seg("umbrella_cane", at(0.4 * L), at(-0.12), 0.015, 0.015, CANE, "hand.R", verts=6, mat=1, paint=lit)
    p.seg("umbrella_crook", at(-0.12), at(-0.16, 0.05), 0.015, 0.015, CANE, "hand.R", verts=6, mat=1, paint=lit)
    p.seg("umbrella_hook", at(-0.16, 0.05), at(-0.12, 0.09), 0.015, 0.014, CANE, "hand.R", verts=6, mat=1, paint=lit)
    p.seg("umbrella_shaft", at(0.6 * L), at(L + 0.1), 0.008, 0.008, STEEL, "hand.R", verts=5, mat=1, paint=lit)
    p.seg("umbrella_furl", at(L + 0.08), at(L + 0.26), 0.012, 0.042, CANOPY, "hand.R", verts=8, mat=1, paint=canopy)
    p.seg("umbrella_canopy", at(L + 0.26), at(tip - 0.07), 0.042, 0.012, CANOPY, "hand.R", verts=8, mat=1, paint=canopy)
    p.seg("umbrella_strap", at(L + 0.3), at(L + 0.34), 0.041, 0.039, TIE_STRIPE, "hand.R", verts=8, mat=1, paint=lit)
    p.seg("umbrella_ferrule", at(tip - 0.07), at(tip), 0.01, 0.004, STEEL, "hand.R", verts=5, mat=1, paint=lit)
    p.held("umbrella", held_at, "umbrella_cane", "umbrella_crook", "umbrella_hook", "umbrella_shaft", "umbrella_furl",
           "umbrella_canopy", "umbrella_strap", "umbrella_ferrule")


def xbones(b):
    """Secondary motion: the tie in two pieces, and the quiff."""
    hp, _, _ = head_frame(b)
    return [
        {"name": "x_tie", "parent": "chest", "head": b.p(0, 0.13, 1.43), "tail": b.p(0, 0.135, 1.3), "stiff": 0.25, "damp": 0.45, "max": 18},
        {"name": "x_tie_end", "parent": "x_tie", "head": b.p(0, 0.135, 1.3), "tail": b.p(0, 0.13, 1.12), "stiff": 0.22, "damp": 0.4, "max": 22},
        {"name": "x_quiff", "parent": "head", "head": hp(0, 0.0, 1.776), "tail": hp(0, 0.118, 1.78), "stiff": 0.35, "damp": 0.35, "max": 8},
    ]


class STANCE(Stance):
    """Upright and smiling: a weatherman's half-turn to camera, hands up."""

    hit_shapes = {"win": 0.6}  # the smile stays on under the hurt

    def intro(self, t=0):
        """The round intro: pointing back at the map behind him (his left),
        talking it through, then squaring up."""
        return self.base(drop=0.03).but(
            chest=(-2, 20 + 8 * t, 0), head=(-6, 30 - 20 * t, 0),
            hand_L={"pos": self.s((0.42, 0.08, 1.58 + 0.06 * t)), "aim": (1, 0.15, 0.45), "hint": (0, 1, 0)},
        ).shaped(fist_L=1.0, point_L=1.0, win=0.6)

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


def _downpour(boosted):
    def keys(st, base, mv):
        """Downpour (air): the umbrella up over his head and he hangs under it
        (1–16, 1–20 boosted), the free arm hurling hail down and forward on
        12 (and 15 and 18 boosted)."""
        s = st.s
        brolly = base.but(chest=(-6, -10, 0), head=(-10, -4, 0),
                          hand_R={"pos": s((-0.12, 0.02, 1.86)), "aim": (0.05, 0.05, 1)}).shaped(fist_R=1.0, jaw=0.3)
        wind = brolly.but(hand_L={"pos": s((0.3, -0.25, 1.55)), "aim": (0.3, -0.2, 1)}, chest=(-10, -24, 0)).shaped(fist_L=1.0)
        hurl = brolly.but(hand_L={"pos": s((0.22, 0.6, 0.95)), "aim": (0.15, 0.7, -0.7)}, chest=(14, 10, 0)).shaped(open_L=1.0, jaw=0.9)
        out = [(4, brolly), (9, wind), (12, hurl)]
        if boosted:
            out += [(13, wind), (15, hurl), (16, wind), (18, hurl)]
        hang = 20 if boosted else 16
        out += [(hang, hurl.but(chest=(6, 0, 0))), (hang + 8, lerp_pose(brolly, base, 0.5)), (mv["total"], base)]
        return out
    return keys


def _heat_lightning_plus(st, base, mv, fit):
    """Heat Lightning+ (step 27): the plain uppercut taken off the floor. A
    deep coil, the fist down by the knee, then a leap that drives it up
    through the top of the taller box, the free arm flung down behind; he
    lands on 15 with the arm still up."""
    s, k = st.s, st.k
    h0, h1 = mv["hits"][0]["frames"]
    total = mv["total"]
    x0, x1, y0, y1 = mv["hits"][0]["box"]
    lf, rf = base.parts["foot_L"], base.parts["foot_R"]
    coil = st.base(drop=st.drop + 0.2).but(
        hips={"offset": (0, -0.04 * k, -(st.drop + 0.2) * k), "turn": (18, st.hips_yaw + 14, 0)}, spine=(16, 10, 0), chest=(26, 16, 0),
        shoulder_L=(26, 16, 0), shoulder_R=(26, 16, 0), head=(-6, -10, 0),
        hand_L={"pos": s((0.16, 0.18, 0.72)), "aim": (0, 0.4, 1), "hint": (0, 1, 0)},
        hand_R={"pos": s((-0.26, -0.12, 1.02)), "aim": (-0.3, -0.5, -0.6)}).shaped(fist_L=1.0, fist_R=0.6, jaw=0.2)
    toes = {"foot_L": {"pos": s((st.lead_foot[0], st.lead_foot[1], 0.1)), "turn": (40, st.lead_foot_yaw, 0)},
            "foot_R": {"pos": s((st.rear_foot[0], st.rear_foot[1], 0.1)), "turn": (40, st.rear_foot_yaw, 0)}}
    # Off the floor: the feet hang under him, toes pointed.
    hang = {"foot_L": {"pos": s((st.lead_foot[0], st.lead_foot[1] + 0.04, 0.06)), "turn": (60, st.lead_foot_yaw, 0)},
            "foot_R": {"pos": s((st.rear_foot[0], st.rear_foot[1] - 0.04, 0.14)), "turn": (70, st.rear_foot_yaw, 0)},
            "knee_R": s((-0.12, 0.4, 0.5))}

    def drive(lift, target, lean, feet):
        p = base.but(root={"offset": (0, 0, lift * k)}, hips={"offset": (0, 0.04 * k, 0), "turn": (-8 - lean, st.hips_yaw - 10, 0)},
                     spine=(-4 - lean, -20, 0), chest=(-10 - lean, -30, 0), shoulder_L=(-10 - lean, -30, 0), shoulder_R=(-10 - lean, -30, 0),
                     head=(-18 - lean, -10, 0), hand_L={"pos": s((0.12, 0.4, 2.0)), "aim": (0, 0.25, 1), "hint": (0, 1, 0)},
                     hand_R={"pos": s((-0.3, -0.24, 0.98 + lift)), "aim": (-0.4, -0.6, -0.5)}, **feet).shaped(fist_L=1.0, fist_R=0.0, open_R=0.6, jaw=0.9)
        return fit.place(p, "hand.L", target)

    launch = drive(0.06, (min(x1 - 0.2, 0.5), y0 + 0.5 * (y1 - y0)), 0, toes)
    peak = drive(0.24, (min(x1 - 0.25, 0.42), y1 - 0.1), 8, hang)
    top = drive(0.28, (0.36, y1 + 0.02), 10, hang)  # past the box once the hit is done
    land = added(top.but(root={"offset": (0, 0, 0)}, foot_L=lf, foot_R=rf), hips={"offset": (0, 0, -0.12 * k)}, spine=(10, 0, 0), chest=(14, 0, 0), head=(16, 0, 0))
    return [(1, base), (3, lerp_pose(base, coil, 0.7).shaped(**coil.parts["shapes"])), (h0 - 2, coil), (h0 - 1, toward(coil, base, -0.05)),
            (h0, launch), (h0 + 2, lerp_pose(launch, peak, 0.7).shaped(**peak.parts["shapes"])), (h1, peak), (h1 + 3, top), (h1 + 4, top),
            (15, land), (18, land), (28, lerp_pose(land, base, 0.55).shaped(fist_L=0.6)), (total, base)]


def _both_hands(p):
    """The lead hand on the umbrella too, a fist's width up the cane from the rear."""
    r = p.parts["hand_R"]
    a = r["aim"]
    return p.but(hand_L={**r, "pos": tuple(c - 0.1 * d for c, d in zip(r["pos"], a))}).shaped(fist_L=1.0)


def _brolly(fit, base, target, both=False):
    """The pose with the umbrella's tip at target (fwd, up), from the rear hand."""
    p = fit.fit(base, "hand.R", (target[0] - 0.05, target[0] + 0.05, target[1] - 0.05, target[1] + 0.05), report=False,
                tx=target[0], ty=target[1], extra=UMBRELLA).shaped(fist_R=1.0)
    return _both_hands(p) if both else p


def _low_pressure(st, base, mv, fit):
    """Low Pressure (air, step 28): the umbrella snapped shut and raised in
    both hands, hanging (1–5), then driven straight down like a spear, the
    tip leading under him, the legs folded up behind out of its way."""
    s, k = st.s, st.k
    total = mv["total"]
    x0, x1, y0, y1 = mv["hits"][0]["box"]
    raised = base.but(chest=(-8, -20, 0), head=(-6, -6, 0),
                      hand_R={"pos": s((-0.06, 0.2, 1.95)), "aim": (0, 0.15, -1), "hint": (0, 1, 0)}).shaped(fist_R=1.0, jaw=0.4)
    raised = _both_hands(raised).but(foot_L={"pos": s((0.1, 0.1, 0.42)), "turn": (30, -15, 0)}, foot_R={"pos": s((-0.1, -0.02, 0.4)), "turn": (30, -40, 0)})
    legs = {"foot_L": {"pos": s((0.1, -0.22, 0.4)), "turn": (70, -10, 0)}, "foot_R": {"pos": s((-0.1, -0.3, 0.46)), "turn": (70, -30, 0)},
            "knee_L": s((0.1, 0.5, 0.5)), "knee_R": s((-0.1, 0.45, 0.55))}
    lean = base.but(chest=(30, -10, 0), spine=(14, -10, 0), head=(30, 0, 0), hips={"offset": (0, 0, 0), "turn": (10, st.hips_yaw, 0)}, **legs)
    spear = _brolly(fit, lean, ((x0 + x1) * 0.4, y0 + 0.08), both=True).shaped(jaw=0.9)
    return [(3, raised), (5, toward(raised, base, -0.05)), (7, spear), (total - 2, spear.but(head=(26, 0, 0))), (total, lerp_pose(spear, base, 0.5))]


def _updraft(st, base, mv, fit):
    """Updraft (j.FK FP, step 28): the umbrella hooked up under them, low and
    forward on 5 to high on 8; hanging, no drift."""
    h0, h1 = mv["hits"][0]["frames"]
    x0, x1, y0, y1 = mv["hits"][0]["box"]
    low = _brolly(fit, base.but(chest=(14, -20, 0)), (x0 + 0.5 * (x1 - x0), y0 + 0.2))
    high = _brolly(fit, base.but(chest=(-10, -30, 0), head=(-12, 0, 0)), (x0 + 0.45 * (x1 - x0), y1 - 0.15))
    drawn = _brolly(fit, base.but(chest=(20, 0, 0)), (0.05, 0.1))
    return [(3, drawn), (h0, low), (h1, high), (h1 + 3, added(high, chest=(-4, 0, 0))), (mv["total"], base)]


def _downburst(st, base, mv, fit):
    """Downburst (j.BP BK, step 28): the umbrella raised over his head in both
    hands and swung down through the whole spike box, high on 6 to low on 9."""
    s = st.s
    h0, h1 = mv["hits"][0]["frames"]
    x0, x1, y0, y1 = mv["hits"][0]["box"]
    up = _both_hands(base.but(chest=(-14, -10, 0), head=(-10, 0, 0),
                              hand_R={"pos": s((-0.04, -0.12, 1.98)), "aim": (0, -0.6, 0.8), "hint": (0, 1, 0)}).shaped(fist_R=1.0, jaw=0.5))
    high = _brolly(fit, base.but(chest=(-6, -10, 0)), (x0 + 0.5 * (x1 - x0), y1 - 0.15), both=True).shaped(jaw=0.9)
    low = _brolly(fit, base.but(chest=(34, -10, 0), spine=(12, -10, 0), head=(24, 0, 0)), (x0 + 0.5 * (x1 - x0), y0 + 0.15), both=True).shaped(jaw=0.9)
    return [(3, up), (h0 - 1, toward(up, base, -0.05)), (h0, high), (h1, low), (h1 + 4, low), (mv["total"], lerp_pose(low, base, 0.6))]


def _thunderclap(st, base, mv, fit):
    """Thunderclap (Isobar Lasso BP, step 28): out of the lasso's reel-in, the
    umbrella swept up from low under their chin, onto his toes, and held
    high; it puts them on the floor."""
    s, k = st.s, st.k
    h0, h1 = mv["hits"][0]["frames"]
    total = mv["total"]
    x0, x1, y0, y1 = mv["hits"][0]["box"]
    toes = {"foot_L": {"pos": s((st.lead_foot[0], st.lead_foot[1], 0.1)), "turn": (40, st.lead_foot_yaw, 0)},
            "foot_R": {"pos": s((st.rear_foot[0], st.rear_foot[1], 0.1)), "turn": (40, st.rear_foot_yaw, 0)}}
    crouch = st.base(drop=st.drop + 0.14).but(chest=(24, 10, 0), spine=(10, 6, 0), head=(-4, -6, 0))
    drawn = _brolly(fit, crouch, (-0.25, 0.15)).shaped(jaw=0.3)
    rise = base.but(root={"offset": (0, 0, 0.04 * k)}, chest=(-8, -40, 0), spine=(-2, -30, 0), head=(-10, -10, 0), **toes)
    hit = _brolly(fit, crouch.but(chest=(6, -20, 0)), (x0 + 0.55 * (x1 - x0), y0 + 0.3), both=True)
    top = _brolly(fit, rise, (x0 + 0.4 * (x1 - x0), y1 - 0.12), both=True).shaped(jaw=0.9)
    over = _brolly(fit, rise.but(chest=(-14, -40, 0)), (0.3, 2.2), both=True)
    return [(4, drawn), (h0 - 3, toward(drawn, base, -0.05)), (h0, hit), (h1, top), (h1 + 4, over), (h1 + 8, over),
            (h1 + 14, lerp_pose(over.but(root={"offset": (0, 0, 0)}, foot_L=base.parts["foot_L"], foot_R=base.parts["foot_R"]), base, 0.5)), (total, base)]


def _held(show):
    return {"key": "umbrella", "limb": "hand.R", "reach": UMBRELLA, "show": show}


OVERRIDES = {
    # The specials pass (step 28): the umbrella's tip makes every hit.
    "Low Pressure": {"limb": "hand.R", "keys": _low_pressure, "held": _held((2, 34))},
    "j.FK FP": {"limb": "hand.R", "keys": _updraft, "held": _held((2, 13))},
    "j.BP BK": {"limb": "hand.R", "keys": _downburst, "held": _held((2, 16))},
    "Isobar Lasso BP": {"limb": "hand.R", "keys": _thunderclap, "held": _held((2, 26))},
    # Air specials (step 26): the umbrella held overhead, hail from the free hand.
    "Downpour": {"keys": _downpour(False), "held": {"key": "umbrella", "limb": "hand.R", "reach": UMBRELLA, "show": (1, 16)}},
    "Downpour+": {"keys": _downpour(True), "held": {"key": "umbrella", "limb": "hand.R", "reach": UMBRELLA, "show": (1, 20)}},
    # The lasso does the reaching (it's an effect); Dale throws it with the lead hand.
    "Isobar Lasso": {"limb": "hand.L", "prop": True},
    "Heat Lightning": {"limb": "hand.L", "style": "rising"},
    "Heat Lightning+": {"limb": "hand.L", "style": "rising", "keys": _heat_lightning_plus},
    "td": {"limb": "hand.R"},
    # The longest poke in the game: the umbrella, held out at arm's length.
    "s.BK": {"limb": "hand.R", "tx": 1.6, "held": {"key": "umbrella", "limb": "hand.R", "reach": UMBRELLA, "show": (5, 29)}},
    # His anti-air: the cross angled up through the top of its box.
    "s.BP": {"ty": 1.75},
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
