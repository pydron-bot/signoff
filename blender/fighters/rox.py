"""Rox Vega, host of Feel the Burn at Dawn, still exercising since 1983:
a hot-pink leotard over purple tights, teal leg warmers and headband,
sweatbands, big permed hair, white high-tops. Rushdown: fast, relentless."""
from lib.anim import Stance
from lib.body import arms, head, legs, torso

ID = "rox"
HEIGHT = 1.75
GIRTH = 0.9

SKIN = (198, 140, 104)
LEOTARD = (236, 52, 140)
TIGHTS = (104, 54, 150)
WARMERS = (40, 196, 186)
HAIR = (150, 84, 42)
SHOES = (236, 236, 230)
LIPS = (200, 40, 80)


def costume(p, b):
    c = {"skin": SKIN, "top": LEOTARD, "bottom": LEOTARD, "shoes": SHOES, "hair": HAIR, "shoulders": 0.19}
    # The leotard, all one colour from the hips up, with a narrower waist.
    torso(p, b, c, waist=0.8, shape=[
        (0.80, 0.13, 0.085), (0.88, 0.158, 0.094), (0.98, 0.16, 0.094), (1.08, 0.146, 0.09), (1.17, 0.143, 0.092),
        (1.26, 0.155, 0.1), (1.35, 0.178, 0.104), (1.43, 0.19, 0.1), (1.475, 0.15, 0.072)])
    p.hull("neckline", [b.p(x, 0.104, u) for x, u in ((-0.08, 1.445), (0.08, 1.445), (0, 1.36))] + [b.p(x, 0.09, u) for x, u in ((-0.08, 1.445), (0.08, 1.445), (0, 1.36))], SKIN, "chest")

    hp, hr = head(p, b, c)
    # Big permed hair: a crown and side volume, nothing above the hurtbox top.
    p.blob("hair", hp(0, -0.01, 1.722), hr(0.115, 0.122, 0.078), HAIR, "head", subdiv=2)
    for sd in (1, -1):
        p.blob(f"curls{sd}", hp(sd * 0.1, -0.03, 1.64), hr(0.07, 0.09, 0.1), HAIR, "head")
    p.blob("curls_back", hp(0, -0.08, 1.6), hr(0.11, 0.07, 0.11), HAIR, "head")
    p.seg("headband", hp(0, -0.01, 1.70), hp(0, -0.01, 1.725), b.k * 0.108, b.k * 0.106, WARMERS, "head", verts=10)
    p.box("lips", hp(0, 0.112, 1.626), hr(0.04, 0.012, 0.012), LIPS, "head")

    arms(p, b, c, sleeve=0.0, cuff=WARMERS)
    legs(p, b, {**c, "bottom": TIGHTS}, shin=TIGHTS)
    for s in ("L", "R"):
        knee = b.j[f"shin.{s}"][0]
        ankle = b.j[f"shin.{s}"][1]
        # Slouchy leg warmers from mid-shin to the ankle.
        mid = tuple(a + (c2 - a) * 0.35 for a, c2 in zip(knee, ankle))
        p.seg(f"warmer.{s}", mid, ankle, b.r(0.068), b.r(0.072), WARMERS, f"shin.{s}", verts=10)


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

    def win(self, t=0):
        """Both arms up in a V: and… hold."""
        return self.base(drop=0.02).but(
            hand_L={"pos": self.s((0.42, 0.05, 1.98 - 0.03 * t)), "aim": (0.5, 0, 1)},
            hand_R={"pos": self.s((-0.42, 0.05, 1.98 - 0.03 * t)), "aim": (-0.5, 0, 1)},
            chest=(-8, -10, 0), head=(-14, 0, 0))


OVERRIDES = {
    "Leg Warmer Lariat": {"style": "spin"},
    "Count of Eight": {"limb": "foot.L"},
    "Star Jump": {"style": "hop", "limb": "hand.L"},
    "Grapevine": {"style": "grapevine", "limb": "foot.R"},
    "td": {"limb": "hand.R"},
}
