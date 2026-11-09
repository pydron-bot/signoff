"""Margaret Okafor, anchor of The Eleven O'Clock News (1987): a burgundy
pinstripe power suit with big square shoulder pads and a nipped waist, a
cream blouse with a pussy-bow, a slim skirt to the knee, dark tights and low
court shoes, pearl earrings and a single strand of pearls, a sharp
chin-length bob parted on her left, deep lipstick, one eyebrow a touch
higher than the other, and a sheaf of script pages in her lead hand.
Footsies: calm, precise, never off-script."""
import math

import numpy as np

from lib import paint as P
from lib.anim import Stance
from lib.body import arms, clump, face_paint, grip, hair_cover, head, head_frame, legs, lit, mouth, torso

ID = "margaret"
HEIGHT = 1.75
GIRTH = 0.92

SKIN = (122, 78, 56)
SUIT = (112, 30, 46)
STRIPE = (168, 92, 104)
LAPEL = (92, 24, 38)
BLOUSE = (240, 228, 204)
TIGHTS = (40, 30, 36)
SHOES = (34, 18, 24)
HAIR = (30, 24, 24)
HAIR_LIGHT = (84, 66, 62)
LIPS = (128, 26, 48)
PEARL = (240, 234, 220)
PIN = (200, 30, 40)
PAPER = (242, 238, 226)
INK = (60, 60, 72)
GOLD = (214, 176, 90)
STATIC = (150, 150, 158)
LIVE_RED = (226, 34, 40)


def pinstripe(t):
    """A fine chalk pinstripe on the suit."""
    c = P.put(t.c, P.near(t.c, SUIT) & P.lines(t.side, 0.032, 0.004), STRIPE, 0.55)
    t.c = c
    return P.light(t)


def glossy(t):
    """Pearls: a white highlight up and to the front."""
    t.c = P.put(t.c, P.facing(t, (0.2, 0.6, 0.8), 0.8), (255, 255, 255), 0.8)
    return P.light(t, lo=0.85)


def hair_paint(t):
    """A glossy bob: strands down from the parting, a sheen on the crown."""
    c = P.shade(t.c, P.lines(t.side * 0.4 + t.fwd * 0.3, 0.016, 0.004), 0.8)
    t.c = P.put(c, P.facing(t, (0.2, 0.5, 0.85), 0.8), HAIR_LIGHT, 0.6)
    return P.light(t)


def pages_paint(t):
    """Typed script: lines of type down the page, a header bar."""
    c = t.c
    face = np.abs(t.n[:, 0]) > 0.5
    u = t.up
    c = P.put(c, face & P.lines(u, 0.018, 0.006) & (np.mod(t.fwd * 13.0 + np.floor(u / 0.018) * 0.37, 1.0) < 0.82), INK, 0.7)
    return P.light(t, lo=0.92)


def costume(p, b):
    k = b.k

    def lips_paint(t, c, x, f, u):
        return P.put(c, (f > 0.06) & P.ellipse(x, u, 0, 1.626, 0.034, 0.013), LIPS)

    skin = face_paint(b, SKIN, eyes_shadow=(92, 52, 64), blush=(150, 72, 66), extra=lips_paint)
    c = {"skin": SKIN, "top": SUIT, "bottom": SUIT, "shoes": SHOES, "hair": HAIR, "shoulders": 0.2, "eye": (0.021, 0.008, 0.015),
         "brows": HAIR, "brow_lift": (0.008, 0.0), "heel_h": 0.035}
    # The jacket: nipped at the waist, flaring over the hips to its hem.
    torso(p, b, c, waist=0.84, paint=pinstripe, shape=[
        (0.80, 0.13, 0.085), (0.88, 0.162, 0.096), (0.98, 0.152, 0.092), (1.08, 0.136, 0.086), (1.17, 0.142, 0.09),
        (1.26, 0.158, 0.1), (1.35, 0.182, 0.104), (1.43, 0.2, 0.1), (1.475, 0.15, 0.072)])
    # The blouse in the jacket's V, and the pussy-bow at the throat.
    p.hull("blouse", [b.p(x, f, u) for f in (0.098, 0.11) for x, u in ((-0.07, 1.46), (0.07, 1.46), (0, 1.29))], BLOUSE, "chest", paint=lit)
    p.blob("bow_knot", b.p(0, 0.112, 1.44), (0.02 * k, 0.016 * k, 0.018 * k), BLOUSE, "chest", paint=lit)
    for sd in (1, -1):
        p.hull(f"bow_loop{sd}", [b.p(sd * x, f, u) for f in (0.108, 0.122) for x, u in ((0.012, 1.44), (0.06, 1.462), (0.06, 1.422))], BLOUSE, "chest", paint=lit)
        clump(p, f"bow_tail{sd}", b.p(sd * 0.008, 0.116, 1.432), b.p(sd * 0.03, 0.118, 1.36), 0.012 * k, BLOUSE, "chest", paint=lit, flat=0.3)
        # Wide lapels down to the waist.
        p.hull(f"lapel{sd}", [b.p(sd * x, f + d, u) for d in (0, 0.012) for x, f, u in ((0.07, 0.108, 1.46), (0.15, 0.1, 1.39), (0.12, 0.104, 1.36), (0.02, 0.108, 1.2))],
               LAPEL, "chest", paint=pinstripe)
    p.blob("button", b.p(0.0, 0.1, 1.15), (0.012, 0.006, 0.012), GOLD, "spine", mat=1, paint=glossy)
    # The jacket's hem over the hips, and a flap over each hip pocket.
    p.tube("jacket_hem", [(b.p(0, 0, u), (0.135 * k * b.g, 0.09 * k * b.g), {"hips": 1.0}, SUIT) for u in (0.79, 0.82)], verts=18, paint=pinstripe)
    for sd in (1, -1):
        p.hull(f"pocket_flap{sd}", [b.p(sd * x, f, u) for x, f, u in ((0.06, 0.098, 0.9), (0.135, 0.084, 0.9), (0.06, 0.1, 0.875), (0.135, 0.086, 0.875),
                                                                    (0.06, 0.088, 0.9), (0.135, 0.074, 0.9))], LAPEL, "hips", paint=pinstripe)
    # The station's pin on her lapel.
    pin_at = b.p(-0.11, 0.122, 1.39)

    def pin(t):
        ink = P.text(t.side - pin_at[0], t.up - pin_at[2], "CH0", 0.011, 0, -0.0055)
        return P.put(P.light(t), ink, (255, 240, 220))

    p.seg("pin", b.p(-0.11, 0.112, 1.39), pin_at, 0.016, 0.016, PIN, "chest", verts=10, mat=1, paint=pin)
    # A single strand of pearls, dipping at the front.
    for i in range(15):
        a = math.pi * (i / 14)
        x, f = 0.085 * math.cos(a), 0.02 + 0.085 * math.sin(a)
        u = 1.455 - 0.05 * math.sin(a) ** 2
        p.blob(f"pearl{i}", b.p(x, f, u), (0.009 * k,) * 3, PEARL, "chest", mat=1, paint=glossy)

    hp, hr = head(p, b, c, paint=skin)
    mouth(p, b, (0, 0.111, 1.626), 0.052, 0.01, LIPS, kind="lips", inner=(70, 24, 34), lips=LIPS, skin=SKIN)
    for sd in (1, -1):
        p.blob(f"earring{sd}", hp(sd * 0.098, 0.01, 1.632), hr(0.011, 0.011, 0.011), PEARL, "head", mat=1, paint=glossy)
    # The bob: a glossy cap parted on her left, the fringe swept across, and
    # two sharp side panels to the chin, longer at the front (x_bob.L / .R).
    p.blob("hair", hp(0, -0.012, 1.72), hr(0.104, 0.116, 0.074), HAIR, "head", subdiv=2, paint=hair_paint)
    p.blob("hair_back", hp(0, -0.055, 1.65), hr(0.1, 0.075, 0.085), HAIR, "head", paint=hair_paint)
    for i, (x0, x1, f) in enumerate(((0.04, -0.1, 0.085), (0.045, -0.07, 0.05), (0.035, -0.09, 0.015))):
        clump(p, f"fringe{i}", hp(x0, f - 0.02, 1.788), hp(x1, f + 0.03, 1.712), 0.026 * k, HAIR, "head", paint=hair_paint, flat=0.3)
    # Sleek layers down the back of the bob.
    hair_cover(p, b, "layer", (0, -0.055, 1.65), (0.1, 0.075, 0.085), HAIR, paint=hair_paint, rows=((-20, 7), (12, 8)), az=(110, 250), flow=(0, -35),
               width=0.03, lift=1.0, flat=0.25)
    for sd, bone in ((1, "x_bob.L"), (-1, "x_bob.R")):
        # From inside the cap, flaring out to a sharp line at the chin.
        pts = []
        for f, u0 in ((0.07, 1.588), (0.02, 1.596), (-0.04, 1.606), (-0.085, 1.62)):
            pts += [hp(sd * 0.075, f, 1.74), hp(sd * 0.1, f, 1.72), hp(sd * 0.122, f, u0), hp(sd * 0.094, f, u0 + 0.01)]
        p.hull(f"bob{sd}", pts, HAIR, bone, paint=hair_paint)

    arms(p, b, c, sleeve=1.0, pads=True, paint=pinstripe, hand_paint=skin, cuff_rim=BLOUSE)
    for s, sd in (("L", 1), ("R", -1)):
        # 1987's shoulder pads: big and square.
        p.box(f"shoulder_pad.{s}", b.p(sd * 0.2, 0.0, 1.452), (0.12 * k, 0.13 * k, 0.05 * k), SUIT, f"shoulder.{s}", paint=pinstripe)
    # The slim skirt: the thighs are skirt-coloured to the knee, and a panel
    # between them makes it one skirt (it stays on the hips when she kicks).
    legs(p, b, {**c, "bottom": SUIT}, shin=TIGHTS, shoe_h=0.075, paint=pinstripe, cuffs=False)
    def with_thighs(q):
        # The panel follows the thighs as it goes down (half each), so it folds
        # with them when she kicks or tucks.
        t = min(1.0, max(0.0, (0.94 * k - q[2]) / (0.36 * k)))
        return {"hips": 1 - t, "thigh.L": t / 2, "thigh.R": t / 2} if t > 0 else {"hips": 1.0}

    p.hull("skirt", [b.p(x, f, u) for x in (-0.11, 0.11) for u, f in ((0.94, -0.085), (0.94, 0.09), (0.58, -0.13), (0.58, 0.13))]
           + [b.p(x, 0.0, 0.76) for x in (-0.15, 0.15)], SUIT, "hips", paint=pinstripe, weigh=with_thighs)
    p.hull("skirt_hem", [b.p(x, f, u) for u in (0.575, 0.6) for x in (-0.115, 0.115) for f in (-0.135, 0.135)], LAPEL, "hips", paint=lit, weigh=with_thighs)

    # The script: a sheaf of pages in her lead hand, fluttering on x_pages.
    wr, a, w, L, _ = grip(b, "L")
    n = np.cross(w, a)

    def pg(t, u, v=0.0):
        return tuple(wr + a * t + w * u + n * v)

    pts = [pg(t, u, v) for t in (0.45 * L, 0.45 * L + 0.22) for u in (-0.02, 0.15) for v in (-0.006, 0.006)]
    p.hull("pages", pts, PAPER, "x_pages", mat=1, paint=pages_paint)
    p.hull("pages_clip", [pg(t, u, v) for t in (0.45 * L - 0.01, 0.45 * L + 0.02) for u in (0.045, 0.09) for v in (-0.009, 0.009)], GOLD, "x_pages", mat=1, paint=lit)

    # Reading glasses, out of her rear hand for intro_2 only.
    wr, a, w, L, held_at = grip(b, "R")
    n = np.cross(w, a)
    g0 = wr + a * (L + 0.02)
    for i in range(2):
        centre = g0 + w * (0.03 + 0.065 * i)
        p.seg(f"glasses_lens{i}", tuple(centre - n * 0.003), tuple(centre + n * 0.003), 0.026, 0.026, (40, 32, 30), "hand.R", verts=8, mat=1, paint=lit)
    p.seg("glasses_bridge", tuple(g0 + w * 0.05), tuple(g0 + w * 0.08), 0.004, 0.004, (40, 32, 30), "hand.R", verts=4, mat=1)
    p.seg("glasses_arm", tuple(g0 + w * 0.0), tuple(g0 + w * 0.0 - a * 0.1), 0.003, 0.003, (40, 32, 30), "hand.R", verts=4, mat=1)
    p.held("glasses", held_at, "glasses_lens0", "glasses_lens1", "glasses_bridge", "glasses_arm")


def xbones(b):
    """Secondary motion: the script pages, and the bob's two side panels."""
    hp, _, _ = head_frame(b)
    wr, a, w, L, _ = grip(b, "L")
    top = wr + a * 0.45 * L + w * 0.065
    return [
        {"name": "x_pages", "parent": "hand.L", "head": tuple(top), "tail": tuple(top + a * 0.22), "stiff": 0.3, "damp": 0.35, "max": 12},
        {"name": "x_bob.L", "parent": "head", "head": hp(0.1, 0.0, 1.74), "tail": hp(0.1, 0.02, 1.59), "stiff": 0.25, "damp": 0.4, "max": 10},
        {"name": "x_bob.R", "parent": "head", "head": hp(-0.1, 0.0, 1.74), "tail": hp(-0.1, 0.02, 1.59), "stiff": 0.25, "damp": 0.4, "max": 10},
    ]


class STANCE(Stance):
    """Upright and still: a newsreader's posture, the pages held low in
    front, barely a breath."""

    drop = 0.04
    bob = 0.006
    hips_yaw = -22
    chest_yaw = -28
    chest_pitch = 4
    lead_hand = (0.1, 0.3, 1.12)
    rear_hand = (-0.06, 0.2, 1.32)
    lead_aim = (-0.1, 0.85, 0.35)
    lead_foot = (0.11, 0.18)
    rear_foot = (-0.14, -0.18)
    guard_fist = 0.6
    hit_amount = 0.9

    def hit_flavour(self, name, pose, base):
        """Composed: the script stays clutched to her chest, and the head
        goes but the shoulders stay square."""
        if name == "hit_body_heavy":
            return pose
        crouched = name == "hit_crouch"
        z = 1.3 - (self.crouch_drop + self.hit_crouch_drop if crouched else 0)
        sq = {p: (pose.parts[p][0], base.parts[p][1], pose.parts[p][2]) for p in ("chest", "shoulder_L", "shoulder_R")}
        return pose.but(**sq, hand_L={"pos": self.s((0.06, 0.1 if not crouched else 0.24, z - 0.1)), "aim": (-0.3, 0.1, 1), "hint": (0, 1, 0)}
                        ).shaped(fist_L=0.6, open_L=0.0)

    def intro(self, t=0):
        """"Good evening.": squaring the pages on the desk that isn't there,
        then looking up into the camera (her right)."""
        return self.base(drop=0.02).but(
            chest=(2, -30 - 10 * t, 0), head=(4 - 10 * t, -20 - 25 * t, 0),
            hand_L={"pos": self.s((0.08, 0.3, 1.12 + 0.02 * t)), "aim": (-0.3, 0.4, -0.85)},
            hand_R={"pos": self.s((-0.04, 0.3, 1.14 + 0.02 * t)), "aim": (0.3, 0.4, -0.85)},
        ).shaped(win=0.35 * t, fist_L=0.6, fist_R=0.5)

    def intro_2(self, relaxed, base):
        """Takes off her reading glasses, folds them away, and looks up."""
        on = relaxed.but(head=(4, -10, 0), hand_R={"pos": self.s((-0.07, 0.16, 1.63)), "aim": (0.2, 0.3, 1), "hint": (0, 1, 0)}).shaped(glasses=1.0, fist_R=0.6)
        down = relaxed.but(head=(-4, -30, 0), hand_R={"pos": self.s((-0.14, 0.24, 1.22)), "aim": (0.2, 0.6, 0.3)}).shaped(glasses=1.0, fist_R=0.6, win=0.3)
        away = relaxed.but(head=(-4, -36, 0), hand_R={"pos": self.s((-0.17, 0.06, 1.0)), "aim": (0, 0.2, -1)}).shaped(fist_R=0.6, win=0.3)
        return [(1, on), (20, on), (34, down), (48, down), (56, away.shaped(glasses=1.0)), (57, away), (80, base), (90, base)]

    def win(self, t=0):
        """Shuffles the pages square and sets them down: done for the night."""
        return self.base(drop=0.03).but(
            chest=(12 + 8 * t, -28, 0), head=(14 - 18 * t, -10 - 20 * t, 0),
            hand_L={"pos": self.s((0.08, 0.36, 1.12 - 0.12 * t)), "aim": (-0.3, 0.5, -0.8)},
            hand_R={"pos": self.s((-0.04, 0.36, 1.14 - 0.12 * t)), "aim": (0.3, 0.5, -0.8)},
        ).shaped(win=0.6 * t, fist_L=0.6, fist_R=0.5 - 0.5 * t, open_R=0.4 * t)

    def win_2(self, base):
        """A nod to the camera: "Goodnight."."""
        to_cam = self.base(drop=0.02).but(chest=(0, -44, 0), head=(-4, -40, 0)).shaped(win=0.7)
        nod = to_cam.but(head=(16, -40, 0), neck=(8, -10, 0))
        return [(1, base), (20, to_cam), (52, to_cam), (60, nod), (70, to_cam), (120, to_cam)]


OVERRIDES = {
    # A sharp, fast straight with the rear hand; the boosted one follows with the lead.
    "Breaking": {"limb": "hand.R"},
    "Breaking+": {"alt": ["hand.R", "hand.L"]},
    "Teleprompter": {"style": "prompter"},
    # The answer: a wide backhand with the pages (out to 1.8 m: the effect's
    # reach, so the hand points the way); the boosted one sweeps upward.
    "Teleprompter Read": {"limb": "hand.L", "prop": True},
    "Teleprompter Read+": {"limb": "hand.L", "prop": True, "ty": 1.55},
    "Live Feed": {"style": "live"},
    # The pages slammed down overhead.
    "Lead Story": {"limb": "hand.L"},
    "td": {"limb": "hand.R"},
}


def fx(make, b):
    def live_feed(p):
        # The Live Feed: a frame of TV static with a red LIVE bug, about
        # 0.6 × 0.7 m, standing on its bottom centre (the game places it).
        def static(t):
            f, u = t.fwd, t.up
            face = np.abs(t.n[:, 0]) > 0.5
            cell = np.floor(f / 0.05) * 7.13 + np.floor(u / 0.05) * 3.71
            noise = np.mod(np.sin(cell) * 4375.85, 1.0)
            c = t.c * (0.55 + 0.6 * noise)[:, None]
            inner = face & (np.abs(f) < 0.26) & (u > 0.05) & (u < 0.65)
            c = np.where(inner[:, None], c, (52, 52, 60))
            bug = face & (f > -0.24) & (f < -0.03) & (u > 0.5) & (u < 0.62)
            c = P.put(c, bug, LIVE_RED)
            ink = P.text(f, u, "LIVE", 0.07, -0.135, 0.525)
            c = P.put(c, bug & ink, (255, 255, 255))
            c = P.put(c, face & P.ellipse(f, u, 0.2, 0.56, 0.025, 0.025), LIVE_RED)
            return c

        p.box("feed", (0, 0, 0.35), (0.05, 0.6, 0.7), STATIC, "fx", mat=1, paint=static)
        p.seg("feed_tally", (0, 0.2, 0.7), (0, 0.2, 0.74), 0.02, 0.016, LIVE_RED, "fx", verts=8, mat=1, paint=lit)

    make("fx_live_feed", live_feed)
