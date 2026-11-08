"""Dale Storm, Channel 0's weatherman (1987): a camel blazer with 1987
shoulder pads, the widest tie on air, helmet hair, a fixed grin, and the
forecast clicker. Zoner: keeps you out."""
from lib.anim import Stance
from lib.body import arms, head, legs, lerp, torso

ID = "dale"
HEIGHT = 1.80

SKIN = (226, 184, 150)
JACKET = (184, 146, 98)
LAPEL = (150, 116, 76)
TROUSERS = (92, 72, 58)
SHIRT = (238, 234, 224)
TIE = (186, 52, 42)
HAIR = (78, 52, 34)
SHOES = (44, 32, 26)
TEETH = (252, 250, 244)
DARK = (34, 28, 28)
PLASTIC = (58, 58, 64)
BUTTON = (220, 40, 40)
ICE = (206, 232, 246)
WIND = (170, 205, 225)


def costume(p, b):
    c = {"skin": SKIN, "top": JACKET, "bottom": TROUSERS, "shoes": SHOES, "hair": HAIR}
    torso(p, b, c, waist=0.93)  # the blazer covers the hips
    p.hull("shirt", [b.p(-0.075, 0.104, 1.455), b.p(0.075, 0.104, 1.455), b.p(0, 0.104, 1.25),
                     b.p(-0.075, 0.116, 1.455), b.p(0.075, 0.116, 1.455), b.p(0, 0.116, 1.25)], SHIRT, "chest")
    # The wide tie, 1987's widest.
    p.hull("tie", [b.p(x, f, u) for f in (0.118, 0.13) for x, u in ((-0.022, 1.445), (0.022, 1.445), (-0.048, 1.2), (0.048, 1.2), (0, 1.13))], TIE, "chest")
    for s in (1, -1):
        p.hull(f"lapel{s}", [b.p(s * x, f + d, u) for d in (0, 0.01) for x, f, u in ((0.075, 0.112, 1.455), (0.14, 0.11, 1.42), (0.02, 0.112, 1.25))], LAPEL, "chest")
    p.seg("collar", b.p(0, 0.005, 1.43), b.p(0, 0.008, 1.485), b.r(0.06), b.r(0.056), SHIRT, "chest")
    p.box("mic", b.p(0.1, 0.122, 1.385), (0.016, 0.014, 0.026), DARK, "chest", mat=1)

    hp, hr = head(p, b, c)
    p.blob("hair", hp(0, -0.005, 1.727), hr(0.102, 0.114, 0.073), HAIR, "head", subdiv=2)
    p.blob("hair_back", hp(0, -0.035, 1.665), hr(0.097, 0.08, 0.085), HAIR, "head")
    p.blob("quiff", hp(0.02, 0.07, 1.765), hr(0.07, 0.05, 0.034), HAIR, "head")
    p.box("grin", hp(0, 0.11, 1.624), hr(0.072, 0.016, 0.017), TEETH, "head")

    arms(p, b, c, sleeve=1.0, cuff=SHIRT, pads=True)
    legs(p, b, c)

    # The forecast clicker, in the right hand.
    wr, ht = b.j["hand.R"]
    a, e = lerp(wr, ht, 0.1), lerp(wr, ht, 0.95)
    p.seg("clicker", (a[0], a[1] + 0.045, a[2]), (e[0], e[1] + 0.045, e[2]), 0.018, 0.016, PLASTIC, "hand.R", verts=4, mat=1)
    p.blob("clicker_button", (e[0], e[1] + 0.06, e[2] + 0.01), (0.01, 0.01, 0.01), BUTTON, "hand.R", mat=1)


class STANCE(Stance):
    """Upright and smiling: a weatherman's half-turn to camera, hands up."""


OVERRIDES = {
    # The lasso does the reaching (it's an effect); Dale throws it with the lead hand.
    "Isobar Lasso": {"limb": "hand.L", "prop": True},
    "Heat Lightning": {"limb": "hand.L", "style": "rising"},
    "td": {"limb": "hand.R"},
}


def fx(make, b):
    def cold_front(p):
        # A rolling wall of wind, 0.7 × 1.4 m: stacked, swirled bands.
        for i in range(5):
            u = 0.14 + i * 0.28
            p.blob(f"gust{i}", (0, 0.04 * (i % 2), u), (0.12, 0.33 - 0.02 * i, 0.16), WIND, "fx", mat=1)

    def hail(p):
        # A hailstone cluster, about 0.6 × 0.5 m.
        for i, (x, f, u, r) in enumerate(((0, 0, 0.25, 0.14), (0.12, 0.08, 0.12, 0.09), (-0.13, -0.05, 0.14, 0.1), (0.05, -0.12, 0.38, 0.08), (-0.06, 0.13, 0.4, 0.07))):
            p.blob(f"stone{i}", (x, f, u), (r, r, r * 0.9), ICE, "fx", mat=1)

    make("fx_cold_front", cold_front)
    make("fx_hail", hail)
