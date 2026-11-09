"""Rev. Gideon Price, host of The Hour of Power (late night, 1987): a tall,
lean televangelist in a powder-blue three-piece suit with wide lapels, a
white shirt and a long gold tie with a rhinestone clip, two-tone shoes, a
gold pinky ring and a big wristwatch; a lacquered silver pompadour, wide
eyes, a wider smile and eyebrows up, mid-sermon. A leather Bible in his rear
hand, a lapel microphone on a swinging cord, and the gold collection plate
for the plate moves. All-rounder, with donations as a second resource."""
import numpy as np

from lib import paint as P
from lib.anim import DATA, Stance, lerp_pose
from lib.body import arms, clump, face_paint, grip, hair_cover, head, head_frame, legs, lerp, lit, mouth, torso

ID = "gideon"
HEIGHT = 1.80
GIRTH = 0.94

SKIN = (232, 186, 156)
SUIT = (146, 180, 214)
SUIT_DARK = (118, 150, 188)
LAPEL = (128, 162, 200)
SHIRT = (244, 242, 236)
TIE = (222, 178, 62)
TIE_DARK = (176, 132, 40)
GOLD = (230, 190, 84)
SHOES = (238, 234, 226)
TOECAP = (112, 64, 36)
HAIR = (206, 208, 216)
HAIR_LIGHT = (246, 248, 252)
TEETH = (255, 255, 255)
LEATHER = (72, 40, 28)
PAGES = (236, 214, 150)
MIC = (40, 40, 44)
GRILLE = (170, 172, 178)
CORD = (30, 30, 34)
RHINESTONE = (220, 240, 255)
PIN = (120, 40, 140)
BILL = (130, 170, 110)
FIRE = (255, 120, 30)
FIRE_TIP = (255, 220, 90)
GLORY = (255, 246, 210)


def suit(t):
    """A sheen on the powder-blue cloth: lighter where it faces the light."""
    c = P.put(t.c, P.near(t.c, SUIT) & P.facing(t, (0.2, 0.5, 0.85), 0.8), (200, 222, 244), 0.45)
    t.c = c
    return P.light(t)


def hair_paint(t):
    """Lacquered: combed lines swept back, a hard shine on top."""
    c = P.shade(t.c, P.lines(t.side * 0.3 + t.up * 0.8, 0.02, 0.004), 0.86)
    t.c = P.put(c, P.facing(t, (0.1, 0.6, 0.8), 0.75), HAIR_LIGHT, 0.75)
    return P.light(t, lo=0.9)


def gold(t):
    t.c = P.put(t.c, P.facing(t, (0.2, 0.6, 0.8), 0.7), (255, 244, 190), 0.6)
    return P.light(t, lo=0.9)


def costume(p, b):
    k, g = b.k, b.g

    def tie_paint(t):
        t.c = P.put(t.c, P.lines(t.side - t.up * 0.6, 0.05, 0.01), TIE_DARK, 0.6)
        return P.light(t)

    pin_at = b.p(0.11, 0.124, 1.39)

    def pin(t):
        # THE HOUR OF POWER over a phone number, on a violet badge.
        x, u = t.side - pin_at[0], t.up - pin_at[2]
        ink = P.text(x, u, "HOUR OF", 0.0045 * k, 0, 0.007 * k) | P.text(x, u, "POWER", 0.0055 * k, 0, -0.0005 * k) \
            | P.text(x, u, "1-800", 0.004 * k, 0, -0.009 * k)
        return P.put(P.light(t), ink, GOLD)

    skin = face_paint(b, SKIN, blush=(220, 140, 120), tan=(214, 150, 110))
    c = {"skin": SKIN, "top": SUIT, "bottom": SUIT, "shoes": SHOES, "toecap": TOECAP, "hair": HAIR, "shoulders": 0.205,
         "eye": (0.024, 0.009, 0.019), "brows": (150, 150, 158), "brow_raise": 0.012, "sole": (60, 40, 30)}
    # Lean: a narrow waist under the jacket.
    torso(p, b, c, waist=0.86, paint=suit, shape=[
        (0.80, 0.13, 0.085), (0.88, 0.158, 0.094), (0.98, 0.152, 0.092), (1.08, 0.142, 0.09), (1.17, 0.15, 0.094),
        (1.26, 0.165, 0.1), (1.35, 0.188, 0.104), (1.43, 0.205, 0.1), (1.475, 0.15, 0.072)])
    # The shirt and the waistcoat in the jacket's V, then the long gold tie
    # in two pieces (x_tie swings the lower half).
    p.hull("shirt", [b.p(x, f, u) for f in (0.098, 0.108) for x, u in ((-0.075, 1.46), (0.075, 1.46), (0, 1.3))], SHIRT, "chest", paint=lit)
    p.hull("waistcoat", [b.p(x, f, u) for f in (0.095, 0.106) for x, u in ((-0.07, 1.33), (0.07, 1.33), (-0.1, 1.06), (0.1, 1.06), (0, 1.02))],
           SUIT_DARK, "spine", paint=suit, weigh=lambda q: {"chest": 1.0} if q[2] > 1.26 * k else {"spine": 1.0})
    for i, u in enumerate((1.26, 1.19, 1.12)):
        p.blob(f"vest_button{i}", b.p(0, 0.11, u), (0.008, 0.005, 0.008), GOLD, "spine" if u < 1.2 else "chest", mat=1, paint=gold)

    def tie_weights(q):
        t = min(1.0, max(0.0, (1.3 * k - q[2]) / (0.12 * k)))
        return {"chest": 1 - t, "x_tie": t} if t < 1 else {"x_tie": 1.0}

    p.hull("tie", [b.p(x, f, u) for f in (0.112, 0.122) for x, u in ((-0.02, 1.44), (0.02, 1.44), (-0.034, 1.3), (0.034, 1.3), (-0.038, 1.0), (0.038, 1.0), (0, 0.96))],
           TIE, "chest", paint=tie_paint, weigh=tie_weights)
    p.hull("tie_knot", [b.p(x, f, u) for f in (0.112, 0.13) for x, u in ((-0.026, 1.465), (0.026, 1.465), (-0.015, 1.43), (0.015, 1.43))], TIE, "chest", paint=tie_paint)
    p.box("tie_clip", b.p(0, 0.126, 1.3), (0.07, 0.006, 0.01), GOLD, "chest", mat=1, paint=gold)
    p.blob("rhinestone", b.p(0, 0.13, 1.3), (0.009, 0.006, 0.009), RHINESTONE, "chest", mat=1, paint=gold)
    for sd in (1, -1):
        # 1970s-wide lapels, down to the waist.
        p.hull(f"lapel{sd}", [b.p(sd * x, f + d, u) for d in (0, 0.012) for x, f, u in ((0.075, 0.106, 1.465), (0.18, 0.1, 1.38), (0.15, 0.104, 1.34), (0.03, 0.108, 1.12))],
               LAPEL, "chest", paint=suit)
    p.seg("collar", b.p(0, 0.005, 1.43), b.p(0, 0.008, 1.485), b.r(0.06), b.r(0.056), SHIRT, "chest", paint=lit)
    p.tube("jacket_hem", [(b.p(0, 0, u), (0.135 * k * b.g, 0.09 * k * b.g), {"hips": 1.0}, SUIT) for u in (0.79, 0.825)], verts=18, paint=suit)
    p.box("pin", pin_at, (0.06, 0.008, 0.04), PIN, "chest", mat=1, paint=pin)
    # The lapel microphone, its cord looping down to his hip (x_cord).
    p.box("lav_mic", b.p(-0.1, 0.12, 1.4), (0.014, 0.012, 0.024), MIC, "chest", mat=1)
    cord = [b.p(-0.1, 0.116, 1.39), b.p(-0.13, 0.11, 1.28), b.p(-0.15, 0.1, 1.15), b.p(-0.16, 0.1, 1.04), b.p(-0.17, 0.09, 0.96)]
    p.tube("mic_cord", [(q, 0.004, {"chest": 1.0} if i < 1 else {"x_cord": 1.0}, CORD) for i, q in enumerate(cord)], verts=4, mat=1)

    hp, hr = head(p, b, c, paint=skin, skull=(0.088, 0.104, 0.124))
    mouth(p, b, (0, 0.11, 1.622), 0.088, 0.026, SKIN, kind="grin", inner=(120, 36, 44), teeth=TEETH, lips=(204, 128, 118), skin=(226, 173, 140))  # skin: under the tan
    # The pompadour: swept back at the sides, high and forward at the front
    # (the front rides x_pomp).
    p.blob("hair", hp(0, -0.012, 1.728), hr(0.098, 0.11, 0.074), HAIR, "head", subdiv=2, paint=hair_paint)
    p.blob("hair_back", hp(0, -0.05, 1.67), hr(0.096, 0.08, 0.085), HAIR, "head", paint=hair_paint)
    for sd in (1, -1):
        clump(p, f"hair_side{sd}", hp(sd * 0.08, 0.06, 1.74), hp(sd * 0.094, -0.07, 1.69), 0.03 * k, HAIR, "head", paint=hair_paint, flat=0.4)
        clump(p, f"sideburn{sd}", hp(sd * 0.09, 0.03, 1.71), hp(sd * 0.092, 0.04, 1.655), 0.012 * k, HAIR, "head", paint=hair_paint)
    # Lacquered locks swept back along the sides, meeting in a ducktail.
    hair_cover(p, b, "sweep", (0, -0.03, 1.69), (0.097, 0.09, 0.09), HAIR, paint=hair_paint, rows=((0, 9), (28, 8)), az=(55, 305), flow=(28, -6),
               width=0.026, lift=1.01, flat=0.3)
    for sd in (1, -1):
        clump(p, f"ducktail{sd}", hp(sd * 0.05, -0.07, 1.7), hp(sd * 0.004, -0.122, 1.64), 0.03 * k, HAIR, "head", paint=hair_paint, flat=0.35)
    # One smooth lacquered roll over the forehead, swept back into the crown.
    p.blob("pomp", hp(0, 0.06, 1.792), hr(0.084, 0.07, 0.046), HAIR, "x_pomp", subdiv=2, paint=hair_paint)
    p.blob("pomp_crown", hp(0, -0.01, 1.788), hr(0.09, 0.08, 0.05), HAIR, "x_pomp", paint=hair_paint)

    arms(p, b, c, sleeve=1.0, paint=suit, hand_paint=skin, cuff_rim=SHIRT)
    legs(p, b, c, paint=suit, shoe_paint=lit)

    # The big gold wristwatch on his lead wrist.
    el, wr = b.j["forearm.L"]
    p.seg("watch", lerp(el, wr, 0.78), lerp(el, wr, 0.86), b.r(0.047), b.r(0.046), GOLD, "forearm.L", verts=10, mat=1, paint=gold)
    face = lerp(el, wr, 0.82)
    p.blob("watch_face", (face[0] + b.r(0.046), face[1], face[2]), (0.006, 0.018, 0.018), (240, 240, 230), "forearm.L", mat=1, paint=lit)
    # The gold pinky ring, on his lead hand's little finger.
    wr, a, w, L, _ = grip(b, "L")
    kh = b.k * (1 + (b.g - 1) * 0.5)
    ring_at = wr + a * 0.52 * L - w * 0.035 * kh
    p.seg("pinky_ring", tuple(ring_at - a * 0.008), tuple(ring_at + a * 0.008), 0.012 * kh, 0.012 * kh, GOLD, "fingers.L", verts=8, mat=1, paint=gold)

    # The Bible, always in his rear hand: leather boards, gilt page edges,
    # a gold cross on the cover.
    wr, a, w, L, _ = grip(b, "R")
    n = np.cross(w, a)

    def at(t, u, v):
        return tuple(wr + a * t + w * u + n * v)

    def bible_paint(t):
        # Gilt page edges wherever the face isn't a cover.
        page = np.abs(t.n @ n) < 0.5
        t.c = np.where(page[:, None], np.array(PAGES, float), t.c)
        t.c = P.put(t.c, page & P.lines(t.up + t.side, 0.008, 0.002), (200, 160, 70), 0.4)
        return P.light(t)

    p.hull("bible", [at(t, u, v) for t in (0.3 * L, 0.3 * L + 0.24) for u in (-0.03, 0.15) for v in (-0.03, 0.03)], LEATHER, "hand.R", mat=1, paint=bible_paint)
    mid = 0.3 * L + 0.12
    p.hull("bible_cross", [at(t, u, 0.032) for t, u in ((mid - 0.07, 0.055), (mid + 0.07, 0.055), (mid - 0.07, 0.065), (mid + 0.07, 0.065))]
           + [at(mid - 0.025, u, 0.034) for u in (0.03, 0.09)], GOLD, "hand.R", mat=1, paint=gold)

    # The collection plate, out of his lead hand for the plate moves.
    wr, a, w, L, held_at = grip(b, "L")
    n = np.cross(w, a)
    centre = wr + a * (L + 0.12)
    p.seg("plate", tuple(centre - n * 0.012), tuple(centre + n * 0.01), 0.16, 0.18, GOLD, "hand.L", verts=12, mat=1, paint=gold)
    p.box("plate_bills", tuple(centre + n * 0.012), (0.1, 0.08, 0.01), BILL, "hand.L", mat=1, paint=lit)
    p.held("plate", held_at, "plate", "plate_bills")


def xbones(b):
    """Secondary motion: the tie's lower half, the pompadour's front, the mic cord."""
    hp, _, _ = head_frame(b)
    return [
        {"name": "x_tie", "parent": "chest", "head": b.p(0, 0.125, 1.3), "tail": b.p(0, 0.125, 0.97), "stiff": 0.22, "damp": 0.4, "max": 16},
        {"name": "x_pomp", "parent": "head", "head": hp(0, -0.02, 1.79), "tail": hp(0, 0.13, 1.81), "stiff": 0.4, "damp": 0.4, "max": 6},
        {"name": "x_cord", "parent": "chest", "head": b.p(-0.12, 0.112, 1.33), "tail": b.p(-0.17, 0.09, 0.96), "stiff": 0.14, "damp": 0.22, "max": 30},
    ]


class STANCE(Stance):
    """Upright and confident, the Bible held to his chest, the lead hand
    out as if to the congregation."""

    drop = 0.05
    bob = 0.014
    hips_yaw = -22
    chest_yaw = -26
    chest_pitch = -2
    lead_hand = (0.14, 0.4, 1.3)
    rear_hand = (-0.02, 0.22, 1.26)
    lead_aim = (0.0, 0.8, 0.6)
    rear_aim = (0.7, 0.3, 0.6)
    guard_fist = 0.6

    def hit_flavour(self, name, pose, base):
        """The Bible goes up as if for protection on hits to the head;
        theatrical on stagger, an arm thrown out."""
        bible = {"pos": self.s((-0.02, 0.3, 1.66)), "aim": (0.6, 0.2, 0.8), "hint": (0, 1, 0)}
        if name in ("hit_head", "hit_head_heavy"):
            return pose.but(hand_R=bible).shaped(fist_R=0.6, open_R=0.0)
        if name == "stagger" and pose.parts["shapes"].get("ko"):
            return pose.but(hand_L={"pos": self.s((0.3, -0.42, 1.62)), "aim": (0.3, -0.8, 0.5)}).shaped(open_L=1.0)
        return pose.shaped(fist_R=0.6, open_R=0.0)

    def intro(self, t=0):
        """Raises the Bible to the heavens, head back."""
        return self.base(drop=0.02).but(
            chest=(-10, -14, 0), head=(-24 - 6 * t, -6, 0),
            hand_R={"pos": self.s((-0.12, 0.12, 2.0 + 0.04 * t)), "aim": (0.2, 0.2, 1), "hint": (0, 1, 0)},
            hand_L={"pos": self.s((0.34, 0.24, 1.4)), "aim": (0.6, 0.5, 0.6)},
        ).shaped(win=1.0, fist_L=0.0, open_L=0.8)

    def intro_2(self, relaxed, base):
        """Points straight down the camera: "Yes, YOU."."""
        point = relaxed.but(chest=(-2, -50, 0), head=(-4, -46, 0), shoulder_L=(-2, -50, 0),
                            hand_L={"pos": self.s((0.0, 0.62, 1.5)), "aim": (-0.55, 0.8, 0.1), "hint": (0, 0, 1)},
                            hand_R={"pos": self.s((-0.04, 0.22, 1.26)), "aim": (0.7, 0.3, 0.6)}).shaped(fist_L=1.0, point_L=1.0, win=1.0)
        jab = point.but(hand_L={"pos": self.s((-0.04, 0.68, 1.5)), "aim": (-0.55, 0.8, 0.1), "hint": (0, 0, 1)})
        return [(1, relaxed), (20, point), (34, jab), (38, point), (48, jab), (52, point), (66, point), (80, base), (90, base)]

    def win(self, t=0):
        """Arms wide, eyes closed, basking in it."""
        return self.base(drop=0.0).but(
            chest=(-8, -20, 0), head=(-20 - 4 * t, -10, 0),
            hand_L={"pos": self.s((0.62, 0.12, 1.62 + 0.03 * t)), "aim": (0.8, 0.1, 0.5)},
            hand_R={"pos": self.s((-0.6, 0.12, 1.62 + 0.03 * t)), "aim": (-0.8, 0.1, 0.5)},
        ).shaped(ko=0.7, fist_L=0.0, open_L=1.0, fist_R=0.6)

    def win_2(self, base):
        """Counts the takings, thumb over the notes, and tucks them into
        his jacket."""
        count = self.base(drop=0.0).but(chest=(14, -24, 0), head=(20, -10, 0),
                                        hand_L={"pos": self.s((0.06, 0.32, 1.2)), "aim": (-0.4, 0.6, 0.6), "hint": (0, 1, 0)},
                                        hand_R={"pos": self.s((-0.02, 0.24, 1.24)), "aim": (0.7, 0.3, 0.6)}).shaped(win=1.0, fist_L=0.5)
        flick = count.but(hand_L={"pos": self.s((0.04, 0.32, 1.24)), "aim": (-0.5, 0.5, 0.7), "hint": (0, 1, 0)}).shaped(win=1.0, fist_L=0.8)
        tuck = count.but(chest=(0, -30, 0), head=(-6, -30, 0),
                         hand_L={"pos": self.s((-0.06, 0.06, 1.36)), "aim": (-0.4, -0.2, -0.9)}).shaped(win=1.0, fist_L=0.7)
        keys = [(1, base)]
        for i, f in enumerate(range(18, 66, 6)):
            keys.append((f, count if i % 2 == 0 else flick))
        return keys + [(80, tuck), (92, tuck), (104, tuck.but(hand_L=base.parts["hand_L"], head=(-10, -30, 0))), (120, tuck.but(hand_L=base.parts["hand_L"], head=(-10, -30, 0)))]


def _plate(st, base, mv):
    """Collection Plate: a backhand frisbee throw, the lead hand drawn
    across to the rear hip, whipped out flat on frame 14, and left held out
    as if for the plate to come home."""
    s = st.s
    wind = base.but(chest=(4, 6, 0), shoulder_L=(4, 6, 0), hips={"offset": (0, -0.03 * st.k, -st.drop * st.k), "turn": (0, st.hips_yaw + 12, 0)},
                    hand_L={"pos": s((-0.16, 0.18, 1.0)), "aim": (-1, 0.1, 0.0), "hint": (0, 0, 1)})
    out = base.but(chest=(0, -60, 0), shoulder_L=(0, -60, 0), head=(-2, -30, 0), hips={"offset": (0, 0.06 * st.k, -st.drop * st.k), "turn": (0, st.hips_yaw - 20, 0)},
                   hand_L={"pos": s((0.24, 0.66, 0.98)), "aim": (0.4, 1, 0.0), "hint": (0, 0, 1)})
    held = out.shaped(fist_L=0.0, open_L=0.6)
    return [(4, wind.shaped(fist_L=0.7)), (10, wind.shaped(fist_L=0.7)), (14, out.shaped(fist_L=0.3)), (20, held), (32, held.but(head=(-2, -10, 0))),
            (mv["total"], base)]


def _brimstone(blessed):
    def keys(st, base, mv):
        """Arms raised on the startup, both brought down on the strike (the
        blast is all round him); blessed, onto his toes, arms higher, a held
        beat at the top."""
        s, k = st.s, st.k
        top = 2.16 if blessed else 1.98
        lift = {"root": {"offset": (0, 0, 0.05 * k)},
                "foot_L": {"pos": s((st.lead_foot[0], st.lead_foot[1], 0.1)), "turn": (40, st.lead_foot_yaw, 0)},
                "foot_R": {"pos": s((st.rear_foot[0], st.rear_foot[1], 0.1)), "turn": (40, st.rear_foot_yaw, 0)}} if blessed else {}
        raised = base.but(chest=(-14, -18, 0), head=(-30, -8, 0), spine=(-6, -20, 0), **lift,
                          hand_L={"pos": s((0.36, 0.1, top)), "aim": (0.4, 0.1, 1)},
                          hand_R={"pos": s((-0.34, 0.1, top - 0.04)), "aim": (-0.4, 0.1, 1)}).shaped(fist_L=0.0, fist_R=0.6, open_L=1.0, jaw=0.9)
        slam = base.but(hips={"offset": (0, 0.04 * k, -(st.drop + 0.12) * k), "turn": (10, st.hips_yaw, 0)}, spine=(16, -20, 0), chest=(28, -20, 0), head=(14, -6, 0),
                        hand_L={"pos": s((0.24, 0.5, 0.8)), "aim": (0.3, 0.6, -0.8)},
                        hand_R={"pos": s((-0.2, 0.46, 0.84)), "aim": (-0.3, 0.6, -0.8)}).shaped(fist_L=0.0, open_L=1.0, fist_R=0.6, jaw=1.0)
        h0, h1 = mv["hits"][0]["frames"]
        out = [(4, lerp_pose(base, raised, 0.4).shaped(jaw=0.4)), (12, raised)]
        if blessed:
            out.append((h0 - 2, raised.but(head=(-34, -8, 0))))
        out += [(h0, slam), (h1, slam), (h1 + 10, lerp_pose(slam, base, 0.5).shaped(fist_L=0.0, fist_R=0.6)), (mv["total"], base)]
        return out

    return keys


def _rapture(st, base, mv):
    """Laying On of Hands (healing): after the palm, the head thrown back,
    arms up and open; the game shows the heal on frame 24."""
    s = st.s
    rapture = base.but(chest=(-16, -14, 0), head=(-34, -6, 0), spine=(-6, -18, 0),
                       hand_L={"pos": s((0.46, 0.14, 1.9)), "aim": (0.5, 0.1, 1)},
                       hand_R={"pos": s((-0.4, 0.12, 1.86)), "aim": (-0.5, 0.1, 1)}).shaped(win=1.0, ko=0.6, fist_L=0.0, open_L=1.0, fist_R=0.6)
    return [(20, rapture), (24, rapture.but(head=(-38, -6, 0))), (31, rapture), (40, lerp_pose(rapture, base, 0.5).shaped(fist_L=0.3)), (mv["total"], base)]


# The plate is in the lead hand until it's thrown on frame 14.
PLATE = {"key": "plate", "limb": "hand.L", "reach": 0.0, "show": (1, 14)}


OVERRIDES = {
    # The palm to the forehead, with the lead hand (the Bible is in the rear).
    "Laying On of Hands": {"limb": "hand.L", "palm": True},
    "Laying On of Hands (healing)": {"limb": "hand.L", "palm": True, "keys": _rapture},
    "Collection Plate": {"keys": _plate, "held": PLATE},
    "Collection Plate+": {"keys": _plate, "held": PLATE},
    # The blast is the hit (all round him): the hands only call it down.
    "Fire and Brimstone": {"limb": "hand.L", "prop": True, "keys": _brimstone(False)},
    "Fire and Brimstone (blessed)": {"limb": "hand.L", "prop": True, "keys": _brimstone(True)},
    "td": {"limb": "hand.L"},
}
assert all(m in DATA[ID]["moves"] for m in OVERRIDES)


def fx(make, b):
    import math

    def plate(p):
        # A gold collection plate 0.6 m across, bills and coins in it, flat,
        # origin at its bottom centre.
        p.seg("plate_base", (0, 0, 0), (0, 0, 0.02), 0.22, 0.24, GOLD, "fx", verts=16, mat=1, paint=gold)
        p.seg("plate_rim", (0, 0, 0.02), (0, 0, 0.05), 0.24, 0.3, GOLD, "fx", verts=16, mat=1, paint=gold)
        for i, (x, f, a) in enumerate(((-0.06, 0.02, 0.3), (0.05, -0.04, -0.5), (0.0, 0.07, 1.2))):
            ca, sa = math.cos(a), math.sin(a)
            pts = [(x + dx * ca - df * sa, f + dx * sa + df * ca, u) for dx in (-0.08, 0.08) for df in (-0.04, 0.04) for u in (0.022 + 0.004 * i, 0.026 + 0.004 * i)]
            p.hull(f"bill{i}", pts, BILL, "fx", mat=1, paint=lit)
        for i, (x, f) in enumerate(((0.12, 0.06), (-0.1, -0.09), (0.08, -0.12), (-0.13, 0.08))):
            p.seg(f"coin{i}", (x, f, 0.022), (x, f, 0.03), 0.025, 0.025, GOLD, "fx", verts=8, mat=1, paint=gold)

    def brimstone(p):
        # A ring of fire on the floor 2.4 m across, rising to a column of
        # light 2 m high; origin at its bottom centre.
        def flame(t):
            u = np.clip(t.up / 0.7, 0, 1)
            return P.put(t.c, u > 0.45, FIRE_TIP, 0.8)

        for i in range(16):
            a = 2 * math.pi * i / 16
            r = 1.15
            h = 0.45 + 0.25 * ((i * 7) % 3) / 2
            x, f = math.cos(a) * r, math.sin(a) * r
            p.seg(f"fire{i}", (x, f, 0.0), (x * 1.02, f * 1.02, h), 0.17, 0.01, FIRE, "fx", verts=5, mat=1, paint=flame)
        # The light: thin beams rising round him (a solid column would hide him).
        for i in range(10):
            a = 2 * math.pi * (i + 0.5) / 10
            x, f = math.cos(a) * 0.5, math.sin(a) * 0.5
            p.seg(f"glory{i}", (x, f, 0.0), (x * 0.8, f * 0.8, 2.0), 0.035, 0.012, GLORY, "fx", verts=4, mat=1, paint=lambda t: t.c)

    make("fx_plate", plate)
    make("fx_brimstone", brimstone)
