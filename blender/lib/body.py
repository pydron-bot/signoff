"""The humanoid blockout every fighter starts from: rigid parts, one bone
each, in flat colours. Numbers are for a 1.80 m fighter of average build;
`Build` scales them to each fighter's height and girth, and each fighter's
module adds its own costume parts on top.
"""
from .common import Parts, vertex_colour_material
from .rig import joints


def lerp(a, b, t):
    return tuple(x + (y - x) * t for x, y in zip(a, b))


class Build:
    """Scales 1.80 m reference numbers: heights by height/1.80, widths and
    depths also by girth."""

    def __init__(self, height, girth=1.0, head=1.0):
        self.k = height / 1.80
        self.g = girth
        self.head = head
        self.height = height
        self.j = joints(height)

    def p(self, side, fwd, up):
        """A torso point: side and fwd widen with girth."""
        return (side * self.k * self.g, fwd * self.k * self.g, up * self.k)

    def r(self, radius):
        """A limb radius."""
        return radius * self.k * (1 + (self.g - 1) * 0.7)

    def ring(self, side, fwd, edge, up):
        """An octagon-ish cross-section at height `up` (half-width, half-depth, corner cut)."""
        pts = [(sx * side, sf * (fwd - edge), up) for sx in (-1, 1) for sf in (-1, 1)]
        pts += [(sx * (side - edge * 1.4), sf * fwd, up) for sx in (-1, 1) for sf in (-1, 1)]
        return [self.p(*q) for q in pts]


def new_parts():
    return Parts([vertex_colour_material("body"), vertex_colour_material("props", roughness=0.4)])


def torso(p, b, c, hem=True):
    """Hips, abdomen and chest. c: colours with keys bottom, top (and hem: the
    top's colour over the hips, for jackets and leotards)."""
    p.hull("pelvis", b.ring(0.165, 0.10, 0.035, 0.84) + b.ring(0.17, 0.10, 0.035, 1.02), c["bottom"], "hips")
    if hem:
        p.hull("hem", b.ring(0.178, 0.112, 0.035, 0.95) + b.ring(0.172, 0.108, 0.035, 1.08), c.get("hem", c["top"]), "hips")
    p.hull("belly", b.ring(0.168, 0.106, 0.035, 1.05) + b.ring(0.172, 0.108, 0.035, 1.26), c["top"], "spine")
    p.hull("chest", b.ring(0.172, 0.108, 0.035, 1.23) + b.ring(c.get("shoulders", 0.215), 0.11, 0.04, 1.455), c["top"], "chest")


def head(p, b, c, face=True):
    """Neck, head, ears and a face; hair is up to each fighter."""
    s = b.head
    hz = b.j["head"][0][2]  # the head bone's base

    def hp(side, fwd, up):
        # Head parts scale about the head bone's base, by the head factor too.
        return (side * b.k * s, fwd * b.k * s, hz + (up - 1.55) * b.k * s)

    def hr(rx, rf, ru):
        return (rx * b.k * s, rf * b.k * s, ru * b.k * s)

    p.seg("neck", b.j["neck"][0], b.j["neck"][1], b.r(0.05), b.r(0.048), c["skin"], "neck")
    p.blob("head", hp(0, 0.015, 1.665), hr(0.093, 0.105, 0.12), c["skin"], "head", subdiv=2)
    for sd in (1, -1):
        p.blob(f"ear{sd}", hp(sd * 0.094, 0.0, 1.665), hr(0.018, 0.03, 0.036), c["skin"], "head")
        if face:
            p.box(f"eye{sd}", hp(sd * 0.036, 0.113, 1.688), hr(0.024, 0.012, 0.015), c.get("eyes", (34, 28, 28)), "head")
            p.box(f"brow{sd}", hp(sd * 0.038, 0.111, 1.712), hr(0.036, 0.012, 0.009), c.get("brows", c["hair"]), "head")
    if face:
        p.hull("nose", [hp(-0.012, 0.11, 1.675), hp(0.012, 0.11, 1.675), hp(0, 0.11, 1.678),
                        hp(-0.014, 0.112, 1.645), hp(0.014, 0.112, 1.645), hp(0, 0.137, 1.648)], c["skin"], "head")
    return hp, hr


def arms(p, b, c, sleeve=1.0, cuff=None, pads=False):
    """Arms: `sleeve` is how far down the arm the top's colour goes (0 bare,
    0.45 short sleeves, 1 to the wrist); `cuff` a colour at the wrist."""
    for s, side in (("L", 1), ("R", -1)):
        sh, el = b.j[f"upper_arm.{s}"]
        wr = b.j[f"forearm.{s}"][1]
        ht = b.j[f"hand.{s}"][1]
        upper = c["top"] if sleeve > 0.4 else c["skin"]
        lower = c["top"] if sleeve > 0.9 else c["skin"]
        if pads:
            p.blob(f"pad.{s}", b.p(side * 0.19, 0, 1.425), (b.r(0.078), b.r(0.078), b.r(0.062)), c["top"], f"shoulder.{s}")
        else:
            p.blob(f"shoulder.{s}", b.p(side * 0.18, 0, 1.42), (b.r(0.062), b.r(0.062), b.r(0.055)), c["top"], f"shoulder.{s}")
        p.seg(f"upper_arm.{s}", sh, el, b.r(0.056), b.r(0.048), upper, f"upper_arm.{s}")
        p.blob(f"elbow.{s}", el, (b.r(0.048),) * 3, lower, f"forearm.{s}")
        p.seg(f"forearm.{s}", el, lerp(el, wr, 0.86), b.r(0.046), b.r(0.04), lower, f"forearm.{s}")
        p.seg(f"cuff.{s}", lerp(el, wr, 0.84), wr, b.r(0.038), b.r(0.036), cuff or lower, f"forearm.{s}")
        p.seg(f"fist.{s}", lerp(wr, ht, -0.05), lerp(wr, ht, 0.62), b.r(0.05), b.r(0.048), c["skin"], f"hand.{s}", verts=4, spin=0.785)


def legs(p, b, c, shin=None, shoe_h=0.1):
    """Legs and shoes. `shin` colours the lower leg differently (leg warmers, boots)."""
    for s in ("L", "R"):
        hip, knee = b.j[f"thigh.{s}"]
        ankle = b.j[f"shin.{s}"][1]
        p.seg(f"thigh.{s}", lerp(hip, knee, -0.08), knee, b.r(0.08), b.r(0.062), c["bottom"], f"thigh.{s}")
        p.blob(f"knee.{s}", knee, (b.r(0.06),) * 3, c["bottom"], f"shin.{s}")
        p.seg(f"shin.{s}", knee, lerp(knee, ankle, 0.9), b.r(0.057), b.r(0.054), shin or c["bottom"], f"shin.{s}")
        x, k, g = ankle[0], b.k, b.g
        w = 0.047 * k * g
        h = shoe_h * k
        p.hull(f"shoe.{s}", [(x + dx, f * k, u) for dx in (-w, w) for f, u in ((-0.065, 0), (-0.065, h), (0.0, h * 1.15), (0.13, 0), (0.13, h * 0.72))], c["shoes"], f"foot.{s}")
        p.hull(f"toecap.{s}", [(x + dx, 0.128 * k, u) for dx in (-w * 0.96, w * 0.96) for u in (0, h * 0.7)]
               + [(x + dx, 0.215 * k, u) for dx in (-w * 0.77, w * 0.77) for u in (0, h * 0.42)], c["shoes"], f"toe.{s}")
