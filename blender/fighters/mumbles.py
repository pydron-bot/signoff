"""Mister Mumbles, a ventriloquist's dummy with no ventriloquist: a big
painted wooden head (glossy staring eyes, rosy cheek circles, a black
painted hairline, old chipped and cracked paint) with a hinged jaw between
two slots, a little maroon felt suit with a bow tie and big buttons, short
trousers and sleeves showing his wooden limbs and ball joints, and puppet
strings running up to a control bar. Trickster: small, light, slippery."""
import numpy as np

from lib import paint as P
from lib.anim import Stance
from lib.body import about, arms, face_paint, grip, head, head_frame, legs, lerp, lit, mouth, torso

ID = "mumbles"
# A first guess: the build sizes him so his big head tops out at the hurtbox.
HEIGHT = 1.24
GIRTH = 0.85
HEAD = 1.43
# His jaw drops straight down between its slots this far (1.80 m reference, before HEAD).
JAW_SLIDE = 0.024

WOOD = (240, 210, 176)
WOOD_DARK = (176, 128, 84)
BARE_WOOD = (196, 150, 100)
SUIT = (124, 30, 44)
SHIRT = (240, 236, 226)
TROUSERS = (40, 34, 40)
SHOES = (16, 14, 16)
HAIR = (26, 20, 18)
RED = (210, 36, 48)
CHEEK = (232, 110, 110)
WHITE = (250, 250, 250)
BLACK = (10, 10, 12)
STRING = (210, 210, 200)
SOCK = (236, 232, 222)
POLE = (120, 90, 60)
# How far past the fingertips String Pull's string reaches.
STRING_PULL = 1.1


def wood(t):
    """Bare, varnished wood: grain running along the limb."""
    t.c = P.put(t.c, P.grain(t.up, t.side + t.fwd, 0.02, 0.008, 40), WOOD_DARK, 0.5)
    return P.light(t)


def felt(t):
    """A soft felt mottle on the suit (broad, so it doesn't shimmer)."""
    mottle = np.sin(t.side * 41 + t.up * 13) * np.sin(t.up * 37 - t.fwd * 29) > 0.55
    t.c = P.shade(t.c, mottle & P.near(t.c, SUIT), 0.9)
    return P.light(t)


def glossy(t):
    """Painted, varnished eyes: a white highlight toward the light."""
    t.c = P.put(t.c, P.facing(t, (0.35, 0.55, 0.75), 0.93), WHITE)
    return P.light(t)


def costume(p, b):
    k, s = b.k, b.head
    _, _, ref = head_frame(b)

    def face(t, c, x, f, u, behind_jaw=True):
        rng = np.random.default_rng(7)
        if behind_jaw:
            # What the jaw uncovers when it drops: the dark of the mouth.
            c = P.put(c, (np.abs(x) < 0.043) & (u < 1.615) & (u > 1.55) & (f > 0.03), (40, 10, 14))
        # The black painted hairline, parted on his left.
        hairline = u > 1.744 - 0.085 * np.clip((0.05 - f) / 0.12, 0, 1)
        parting = (np.abs(x - 0.03) < 0.0035) & (f > -0.02) & (u > 1.74)
        c = P.put(c, hairline & ~parting, HAIR)
        # Rosy cheek circles, glossy.
        for sd in (1, -1):
            disc = (f > 0.04) & P.ellipse(x, u, sd * 0.062, 1.646, 0.021, 0.021)
            c = P.put(c, disc, CHEEK)
            c = P.put(c, disc & P.ellipse(x, u, sd * 0.062 + 0.006, 1.652, 0.006, 0.005), WHITE, 0.8)
            # The jaw's slots, from the mouth's corners down the chin.
            c = P.put(c, (f > 0.03) & (np.abs(x - sd * 0.047) < 0.0035) & (u < 1.62) & (u > 1.548), BLACK)
        # Old paint: chips showing the bare wood, and a few cracks.
        for cx, cu, r in ((0.07, 1.72, 0.012), (-0.03, 1.6, 0.008), (-0.08, 1.67, 0.01), (0.02, 1.75, 0.009)):
            c = P.put(c, (f > 0) & P.ellipse(x, u, cx, cu, r * 1.3, r), BARE_WOOD)
        for _ in range(4):
            x0, u0 = rng.uniform(-0.07, 0.07), rng.uniform(1.6, 1.74)
            ang = rng.uniform(0, np.pi)
            for j in range(3):
                x1, u1 = x0 + 0.012 * np.cos(ang), u0 + 0.012 * np.sin(ang)
                d = np.abs((x - x0) * (u1 - u0) - (u - u0) * (x1 - x0)) / 0.012
                along = ((x - x0) * (x1 - x0) + (u - u0) * (u1 - u0)) / 0.012 ** 2
                c = P.put(c, (f > 0.02) & (d < 0.0012) & (along > 0) & (along < 1), (90, 60, 40), 0.8)
                x0, u0, ang = x1, u1, ang + rng.uniform(-0.8, 0.8)
        return c

    paint_face = face_paint(b, WOOD, extra=face)
    paint_jaw = face_paint(b, WOOD, extra=lambda t, c, x, f, u: face(t, c, x, f, u, behind_jaw=False))

    def hands(t):
        """Wooden mitts with the fingers carved in."""
        c = P.put(t.c, P.grain(t.up, t.side + t.fwd, 0.02, 0.008, 40), WOOD_DARK, 0.35)
        for side in ("L", "R"):
            wr, ht = (np.array(v) for v in b.j[f"hand.{side}"])
            a = (ht - wr) / np.linalg.norm(ht - wr)
            w = np.cross(a, (1.0, 0, 0))
            w /= np.linalg.norm(w)
            d = t.p - wr
            along, across = d @ a, d @ w
            mine = np.sign(t.side) == (1 if side == "L" else -1)
            fingers = (along > 0.45 * np.linalg.norm(ht - wr)) & np.any([np.abs(across - m * 0.012 * k) < 0.0015 for m in (-1, 0, 1)], axis=0)
            c = P.put(c, mine & fingers, (120, 80, 50))
        t.c = c
        return P.light(t)

    c = {"skin": WOOD, "top": SUIT, "bottom": TROUSERS, "shoes": SHOES, "hair": HAIR, "brows": HAIR, "brow_raise": 0.006,
         "eye": (0.026, 0.008, 0.026), "eye_side": 0.042, "pupil_in": 0.0, "whites": WHITE, "eyes": BLACK, "eye_paint": glossy, "planes": False}
    torso(p, b, c, waist=0.93, paint=felt)
    p.hull("shirt", [b.p(x, f, u) for f in (0.104, 0.116) for x, u in ((-0.07, 1.455), (0.07, 1.455), (0, 1.3))], SHIRT, "chest", paint=lit)
    # A big red bow tie, and three big buttons.
    for sd in (1, -1):
        p.hull(f"bow{sd}", [b.p(sd * x, f, u) for f in (0.118, 0.132) for x, u in ((0.01, 1.43), (0.065, 1.455), (0.065, 1.405))], RED, "x_bow", paint=lit)
    p.box("bow_knot", b.p(0, 0.13, 1.43), (0.026, 0.02, 0.026), RED, "x_bow", paint=lit)
    # Little notched lapels, a breast pocket with a red hanky, and a hem.
    for sd in (1, -1):
        p.hull(f"lapel{sd}", [b.p(sd * x, f + d, u) for d in (0, 0.012) for x, f, u in ((0.07, 0.11, 1.455), (0.135, 0.104, 1.4), (0.115, 0.108, 1.37), (0.035, 0.112, 1.3))],
               SUIT, "chest", paint=felt)
    p.box("pocket", b.p(-0.11, 0.108, 1.33), (0.06, 0.01, 0.012), SUIT, "chest", paint=felt)
    p.hull("hanky", [b.p(x, f, u) for f in (0.104, 0.112) for x, u in ((-0.135, 1.336), (-0.085, 1.336), (-0.125, 1.362), (-0.105, 1.37), (-0.092, 1.358))], RED, "chest", paint=lit)
    p.tube("jacket_hem", [(b.p(0, 0, u), (0.14 * b.k * b.g, 0.09 * b.k * b.g), {"hips": 1.0}, SUIT) for u in (0.79, 0.825)], verts=18, paint=felt)
    for i, u in enumerate((1.27, 1.17, 1.07)):
        p.blob(f"button{i}", b.p(0.0, 0.114, u), (0.022, 0.01, 0.022), WHITE, "chest" if u > 1.2 else "spine", paint=glossy)

    hp, hr = head(p, b, c, paint=paint_face, chin="head")
    # The painted mouth line, and the hinged jaw between the slots: a dark
    # cavity behind it shows when it drops (talking, knocking, hurt).
    mouth(p, b, (0, 0.112, 1.62), 0.088, 0.006, RED, kind="line", inner=RED)
    jc = hp(0, 0.09, 1.585)
    drop = {"hurt": about(jc, move=(0, -0.003 * k * s, -0.014 * k * s)),
            "ko": about(jc, move=(0, -0.004 * k * s, -0.028 * k * s)), "win": about(jc, move=(0, -0.002 * k * s, -0.01 * k * s))}
    p.box("mouth_cavity", hp(0, 0.09, 1.602), hr(0.088, 0.03, 0.02), (40, 10, 14), "head")
    p.hull("jaw", [hp(x, f, u) for x, f, u in ((-0.044, 0.112, 1.614), (0.044, 0.112, 1.614), (-0.044, 0.07, 1.614), (0.044, 0.07, 1.614),
                                              (-0.036, 0.108, 1.556), (0.036, 0.108, 1.556), (-0.036, 0.06, 1.548), (0.036, 0.06, 1.548), (0, 0.112, 1.548))],
           WOOD, "jaw", paint=paint_jaw, shapes=drop)

    arms(p, b, {**c, "skin": WOOD}, sleeve=0.45, paint=felt, hand_paint=hands)
    for sd in ("L", "R"):
        el = b.j[f"forearm.{sd}"][0]
        knee = b.j[f"shin.{sd}"][0]
        hip = b.j[f"thigh.{sd}"][0]
        ankle = b.j[f"shin.{sd}"][1]
        # Ball joints at the elbows and knees; short trousers, white socks.
        p.blob(f"elbow_ball.{sd}", el, (b.r(0.055),) * 3, BARE_WOOD, f"forearm.{sd}", paint=wood)
        p.blob(f"knee_ball.{sd}", knee, (b.r(0.07),) * 3, BARE_WOOD, f"shin.{sd}", paint=wood)
        p.seg(f"shorts_hem.{sd}", lerp(hip, knee, 0.62), lerp(hip, knee, 0.72), b.r(0.08), b.r(0.078), TROUSERS, f"thigh.{sd}", verts=12, paint=felt)
        p.seg(f"sock.{sd}", lerp(knee, ankle, 0.72), lerp(knee, ankle, 1.0), b.r(0.056), b.r(0.052), SOCK, f"shin.{sd}", verts=12, paint=lit)
        # A strap over each shoe, buttoned at the side.
        p.box(f"strap.{sd}", (ankle[0], 0.05 * k, 0.085 * k), (0.1 * k, 0.025 * k, 0.012 * k), SHOES, f"foot.{sd}", paint=lit)
        p.blob(f"strap_button.{sd}", (ankle[0] + (0.05 if sd == "L" else -0.05) * k, 0.05 * k, 0.085 * k), (0.008, 0.008, 0.008), WHITE, f"foot.{sd}", paint=glossy)
    legs(p, b, {**c, "bottom": TROUSERS}, shin=WOOD, paint=wood)

    # String Pull: a string out of his lead fist, snapped forward like a whip.
    wr, a, w, L, held_at = grip(b, "L")
    p.seg("pulled_string", tuple(wr + a * 0.5 * L), tuple(wr + a * (L + STRING_PULL)), 0.006, 0.004, STRING, "hand.L", verts=4, mat=1)
    p.held("string", held_at, "pulled_string")

    # Hand Puppet: a little glove puppet of himself sitting up on the rear
    # fist (along the thumb, which is up as he jabs), face to the opponent,
    # before it's set down as the decoy.
    wr, a, w, L, held_at = grip(b, "R")
    n = np.cross(w, a)
    c0 = wr + a * 0.55 * L
    hc = c0 + w * 0.19

    def pt(v):
        return tuple(float(x) for x in v)

    p.seg("glove", pt(c0 - w * 0.03), pt(c0 + w * 0.11), 0.058, 0.05, SUIT, "hand.R", verts=8, mat=1, paint=felt)
    p.blob("glove_collar", pt(c0 + w * 0.12), (0.04, 0.04, 0.03), SHIRT, "hand.R", mat=1, paint=lit)
    p.blob("glove_head", pt(hc), (0.066, 0.066, 0.066), WOOD, "hand.R", mat=1, paint=lit)
    p.blob("glove_hair", pt(hc - a * 0.026 + w * 0.024), (0.058, 0.058, 0.058), HAIR, "hand.R", mat=1, paint=lit)
    p.blob("glove_nose", pt(hc + a * 0.066 - w * 0.008), (0.012, 0.012, 0.012), RED, "hand.R", mat=1, paint=lit)
    for i, sd in enumerate((1, -1)):
        p.blob(f"glove_eye{i}", pt(hc + a * 0.056 + n * sd * 0.026 + w * 0.014), (0.012, 0.012, 0.012), BLACK, "hand.R", mat=1, paint=glossy)
        p.blob(f"glove_cheek{i}", pt(hc + a * 0.05 + n * sd * 0.04 - w * 0.02), (0.012, 0.012, 0.012), CHEEK, "hand.R", mat=1, paint=lit)
        p.blob(f"glove_hand{i}", pt(c0 + w * 0.07 + n * sd * 0.065 + a * 0.02), (0.02, 0.02, 0.02), WOOD, "hand.R", mat=1, paint=wood)
    p.held("puppet", held_at, "glove", "glove_collar", "glove_head", "glove_hair", "glove_nose", "glove_eye0", "glove_eye1",
           "glove_cheek0", "glove_cheek1", "glove_hand0", "glove_hand1")


EXTRAS = "strings"


def extras(p, b):
    """Puppet strings from the head, hands and knees up to a wooden control
    bar overhead. The bar end is on `root`, so the strings hang straight
    whatever the body does (and he leaves on them when he teleports)."""
    top = 3.3
    ends = string_ends(b)
    for bone, (high, low) in ends.items():
        # The middle rides x_string_<bone>, which lags after the end it hangs
        # to (spring.py's follow), so the strings go slack and swing.
        mid = lerp(low, high, 0.5)
        p.tube(f"string_{bone}", [(low, 0.004, {bone: 1.0}, STRING), (mid, 0.004, {f"x_string_{bone}": 1.0}, STRING),
                                  (high, 0.004, {"root": 1.0}, STRING)], verts=3, mat=1)
    # The control bar: a wooden cross.
    p.box("bar", (0, 0, top + 0.02), (0.68, 0.05, 0.04), POLE, "root", mat=1, paint=wood)
    p.box("bar_cross", (0, 0, top + 0.02), (0.05, 0.6, 0.04), POLE, "root", mat=1, paint=wood)
    p.box("bar_handle", (0, 0, top + 0.13), (0.04, 0.04, 0.2), POLE, "root", mat=1, paint=wood)


def string_ends(b):
    """Each string's (bar end, body end), by the bone it's tied to."""
    hz = b.j["head"][0][2]
    top = 3.3
    head_top = (0, -0.005 * b.k * b.head, hz + (1.79 - 1.55) * b.k * b.head)
    return {"head": ((0, 0, top), head_top), "hand.L": ((0.3, 0, top), b.j["hand.L"][0]), "hand.R": ((-0.3, 0, top), b.j["hand.R"][0]),
            "shin.L": ((0.08, 0.25, top), b.j["shin.L"][0]), "shin.R": ((-0.08, -0.25, top), b.j["shin.R"][0])}


def xbones(b):
    """Secondary motion: the bow tie, and slack in the strings: each string
    has a bone from the bar to its end that chases the end with a lag."""
    out = [{"name": "x_bow", "parent": "chest", "head": b.p(0, 0.13, 1.445), "tail": b.p(0, 0.135, 1.39), "stiff": 0.2, "damp": 0.25, "max": 25}]
    for bone, (high, low) in string_ends(b).items():
        out.append({"name": f"x_string_{bone}", "parent": "root", "head": high, "tail": low, "stiff": 0.12, "damp": 0.22, "max": 12,
                    "follow": (bone, low)})
    return out


class STANCE(Stance):
    """Loose-limbed and twitchy, hands low like a dummy that has just learnt to fight."""

    drop = 0.06
    bob = 0.03
    hips_yaw = -20
    chest_yaw = -24
    chest_pitch = 4
    lead_hand = (0.14, 0.32, 1.12)
    rear_hand = (-0.12, 0.2, 1.08)
    lead_aim = (0.2, 0.6, 0.6)
    rear_aim = (-0.1, 0.6, 0.6)
    guard_fist = 0.0
    talk = True
    # A puppet: floppy, swinging past the pose and settling, the jaw right open.
    hit_amount = 1.4
    hit_ease = ((3, 0.0), (5, -0.2), (8, 0.15), (10, 0.05), (12, 0.45))
    hit_ease_heavy = ((4, 0.0), (6, -0.2), (9, 0.05), (12, -0.05), (18, 0.4))
    hit_ease_gut = ((4, 0.0), (6, -0.15), (10, 0.0), (18, 0.45))
    hit_shapes = {"jaw": 1.0}

    def win(self, t=0):
        """A deep, jerky bow."""
        return self.base(drop=0.02).but(
            chest=(45 - 5 * t, 0, 0), spine=(25, 0, 0), head=(20, 0, 0),
            hand_L={"pos": self.s((0.1, 0.22, 1.0)), "aim": (0, 0.3, -1)},
            hand_R={"pos": self.s((-0.38, -0.05, 1.25)), "aim": (-0.6, 0, 0.5)})

    def win_2(self, base):
        """Laughing: head thrown back, jaw clacking, hands on his tummy."""
        def laugh(jaw, shake):
            return self.base(drop=0.03).but(
                chest=(-14, -10, 6 * shake), head=(-24, 0, 14 * shake),
                hand_L={"pos": self.s((0.12, 0.22, 0.98)), "aim": (-0.5, 0.2, -0.6)},
                hand_R={"pos": self.s((-0.12, 0.22, 0.96)), "aim": (0.5, 0.2, -0.6)}).shaped(win=1.0, jaw=jaw)
        keys = [(1, base), (14, laugh(0.0, 0))]
        for i, f in enumerate(range(18, 106, 4)):
            keys.append((f, laugh(1.0 if i % 2 == 0 else 0.1, 1 if i % 4 < 2 else -1)))
        return keys + [(110, laugh(0.0, 0)), (120, laugh(0.0, 0))]

    def intro_2(self, relaxed, base):
        """Slumped and lifeless until the strings snap him up; the head lolls
        round, the jaw clacks, and he's ready."""
        slump = relaxed.but(hips={"offset": (0, 0, -0.06 * self.k), "turn": (0, 0, 0)}, spine=(18, 0, 0), chest=(38, 0, 0), neck=(20, 0, 0), head=(40, 0, 6),
                            hand_L={"pos": self.s((0.24, 0.16, 0.7)), "aim": (0, 0.2, -1)},
                            hand_R={"pos": self.s((-0.24, 0.16, 0.72)), "aim": (0, 0.2, -1)}).shaped(fist_L=0.0, fist_R=0.0)
        loll = relaxed.but(head=(-6, -40, 32)).shaped(jaw=0.9)
        return [(1, slump), (24, slump), (30, relaxed.but(head=(-12, 0, 0))), (40, loll), (46, loll.shaped(jaw=0.0)), (50, loll.shaped(jaw=1.0)),
                (54, loll.shaped(jaw=0.0)), (64, relaxed), (80, base), (90, base)]


OVERRIDES = {
    # Air special (step 26): gone, then dropping feet first from behind.
    "Cut the Strings": {"style": "teleport", "limb": "foot.L"},
    "Cut the Strings+": {"style": "teleport", "limb": "foot.L"},
    "Strings Attached": {"style": "teleport", "limb": "hand.R"},
    "Exit Stage Left": {"style": "teleport"},
    "Knock-Knock": {"style": "knock", "limb": "hand.R"},
    "td": {"limb": "hand.R"},
    # Reaches up for a string from the bar, yanks it down, whips it out.
    "b.FP": {"style": "yank", "tx": 1.45, "held": {"key": "string", "limb": "hand.L", "reach": STRING_PULL, "show": (4, 19)}},
    # The puppet jabs out head first, then is set down (the decoy appears on 12).
    "Hand Puppet": {"held": {"key": "puppet", "limb": "hand.R", "reach": 0.0, "show": (2, 11)}},
}


def fx(make, b):
    def puppet(p):
        # The decoy: a little Mumbles glove puppet on a stand, 0.5 × 1.2 m,
        # to be mistaken for him for a moment: red jacket, pale painted face.
        def face(t):
            x, u = t.side, t.up - 1.02
            front = t.fwd > 0.03
            c = P.put(t.c, (u > 0.075 - 0.08 * np.clip((0.04 - t.fwd) / 0.1, 0, 1)), HAIR)  # painted hair
            for sd in (1, -1):
                c = P.put(c, front & P.ellipse(x, u, sd * 0.055, -0.03, 0.022, 0.022), CHEEK)
            c = P.put(c, front & (np.abs(u + 0.06) < 0.005) & (np.abs(x) < 0.045), RED)
            t.c = c
            return P.light(t)

        p.seg("base", (0, 0, 0), (0, 0, 0.04), 0.22, 0.2, POLE, "fx", verts=10, mat=1, paint=wood)
        p.seg("pole", (0, 0, 0.04), (0, 0, 0.62), 0.02, 0.02, POLE, "fx", verts=6, mat=1, paint=wood)
        p.hull("jacket", [(x, f, u) for x, f, u in ((-0.17, -0.1, 0.58), (0.17, -0.1, 0.58), (-0.17, 0.1, 0.58), (0.17, 0.1, 0.58),
                                                    (-0.12, -0.08, 0.92), (0.12, -0.08, 0.92), (-0.12, 0.08, 0.92), (0.12, 0.08, 0.92))], SUIT, "fx", mat=1, paint=felt)
        p.hull("puppet_shirt", [(x, 0.085, u) for x, u in ((-0.05, 0.92), (0.05, 0.92), (0, 0.78))] + [(x, 0.095, u) for x, u in ((-0.05, 0.92), (0.05, 0.92), (0, 0.78))], SHIRT, "fx", mat=1, paint=lit)
        for sd in (1, -1):
            p.hull(f"puppet_bow{sd}", [(sd * x, f, u) for f in (0.09, 0.105) for x, u in ((0.008, 0.9), (0.045, 0.915), (0.045, 0.885))], RED, "fx", mat=1, paint=lit)
            p.seg(f"puppet_arm{sd}", (sd * 0.13, 0, 0.88), (sd * 0.24, 0.06, 0.76), 0.04, 0.035, SUIT, "fx", verts=6, mat=1, paint=felt)
            p.blob(f"puppet_hand{sd}", (sd * 0.26, 0.07, 0.73), (0.035, 0.035, 0.035), WOOD, "fx", mat=1, paint=wood)
            p.blob(f"puppet_eye{sd}", (sd * 0.045, 0.115, 1.04), (0.028, 0.012, 0.028), WHITE, "fx", mat=1, paint=glossy)
            p.blob(f"puppet_pupil{sd}", (sd * 0.045, 0.126, 1.04), (0.012, 0.006, 0.012), BLACK, "fx", mat=1, paint=glossy)
        p.blob("puppet_head", (0, 0, 1.02), (0.12, 0.125, 0.14), WOOD, "fx", subdiv=2, mat=1, paint=face)
        p.blob("puppet_nose", (0, 0.13, 1.0), (0.016, 0.016, 0.016), CHEEK, "fx", mat=1, paint=lit)

    make("fx_hand_puppet", puppet)
