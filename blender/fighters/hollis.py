"""Hollis Bey, night security guard of the transmitter building: broad,
heavy and tired. A faded, creased grey-blue uniform shirt (SECURITY on the
shoulder, a BEY name tag, a TRANSMITTER SITE badge, a coffee stain) with
epaulettes, pockets and a tie; navy trousers, a duty belt with pouches, the
flashlight and the key ring; a peaked cap, a heavy moustache, stubble,
heavy-lidded eyes, big hands and heavy boots. Grappler: slow, huge throws."""
import numpy as np

from lib import paint as P
from lib.anim import Stance
from lib.body import arms, clump, face_paint, grip, head, head_frame, legs, lerp, lit, mouth, ring, torso

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
    # The duty belt, with pouches, the buckle, the flashlight and the keys.
    p.hull("belt", b.ring(0.178, 0.112, 0.035, 0.93) + b.ring(0.178, 0.112, 0.035, 0.995), BELT, "hips", paint=lit)
    p.box("buckle", b.p(0, 0.12, 0.962), (0.055, 0.012, 0.045), METAL, "hips", mat=1, paint=lit)
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
    # The peaked cap: an eight-sided crown, the band, the visor and the badge.
    p.seg("cap", hp(0, -0.005, 1.7), hp(0, 0.005, 1.775), b.k * b.head * 0.106, b.k * b.head * 0.12, NAVY, "head", verts=8, paint=lit)
    p.seg("cap_top", hp(0, 0.005, 1.775), hp(0, 0.005, 1.782), b.k * b.head * 0.12, b.k * b.head * 0.1, NAVY, "head", verts=8, paint=lit)
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
        p.seg(f"boot_top.{s}", lerp(knee, ankle, 0.45), lerp(knee, ankle, 0.52), b.r(0.064), b.r(0.062), BOOTS, f"shin.{s}", verts=10, paint=boots)


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


OVERRIDES = {
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
