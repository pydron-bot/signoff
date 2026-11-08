"""Mister Mumbles, a ventriloquist's dummy with no ventriloquist: a big
painted wooden head with a hinged jaw, rosy cheeks and staring eyes, a
little maroon suit and bow tie, and puppet strings running up out of frame.
Trickster: small, light, slippery."""
from lib.anim import Stance
from lib.body import arms, head, legs, torso

ID = "mumbles"
# The rig is smaller than the 1.30 m hurtbox: his big head makes up the rest.
HEIGHT = 1.24
GIRTH = 0.85
HEAD = 1.43

WOOD = (240, 210, 176)
SUIT = (124, 30, 44)
SHIRT = (240, 236, 226)
TROUSERS = (40, 34, 40)
SHOES = (16, 14, 16)
HAIR = (26, 20, 18)
RED = (210, 36, 48)
CHEEK = (232, 120, 120)
WHITE = (250, 250, 250)
BLACK = (10, 10, 12)
STRING = (210, 210, 200)
SOCK = (70, 160, 80)
POLE = (120, 90, 60)


def costume(p, b):
    c = {"skin": WOOD, "top": SUIT, "bottom": TROUSERS, "shoes": SHOES, "hair": HAIR}
    torso(p, b, c, waist=0.93)
    p.hull("shirt", [b.p(x, f, u) for f in (0.104, 0.116) for x, u in ((-0.07, 1.455), (0.07, 1.455), (0, 1.3))], SHIRT, "chest")
    for s in (1, -1):
        p.blob(f"bow{s}", b.p(s * 0.04, 0.125, 1.43), (0.03, 0.015, 0.02), RED, "chest")

    hp, hr = head(p, b, c, face=False)
    # Painted-on hair, a side parting.
    p.blob("hair", hp(0, -0.005, 1.722), hr(0.098, 0.11, 0.07), HAIR, "head", subdiv=2)
    # Staring eyes, arched painted brows, rosy cheeks, a ball nose.
    for sd in (1, -1):
        p.blob(f"eye{sd}", hp(sd * 0.04, 0.1, 1.69), hr(0.026, 0.012, 0.026), WHITE, "head")
        p.blob(f"pupil{sd}", hp(sd * 0.04, 0.111, 1.69), hr(0.011, 0.006, 0.011), BLACK, "head")
        p.box(f"brow{sd}", hp(sd * 0.042, 0.105, 1.722), hr(0.04, 0.01, 0.007), HAIR, "head")
        p.blob(f"cheek{sd}", hp(sd * 0.062, 0.088, 1.645), hr(0.024, 0.012, 0.02), CHEEK, "head")
    p.blob("nose", hp(0, 0.122, 1.66), hr(0.016, 0.016, 0.016), CHEEK, "head")
    p.box("grin", hp(0, 0.113, 1.622), hr(0.07, 0.01, 0.008), RED, "head")
    # The hinged jaw: a separate block under two dark slots.
    for sd in (1, -1):
        p.box(f"slot{sd}", hp(sd * 0.045, 0.105, 1.6), hr(0.008, 0.012, 0.05), BLACK, "head", mat=1)
    p.box("jaw", hp(0, 0.085, 1.575), hr(0.085, 0.05, 0.035), WOOD, "head", mat=1)

    arms(p, b, c, sleeve=1.0, cuff=SHIRT)
    legs(p, b, c)


EXTRAS = "strings"


def extras(p, b):
    """Puppet strings, up out of frame from the head and both shoulders."""
    hz = b.j["head"][0][2]
    top = (0, -0.005 * b.k * b.head, hz + (1.79 - 1.55) * b.k * b.head)
    for name, base, bone in (("string_head", top, "head"),
                             ("string.L", b.p(0.18, 0, 1.47), "chest"), ("string.R", b.p(-0.18, 0, 1.47), "chest")):
        p.seg(name, base, (base[0], base[1], base[2] + 3.0), 0.004, 0.004, STRING, bone, verts=3, mat=1)


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

    def win(self, t=0):
        """A deep, jerky bow."""
        return self.base(drop=0.02).but(
            chest=(45 - 5 * t, 0, 0), spine=(25, 0, 0), head=(20, 0, 0),
            hand_L={"pos": self.s((0.1, 0.22, 1.0)), "aim": (0, 0.3, -1)},
            hand_R={"pos": self.s((-0.38, -0.05, 1.25)), "aim": (-0.6, 0, 0.5)})


OVERRIDES = {
    "Strings Attached": {"style": "teleport", "limb": "hand.R"},
    "Exit Stage Left": {"style": "teleport"},
    "Knock-Knock": {"style": "knock", "limb": "hand.R"},
    "td": {"limb": "hand.R"},
}


def fx(make, b):
    def puppet(p):
        # The decoy: a sock puppet on a little stand, 0.5 × 1.2 m.
        p.seg("base", (0, 0, 0), (0, 0, 0.04), 0.22, 0.2, POLE, "fx", verts=10, mat=1)
        p.seg("pole", (0, 0, 0.04), (0, 0, 0.75), 0.02, 0.02, POLE, "fx", verts=6, mat=1)
        p.seg("sock", (0, 0, 0.7), (0, 0.06, 1.1), 0.12, 0.1, SOCK, "fx", verts=10, mat=1)
        p.blob("snout", (0, 0.16, 1.08), (0.1, 0.09, 0.07), SOCK, "fx", mat=1)
        for sd in (1, -1):
            p.blob(f"button{sd}", (sd * 0.05, 0.12, 1.16), (0.025, 0.012, 0.025), BLACK, "fx", mat=1)

    make("fx_hand_puppet", puppet)
