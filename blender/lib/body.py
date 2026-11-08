"""The humanoid every fighter starts from, stylised low-poly in flat
colours: the torso, neck, arms and legs are continuous meshes whose skin
weights blend across each joint (so they bend instead of hinging); hands,
heads, shoes and costume pieces are rigid parts on one bone. Numbers are for a 1.80 m fighter of average build;
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


def torso(p, b, c, waist=1.0, shape=None):
    """Pelvis to shoulders in one loft, blended hips → spine → chest. c:
    colours with keys bottom and top; the top's colour starts at `waist`
    (a jacket covers the hips: 0.93). shape overrides the (height, half-width,
    half-depth) sections, at 1.80 m reference size."""
    sections = shape or [
        (0.80, 0.135, 0.085), (0.88, 0.165, 0.098), (0.98, 0.17, 0.1), (1.08, 0.165, 0.1),
        (1.17, 0.165, 0.102), (1.26, 0.174, 0.106), (1.35, 0.198, 0.11), (1.43, c.get("shoulders", 0.215), 0.106), (1.475, 0.16, 0.075),
    ]
    sections = sorted(sections + [(waist, *_section_at(sections, waist)[1:])]) if not any(abs(h - waist) < 1e-3 for h, _, _ in sections) else sections

    def weights(h):
        # Hips below 1.0, chest above 1.3, blended in between through the spine.
        if h <= 1.0:
            return {"hips": 1.0}
        if h <= 1.16:
            t = (h - 1.0) / 0.16
            return {"hips": 1 - t, "spine": t}
        if h <= 1.32:
            t = (h - 1.16) / 0.16
            return {"spine": 1 - t, "chest": t}
        return {"chest": 1.0}

    rings = []
    for h, w, d in sections:
        rings.append((b.p(0, 0, h), (w * b.k * b.g, d * b.k * b.g), weights(h), c["top"] if h >= waist - 1e-3 else c["bottom"]))
    p.tube("torso", rings, verts=12)


def _section_at(sections, h):
    for (h0, w0, d0), (h1, w1, d1) in zip(sections, sections[1:]):
        if h0 <= h <= h1:
            t = (h - h0) / (h1 - h0)
            return (h, w0 + (w1 - w0) * t, d0 + (d1 - d0) * t)
    return sections[-1]


def head(p, b, c, face=True):
    """Neck, head, ears and a face; hair is up to each fighter."""
    s = b.head
    hz = b.j["head"][0][2]  # the head bone's base

    def hp(side, fwd, up):
        # Head parts scale about the head bone's base, by the head factor too.
        return (side * b.k * s, fwd * b.k * s, hz + (up - 1.55) * b.k * s)

    def hr(rx, rf, ru):
        return (rx * b.k * s, rf * b.k * s, ru * b.k * s)

    n0, n1 = b.j["neck"]
    p.tube("neck", [(lerp(n0, n1, -0.4), b.r(0.052), {"chest": 1.0}, c["skin"]),
                    (lerp(n0, n1, 0.15), b.r(0.05), {"chest": 0.4, "neck": 0.6}, c["skin"]),
                    (lerp(n0, n1, 0.8), b.r(0.048), {"neck": 0.6, "head": 0.4}, c["skin"]),
                    (lerp(n0, n1, 1.3), b.r(0.046), {"head": 1.0}, c["skin"])], verts=8)
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
    """Arms, shoulder to wrist in one tube with weights graded across the
    elbow; `sleeve` is how far down the top's colour goes (0 bare, 0.45
    short sleeves, 1 to the wrist); `cuff` a colour at the wrist."""
    for s, side in (("L", 1), ("R", -1)):
        sh, el = b.j[f"upper_arm.{s}"]
        wr = b.j[f"forearm.{s}"][1]
        ht = b.j[f"hand.{s}"][1]
        ua, fa, hd, sb = f"upper_arm.{s}", f"forearm.{s}", f"hand.{s}", f"shoulder.{s}"
        upper = c["top"] if sleeve > 0.4 else c["skin"]
        lower = c["top"] if sleeve > 0.9 else c["skin"]
        if pads:
            p.blob(f"pad.{s}", b.p(side * 0.19, 0, 1.425), (b.r(0.078), b.r(0.078), b.r(0.062)), c["top"], sb)
        else:
            p.blob(f"shoulder.{s}", b.p(side * 0.18, 0, 1.42), (b.r(0.062), b.r(0.062), b.r(0.055)), c["top"], sb)
        p.tube(f"arm.{s}", [
            (lerp(sh, el, -0.12), b.r(0.058), {sb: 0.6, ua: 0.4}, upper),
            (lerp(sh, el, 0.15), b.r(0.057), {ua: 1.0}, upper),
            (lerp(sh, el, 0.55), b.r(0.054), {ua: 1.0}, upper),
            (lerp(sh, el, 0.84), b.r(0.05), {ua: 0.85, fa: 0.15}, upper if sleeve > 0.4 else lower),
            (el, b.r(0.047), {ua: 0.5, fa: 0.5}, lower),
            (lerp(el, wr, 0.16), b.r(0.046), {ua: 0.15, fa: 0.85}, lower),
            (lerp(el, wr, 0.55), b.r(0.044), {fa: 1.0}, lower),
            (lerp(el, wr, 0.84), b.r(0.04), {fa: 1.0}, cuff or lower),
            (wr, b.r(0.038), {fa: 0.6, hd: 0.4}, cuff or lower),
        ], verts=8)
        # A mitten fist on the hand, with a thumb.
        p.tube(f"fist.{s}", [
            (lerp(wr, ht, -0.08), b.r(0.04), {fa: 0.3, hd: 0.7}, c["skin"]),
            (lerp(wr, ht, 0.25), b.r(0.052), {hd: 1.0}, c["skin"]),
            (lerp(wr, ht, 0.62), b.r(0.046), {hd: 1.0}, c["skin"]),
            (lerp(wr, ht, 0.72), b.r(0.03), {hd: 1.0}, c["skin"]),
        ], verts=6)
        m = lerp(wr, ht, 0.3)
        p.blob(f"thumb.{s}", (m[0], m[1] + b.r(0.035), m[2]), (b.r(0.02), b.r(0.022), b.r(0.028)), c["skin"], hd)


def legs(p, b, c, shin=None, shoe_h=0.1):
    """Legs, hip to ankle in one tube with weights graded across the knee;
    shoes are rigid on the foot and toe. `shin` colours the lower leg
    differently (leg warmers, boots)."""
    for s in ("L", "R"):
        hip, knee = b.j[f"thigh.{s}"]
        ankle = b.j[f"shin.{s}"][1]
        th, sn, ft = f"thigh.{s}", f"shin.{s}", f"foot.{s}"
        low = shin or c["bottom"]
        p.tube(f"leg.{s}", [
            (lerp(hip, knee, -0.12), b.r(0.086), {"hips": 0.5, th: 0.5}, c["bottom"]),
            (lerp(hip, knee, 0.1), b.r(0.084), {"hips": 0.15, th: 0.85}, c["bottom"]),
            (lerp(hip, knee, 0.5), b.r(0.074), {th: 1.0}, c["bottom"]),
            (lerp(hip, knee, 0.86), b.r(0.064), {th: 0.85, sn: 0.15}, c["bottom"]),
            (knee, b.r(0.062), {th: 0.5, sn: 0.5}, low),
            (lerp(knee, ankle, 0.14), b.r(0.06), {th: 0.15, sn: 0.85}, low),
            (lerp(knee, ankle, 0.6), b.r(0.056), {sn: 1.0}, low),
            (lerp(knee, ankle, 0.97), b.r(0.05), {sn: 0.7, ft: 0.3}, low),
        ], verts=8)
        x, k, g = ankle[0], b.k, b.g
        w = 0.047 * k * g
        h = shoe_h * k
        p.hull(f"shoe.{s}", [(x + dx, f * k, u) for dx in (-w, w) for f, u in ((-0.065, 0), (-0.065, h), (0.0, h * 1.15), (0.13, 0), (0.13, h * 0.72))], c["shoes"], ft)
        p.hull(f"toecap.{s}", [(x + dx, 0.128 * k, u) for dx in (-w * 0.96, w * 0.96) for u in (0, h * 0.7)]
               + [(x + dx, 0.215 * k, u) for dx in (-w * 0.77, w * 0.77) for u in (0, h * 0.42)], c["shoes"], f"toe.{s}")
