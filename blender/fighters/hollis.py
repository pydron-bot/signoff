"""Hollis Bey, night security guard of the transmitter building: broad and
heavy, a grey-blue uniform shirt and navy trousers, peaked cap, moustache,
a big flashlight and a key ring on the belt. Grappler: slow, huge throws."""
from lib.anim import Stance
from lib.body import arms, head, legs, torso

ID = "hollis"
HEIGHT = 1.90
GIRTH = 1.25

SKIN = (122, 84, 62)
SHIRT = (120, 140, 164)
NAVY = (36, 44, 72)
BELT = (24, 22, 22)
BOOTS = (20, 20, 22)
HAIR = (30, 26, 24)
GOLD = (214, 176, 72)
METAL = (150, 152, 158)
BEAM = (255, 240, 170)


def costume(p, b):
    c = {"skin": SKIN, "top": SHIRT, "bottom": NAVY, "shoes": BOOTS, "hair": HAIR, "shoulders": 0.23}
    torso(p, b, c, hem=False)
    p.hull("belt", b.ring(0.175, 0.105, 0.035, 0.94) + b.ring(0.175, 0.105, 0.035, 1.0), BELT, "hips")
    p.box("buckle", b.p(0, 0.112, 0.97), (0.05, 0.012, 0.04), METAL, "hips", mat=1)
    p.box("badge", b.p(0.08, 0.118, 1.36), (0.035, 0.01, 0.045), GOLD, "chest", mat=1)
    for s in (1, -1):
        p.box(f"pocket{s}", b.p(s * 0.08, 0.112, 1.3), (0.06, 0.008, 0.055), NAVY, "chest")
        p.box(f"epaulette{s}", b.p(s * 0.17, 0, 1.455), (0.09, 0.05, 0.012), NAVY, "chest")
    # The flashlight on the right hip, the key ring on the left (both props).
    p.seg("flashlight", b.p(-0.2, 0.02, 0.98), b.p(-0.2, 0.06, 0.74), 0.025, 0.03, BELT, "hips", mat=1)
    p.seg("lens", b.p(-0.2, 0.06, 0.75), b.p(-0.2, 0.065, 0.73), 0.034, 0.034, METAL, "hips", mat=1)
    p.seg("key_ring", b.p(0.2, 0.0, 0.92), b.p(0.2, 0.0, 0.9), 0.03, 0.03, METAL, "hips", mat=1)
    for i, d in enumerate((-0.02, 0.0, 0.02)):
        p.box(f"key{i}", b.p(0.2 + d, 0.01, 0.86), (0.008, 0.004, 0.05), GOLD, "hips", mat=1)

    hp, hr = head(p, b, c)
    p.blob("hair", hp(0, -0.04, 1.66), hr(0.096, 0.08, 0.08), HAIR, "head")
    p.box("moustache", hp(0, 0.112, 1.63), hr(0.07, 0.016, 0.016), HAIR, "head")
    # The peaked cap: crown, band and brim.
    p.blob("cap", hp(0, 0.0, 1.73), hr(0.108, 0.118, 0.058), NAVY, "head", subdiv=2)
    p.seg("cap_band", hp(0, 0.0, 1.695), hp(0, 0.0, 1.725), b.k * 0.104, b.k * 0.106, BELT, "head", verts=10)
    p.hull("brim", [hp(x, f, 1.69 + d) for d in (0, 0.01) for x, f in ((-0.08, 0.08), (0.08, 0.08), (-0.06, 0.17), (0.06, 0.17))], BELT, "head")
    p.box("cap_badge", hp(0, 0.112, 1.735), hr(0.03, 0.01, 0.03), GOLD, "head", mat=1)

    arms(p, b, c, sleeve=0.45)
    legs(p, b, c, shin=BOOTS, shoe_h=0.12)


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

    def win(self, t=0):
        """Arms folded, unimpressed."""
        return self.base(drop=0.0).but(
            hand_L={"pos": self.s((-0.12, 0.2, 1.24 + 0.01 * t)), "aim": (-1, 0.1, 0)},
            hand_R={"pos": self.s((0.12, 0.22, 1.2 + 0.01 * t)), "aim": (1, 0.1, 0)},
            elbow_L=self.s((0.4, 0.3, 1.1)), elbow_R=self.s((-0.4, 0.3, 1.1)),
            chest=(-4, -10, 0), head=(-8, 0, 0))


OVERRIDES = {
    # The beam and the chain make these hits (effects); the hand points them.
    "Flashlight": {"limb": "hand.R", "prop": True},
    "Key Ring": {"limb": "hand.R", "prop": True},
    "Night Shift": {"limb": "hand.L"},
    "td": {"limb": "hand.R"},
}


def fx(make, b):
    def beam(p):
        # The flashlight beam: a cone from the lens forward, 1.8 m long.
        p.seg("beam", (0, 0, 0), (0, 1.8, 0), 0.04, 0.42, BEAM, "fx", verts=12, mat=1)

    make("fx_flashlight_beam", beam)
