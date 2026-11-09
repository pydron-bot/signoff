"""Chef Gus Lamarre, host of Kitchen Live (one take, every night, forever):
a big, round-shouldered chef in whites gone grey at the cuffs, a
double-breasted jacket with two rows of buttons, a tall pleated toque that
has seen things, a red neckerchief, a striped apron tied high with a towel
tucked in its string, check trousers and clogs; a waxed moustache, heavy
brows and the warm, fixed grin of a man who has said "and now we let that
rest" ten thousand times. A meat cleaver in his lead hand; a frying pan and
a meat mallet come out of the rear one. Mid-range: the longest reach in the
game and the slowest walk."""
import math

import numpy as np

from lib import paint as P
from lib.anim import DATA, Stance
from lib.body import arms, clump, face_paint, grip, head, head_frame, legs, lit, mouth, torso

ID = "gus"
HEIGHT = 1.85
GIRTH = 1.25
HAND = 1.12

SKIN = (218, 164, 128)
BLUSH = (200, 110, 96)
WHITES = (234, 230, 218)
GREYED = (184, 180, 170)
SEAM = (196, 192, 180)
BUTTON = (246, 244, 236)
KERCHIEF = (186, 40, 38)
APRON = (226, 224, 214)
APRON_STRIPE = (54, 70, 120)
GREASE = (176, 156, 118)
SCORCH = (70, 56, 46)
TOWEL = (232, 222, 196)
TOWEL_STRIPE = (190, 52, 46)
TROUSERS = (70, 70, 74)
CHECK = (200, 198, 190)
CLOGS = (34, 32, 34)
HAIR = (54, 40, 32)
MOUSTACHE = (44, 32, 26)
TEETH = (250, 248, 240)
STEEL = (188, 192, 198)
HANDLE = (66, 44, 32)
IRON = (46, 46, 50)
WOOD = (168, 118, 70)
FLAME_BLUE = (70, 120, 255)
FLAME_ORANGE = (255, 150, 40)
FLAME_YELLOW = (255, 230, 120)
LOGO = (200, 40, 40)


def whites(t):
    """Chef's whites: soft seams and fold lines, greying toward the cuffs."""
    c = t.c
    w = P.near(c, WHITES)
    c = P.shade(c, w & P.lines(t.up + 0.3 * t.side, 0.14, 0.006), 0.9)
    t.c = c
    return P.light(t)


def check(t):
    """Black-and-white check trousers, the chef's kind."""
    c = t.c
    tr = P.near(c, TROUSERS)
    cells = (np.floor(t.side / 0.035) + np.floor(t.up / 0.035) + np.floor(t.fwd / 0.035)) % 2 == 0
    c = P.put(c, tr & cells, CHECK, 0.75)
    t.c = c
    return P.light(t)


def clogs(t):
    t.c = P.put(t.c, P.facing(t, (0.2, 0.6, 0.8), 0.85), (90, 88, 92), 0.5)
    return P.light(t)


def steel(t):
    """A bright steel sheen, and a few nicks along the edge (darker notches)."""
    c = P.put(t.c, P.facing(t, (0.3, 0.5, 0.8), 0.7), (240, 244, 250), 0.6)
    t.c = c
    return P.light(t, lo=0.9)


def costume(p, b):
    k, g = b.k, b.g

    def apron_paint(t):
        """Navy stripes down the apron, grease spots and a scorch."""
        x, u = t.side / (k * g), t.up / k
        c = t.c
        ap = P.near(c, APRON)
        c = P.put(c, ap & P.lines(x, 0.06, 0.012), APRON_STRIPE)
        spots = P.ellipse(x, u, 0.05, 0.86, 0.022, 0.018) | P.ellipse(x, u, -0.07, 0.98, 0.015, 0.012) | P.ellipse(x, u, 0.1, 0.72, 0.012, 0.016) \
            | P.ellipse(x, u, -0.02, 0.66, 0.018, 0.012)
        c = P.put(c, ap & spots, GREASE, 0.6)
        c = P.put(c, ap & P.ellipse(x, u, -0.1, 0.78, 0.04, 0.05), SCORCH, 0.55)
        t.c = c
        return P.light(t)

    def towel_paint(t):
        t.c = P.put(t.c, P.lines(t.up, 0.07, 0.012), TOWEL_STRIPE)
        return P.light(t)

    def chest_paint(t):
        """The Kitchen Live logo embroidered on the left breast."""
        c = whites(t)
        x, u = t.side - 0.1 * k * g, t.up - 1.36 * k
        front = t.fwd > 0.05 * k
        ring = P.ellipse(x, u, 0, 0, 0.038 * k, 0.03 * k) & ~P.ellipse(x, u, 0, 0, 0.032 * k, 0.024 * k)
        ink = P.text(x, u, "KITCHEN", 0.0075 * k, 0, 0.004 * k) | P.text(x, u, "LIVE", 0.009 * k, 0, -0.012 * k)
        return P.put(c, front & (ring | ink), LOGO)

    def moustache_paint(t):
        t.c = P.put(t.c, P.facing(t, (0.2, 0.6, 0.8), 0.8), (110, 86, 70), 0.5)  # the wax shines
        return P.light(t)

    skin = face_paint(b, SKIN, blush=BLUSH)
    c = {"skin": SKIN, "top": WHITES, "bottom": TROUSERS, "shoes": CLOGS, "hair": HAIR, "shoulders": 0.205, "hand": HAND,
         "eye": (0.019, 0.008, 0.013), "lids": 0.35, "brows": MOUSTACHE, "brow_raise": 0.004, "sole": (60, 46, 34)}
    # A big round body: broad at the belly, the shoulders rounded off.
    torso(p, b, c, waist=0.84, paint=whites, shape=[
        (0.80, 0.15, 0.1), (0.88, 0.185, 0.12), (0.98, 0.2, 0.135), (1.08, 0.205, 0.14), (1.17, 0.2, 0.135),
        (1.26, 0.198, 0.124), (1.35, 0.205, 0.114), (1.41, 0.2, 0.104), (1.465, 0.15, 0.076)])
    p.blob("belly", b.p(0, 0.07, 1.06), (b.r(0.16), 0.1 * k * g, 0.15 * k), WHITES, "spine", subdiv=2, paint=whites)
    # The double-breasted front: the overlap panel, two rows of buttons, the
    # logo on the breast, and a mandarin collar under the neckerchief.
    p.hull("jacket_flap", [b.p(x, f, u) for f in (0.13, 0.142) for x, u in ((-0.09, 1.42), (0.11, 1.42), (-0.1, 1.2), (0.12, 1.2))], WHITES, "chest", paint=chest_paint)
    for i, u in enumerate((1.4, 1.31, 1.22)):
        for sd in (1, -1):
            p.blob(f"button{i}{sd}", b.p(sd * 0.065, 0.148, u), (0.011, 0.006, 0.011), BUTTON, "chest", mat=1, paint=lit)
    for i, u in enumerate((1.12, 1.03)):
        for sd in (1, -1):
            p.blob(f"button_low{i}{sd}", b.p(sd * 0.07, 0.172, u), (0.011, 0.006, 0.011), BUTTON, "spine", mat=1, paint=lit)
    p.seg("collar", b.p(0, 0.0, 1.43), b.p(0, 0.004, 1.49), b.r(0.064), b.r(0.06), WHITES, "chest", paint=whites)
    p.seg("neckerchief", b.p(0, 0.006, 1.47), b.p(0, 0.008, 1.5), b.r(0.066), b.r(0.064), KERCHIEF, "chest", verts=10, paint=lit)
    p.hull("kerchief_knot", [b.p(x, f, u) for f in (0.06, 0.1) for x, u in ((-0.03, 1.49), (0.03, 1.49), (-0.02, 1.43), (0.02, 1.43), (0, 1.41))], KERCHIEF, "chest", paint=lit)

    # The striped apron, tied high over the belly and hanging to the knees.
    # Its lower half follows the thighs (so a kick takes it along) and its
    # hem swings on x_apron.
    def apron_weights(q):
        t = min(1.0, max(0.0, (0.98 * k - q[2]) / (0.42 * k)))
        if t <= 0:
            return {"spine": 0.5, "hips": 0.5} if q[2] > 1.04 * k else {"hips": 1.0}
        return {"hips": 1 - t, "thigh.L": t * 0.32, "thigh.R": t * 0.32, "x_apron": t * 0.36}

    pts = []
    for u, front, side in ((1.14, 0.178, 0.19), (1.06, 0.2, 0.205), (0.92, 0.19, 0.2), (0.7, 0.18, 0.2), (0.55, 0.17, 0.19)):
        for sd in (1, -1):
            # Across the front, then wrapping back round the sides.
            pts += [b.p(sd * side * 0.55, front, u), b.p(sd * side, front * 0.45, u), b.p(sd * side * 0.9, 0.0, u)]
    p.hull("apron", pts, APRON, "hips", paint=apron_paint, weigh=apron_weights)
    p.hull("apron_string", b.ring(0.208, 0.15, 0.045, 1.11) + b.ring(0.208, 0.15, 0.045, 1.135), APRON_STRIPE, "spine", paint=lit)
    # The towel tucked into the apron string on his rear hip.
    p.hull("towel", [b.p(x, f, u) for x in (-0.228, -0.246) for f, u in ((0.02, 1.13), (0.12, 1.13), (0.0, 0.84), (0.12, 0.84))],
           TOWEL, "x_towel", paint=towel_paint)

    hp, hr = head(p, b, c, paint=skin, skull=(0.096, 0.106, 0.118))
    mouth(p, b, (0, 0.112, 1.618), 0.07, 0.018, SKIN, kind="grin", inner=(110, 34, 38), teeth=TEETH)
    # The waxed moustache: a heavy bar under the nose, the ends curled up.
    p.hull("moustache", [hp(x, f, u) for x, f, u in ((-0.05, 0.11, 1.636), (0.05, 0.11, 1.636), (-0.055, 0.104, 1.622), (0.055, 0.104, 1.622),
                                                     (-0.02, 0.134, 1.646), (0.02, 0.134, 1.646), (0, 0.136, 1.638), (-0.03, 0.126, 1.626), (0.03, 0.126, 1.626))],
           MOUSTACHE, "head", paint=moustache_paint)
    for sd in (1, -1):
        clump(p, f"moustache_tip{sd}", hp(sd * 0.048, 0.108, 1.63), hp(sd * 0.088, 0.094, 1.67), 0.011 * k, MOUSTACHE, "head", paint=moustache_paint, flat=0.6)
        # Heavy brows: a thick bar over each of the face's own.
        p.hull(f"brow_heavy{sd}", [hp(sd * x, f, u) for x, f, u in ((0.012, 0.118, 1.722), (0.068, 0.106, 1.722), (0.012, 0.114, 1.738),
                                                                      (0.068, 0.1, 1.734), (0.04, 0.122, 1.732), (0.04, 0.108, 1.744))],
               MOUSTACHE, "head", paint=lit)
        clump(p, f"sideburn{sd}", hp(sd * 0.09, 0.03, 1.7), hp(sd * 0.093, 0.04, 1.645), 0.013 * k, HAIR, "head", paint=lit)
    p.blob("hair_back", hp(0, -0.05, 1.66), hr(0.097, 0.075, 0.08), HAIR, "head", paint=lit)

    # The toque: a band round the head, then the tall pleated crown puffing
    # out at the top (the top on x_toque, so it flops).
    def pleats(t):
        x, f = t.side, t.fwd
        ang = np.arctan2(f, x)
        c = P.shade(t.c, np.mod(ang * 12 / (2 * np.pi), 1.0) < 0.18, 0.86)
        t.c = P.put(c, P.ellipse(x, t.up, -0.03 * k, 1.88 * k, 0.03 * k, 0.04 * k) & (f > 0), (200, 190, 168), 0.4)  # a stain that has seen things
        return P.light(t)

    hs = b.k * b.head
    p.seg("toque_band", hp(0, -0.008, 1.715), hp(0, -0.006, 1.765), hs * 0.104, hs * 0.106, WHITES, "head", verts=12, paint=lit)
    p.seg("toque", hp(0, -0.006, 1.762), hp(0, -0.014, 1.9), hs * 0.104, hs * 0.13, WHITES, "head", verts=12, paint=pleats)
    p.blob("toque_top", hp(0, -0.016, 1.905), hr(0.142, 0.142, 0.04), WHITES, "x_toque", paint=pleats)

    arms(p, b, c, sleeve=1.0, cuff=GREYED, paint=whites, hand_paint=skin)
    legs(p, b, c, shoe_h=0.09, paint=check, shoe_paint=clogs)

    # The meat cleaver, in his lead hand: the handle in the fist, the
    # broad blade out past the fingertips.
    wr, a, w, L, _ = grip(b, "L")
    n = np.cross(w, a)

    def at(t, u=0.0, v=0.0):
        return tuple(wr + a * t + w * u + n * v)

    p.seg("cleaver_handle", at(0.25 * L), at(L + 0.05), 0.014, 0.013, HANDLE, "hand.L", verts=6, mat=1, paint=lit)
    p.hull("cleaver", [at(t, u, v) for t in (L + 0.03, L + 0.27) for u in (-0.012, 0.085) for v in (-0.004, 0.004)], STEEL, "hand.L", mat=1, paint=steel)

    # The frying pan, out of his rear hand for the pan moves: the handle in
    # the fist, the pan past the fingertips.
    wr, a, w, L, held_at = grip(b, "R")
    n = np.cross(w, a)

    def rt(t, u=0.0, v=0.0):
        return tuple(wr + a * t + w * u + n * v)

    centre = np.array(rt(L + 0.24))
    p.seg("pan_handle", rt(0.2 * L), rt(L + 0.09), 0.012, 0.012, IRON, "hand.R", verts=6, mat=1, paint=lit)
    p.seg("pan", tuple(centre - n * 0.022), tuple(centre + n * 0.018), 0.15, 0.17, IRON, "hand.R", verts=12, mat=1, paint=steel)
    p.held("pan", held_at, "pan_handle", "pan")
    # The meat mallet, for Tenderise: a wooden handle, a steel head across it.
    head_c = np.array(rt(L + 0.1))
    p.seg("mallet_handle", rt(0.2 * L), rt(L + 0.12), 0.012, 0.014, WOOD, "hand.R", verts=6, mat=1, paint=lit)
    p.seg("mallet_head", tuple(head_c - n * 0.06), tuple(head_c + n * 0.06), 0.035, 0.035, STEEL, "hand.R", verts=6, mat=1, paint=steel)
    p.held("mallet", held_at, "mallet_handle", "mallet_head")


def xbones(b):
    """Secondary motion: the toque's top, the apron's hem, the towel."""
    hp, _, _ = head_frame(b)
    return [
        {"name": "x_toque", "parent": "head", "head": hp(0, -0.014, 1.88), "tail": hp(0, -0.016, 1.93), "stiff": 0.25, "damp": 0.35, "max": 10},
        {"name": "x_apron", "parent": "hips", "head": b.p(0, 0.19, 0.95), "tail": b.p(0, 0.19, 0.55), "stiff": 0.2, "damp": 0.35, "max": 12},
        {"name": "x_towel", "parent": "hips", "head": b.p(-0.237, 0.06, 1.12), "tail": b.p(-0.237, 0.06, 0.84), "stiff": 0.16, "damp": 0.25, "max": 25},
    ]


class STANCE(Stance):
    """Heavy and patient, weight on the back foot, the cleaver resting on
    his shoulder and the rear hand low in front of the belly."""

    drop = 0.05
    bob = 0.008
    hips_yaw = -20
    chest_yaw = -24
    chest_pitch = 0
    lead_foot = (0.13, 0.2)
    rear_foot = (-0.18, -0.2)
    lead_hand = (0.24, 0.1, 1.36)
    rear_hand = (-0.08, 0.36, 1.12)
    lead_aim = (0.1, -0.85, 0.55)
    rear_aim = (0.3, 0.7, 0.4)
    guard_fist = 0.9
    block_up = 1.38
    block_head = -4  # ducking would tip the toque up over the hurtbox

    def base(self, bob=0.0, drop=None):
        # Weight back: the hips sit a little behind the feet.
        pose = super().base(bob, drop)
        hips = pose.parts["hips"]
        off = hips["offset"]
        return pose.but(hips={**hips, "offset": (off[0], off[1] - 0.03 * self.k, off[2])})

    def intro(self, t=0):
        """Tastes from the spoon (the rear hand to his mouth), then a slow
        nod: "Mm. Perfect."."""
        return self.base(drop=0.02).but(
            chest=(-4, -18, 0), head=(-10 + 22 * t, -6, 0),
            hand_R={"pos": self.s((-0.02, 0.24 - 0.1 * t, 1.6 - 0.3 * t)), "aim": (0.4, 0.4, 0.8), "hint": (0, 1, 0)},
        ).shaped(win=0.4 + 0.6 * t, fist_R=0.8)

    def intro_2(self, relaxed, base):
        """Sharpens the cleaver on a steel: the rear fist held out as the
        steel, the blade drawn down it, twice each side."""
        steel = {"pos": self.s((-0.04, 0.36, 1.3)), "aim": (0.6, 0.4, 0.5), "hint": (0, 1, 0)}
        up = relaxed.but(head=(14, -10, 0), chest=(6, -16, 0), hand_R=steel,
                         hand_L={"pos": self.s((0.06, 0.32, 1.42)), "aim": (-0.7, 0.5, 0.3), "hint": (0, 0, 1)})
        down = up.but(hand_L={"pos": self.s((0.0, 0.42, 1.24)), "aim": (-0.7, 0.6, -0.2), "hint": (0, 0, 1)})
        keys = [(1, relaxed)]
        for i, f in enumerate((14, 22, 30, 38, 46, 54)):
            keys.append((f, (up if i % 2 == 0 else down).shaped(fist_R=1.0, fist_L=1.0)))
        return keys + [(66, up.shaped(win=1.0, fist_L=1.0, fist_R=1.0)), (80, base), (90, base)]

    def win(self, t=0):
        """Presents the (invisible) plate to camera on his palm, the
        cleaver lowered."""
        return self.base(drop=0.01).but(
            chest=(-6, -40, 0), head=(-8, -30, 0),
            hand_L={"pos": self.s((0.3, 0.06, 0.9)), "aim": (0.2, 0.2, -1)},
            hand_R={"pos": self.s((-0.02, 0.5, 1.24 + 0.02 * t)), "aim": (-0.2, 0.95, 0.1), "hint": (-1, 0, 0)},
        ).shaped(win=1.0, fist_L=0.9, fist_R=0.0, open_R=0.7)

    def win_2(self, base):
        """A chef's kiss: the rear fingertips to his lips, then flung open,
        head thrown back."""
        kiss = self.base(drop=0.01).but(chest=(-2, -30, 0), head=(-4, -20, 0),
                                        hand_R={"pos": self.s((-0.03, 0.2, 1.62)), "aim": (0.3, 0.5, 0.8), "hint": (0, 1, 0)}).shaped(win=1.0, fist_R=0.7, point_R=0.0)
        fling = kiss.but(chest=(-10, -30, 0), head=(-22, -20, 0),
                         hand_R={"pos": self.s((-0.2, 0.42, 1.78)), "aim": (-0.4, 0.5, 0.8), "hint": (0, 1, 0)}).shaped(win=1.0, fist_R=0.0, open_R=1.0)
        return [(1, base), (24, kiss), (40, kiss.shaped(win=1.0, fist_R=0.85)), (48, fling), (110, fling.but(head=(-18, -20, 0))), (120, fling)]


def _held(key, mid, limb, reach, until=None):
    """A held prop shown from frame 1 to `until` (or two before the end)."""
    total = DATA[ID]["moves"][mid]["total"]
    return {"key": key, "limb": limb, "reach": reach, "show": (1, until or total - 2)}


# The pan swings on the rear-hand normals (BP), the cleaver on the lead hand.
_PAN = ("s.BP", "c.BP", "f.BP", "b.BP", "j.BP", "FP BP", "FK FP BP")
OVERRIDES = {
    **{m: {"held": _held("pan", m, "hand.R", 0.2)} for m in _PAN},
    # The long cleaver swings: s.BK (out to 1.85 m) and the strings it ends.
    "s.BK": {"limb": "hand.L"},
    "BP BK": {"limb": "hand.L"},
    "FP FP BK": {"limb": "hand.L"},
    # Three overhand pounds with the mallet (the last breaks a guard).
    "Tenderise": {"limb": "hand.R", "chop": True, "held": _held("mallet", "Tenderise", "hand.R", 0.08)},
    "Tenderise+": {"limb": "hand.R", "chop": True, "held": _held("mallet", "Tenderise+", "hand.R", 0.08)},
    # A crouching chop along the floor with the cleaver.
    "Chop Chop": {"limb": "hand.L", "chop": True},
    "Chop Chop+": {"limb": "hand.L", "chop": True},
    # The pan is tossed (Flambé) or flipped (Mise en Place) on the spawn frame.
    "Flambé": {"held": _held("pan", "Flambé", "hand.R", 0.0, 16)},
    "Flambé+": {"held": _held("pan", "Flambé+", "hand.R", 0.0, 16)},
    "Mise en Place": {"held": _held("pan", "Mise en Place", "hand.R", 0.0, 14)},
    "Mise en Place+": {"held": _held("pan", "Mise en Place+", "hand.R", 0.0, 16)},
    "td": {"limb": "hand.L"},
}


def fx(make, b):
    def flame(t):
        """Blue at the root, orange to the tips, a yellow core."""
        u = np.clip(t.up / 0.5, 0, 1)
        c = np.where((u < 0.3)[:, None], np.array(FLAME_BLUE, float), np.array(FLAME_ORANGE, float))
        c = P.put(c, (u > 0.3) & (u < 0.55), FLAME_YELLOW, 0.6)
        return c

    def pan_at(p, name, centre, bone="fx"):
        # A frying pan lying flat: the dish, its rim, the handle off to +fwd.
        cx, cf, cu = centre
        p.seg(f"{name}_dish", (cx, cf, cu), (cx, cf, cu + 0.04), 0.15, 0.17, IRON, bone, verts=12, mat=1, paint=steel)
        p.seg(f"{name}_handle", (cx, cf + 0.16, cu + 0.03), (cx, cf + 0.43, cu + 0.05), 0.014, 0.012, IRON, bone, verts=6, mat=1, paint=lit)

    def flambe(p):
        # A patch of fire on the floor, about 0.9 m across and 0.5 m high,
        # round a pan lying on its side in the middle.
        rng = np.random.default_rng(17)
        for i in range(9):
            a = 2 * math.pi * i / 9 + rng.uniform(-0.2, 0.2)
            r = rng.uniform(0.18, 0.4)
            x, f = math.cos(a) * r, math.sin(a) * r
            h = 0.5 * (1.1 - r)
            p.seg(f"flame{i}", (x, f, 0.0), (x + rng.uniform(-0.05, 0.05), f + rng.uniform(-0.05, 0.05), h), 0.07, 0.005, FLAME_BLUE, "fx", verts=5, mat=1, paint=flame)
        p.seg("flame_core", (0, 0, 0), (0, 0, 0.5), 0.14, 0.01, FLAME_ORANGE, "fx", verts=6, mat=1, paint=flame)
        # The pan on its side: the dish standing up, the handle along the floor.
        p.seg("pan_dish", (-0.02, -0.05, 0.17), (0.02, -0.05, 0.17), 0.17, 0.15, IRON, "fx", verts=12, mat=1, paint=steel)
        p.seg("pan_handle", (0.0, 0.1, 0.03), (0.0, 0.38, 0.02), 0.014, 0.012, IRON, "fx", verts=6, mat=1, paint=lit)

    def pan(p):
        # A frying pan 0.6 m long with its handle, flat side down, origin at
        # its bottom centre.
        pan_at(p, "pan", (0.0, -0.13, 0.0))

    make("fx_flambe", flambe)
    make("fx_pan", pan)
