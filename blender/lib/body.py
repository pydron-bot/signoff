"""The humanoid every fighter starts from, stylised low-poly in flat
colours: the torso, neck, arms and legs are continuous meshes whose skin
weights blend across each joint (so they bend instead of hinging); hands,
heads, shoes and costume pieces are rigid parts on one bone. Numbers are for a 1.80 m fighter of average build;
`Build` scales them to each fighter's height and girth, and each fighter's
module adds its own costume parts on top.
"""
import numpy as np

from .common import Parts, vertex_colour_material
from .rig import finger_joints, hand_frame, joints


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


def torso(p, b, c, waist=1.0, shape=None, paint=None):
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
    p.tube("torso", rings, verts=14, paint=paint)


def _section_at(sections, h):
    for (h0, w0, d0), (h1, w1, d1) in zip(sections, sections[1:]):
        if h0 <= h <= h1:
            t = (h - h0) / (h1 - h0)
            return (h, w0 + (w1 - w0) * t, d0 + (d1 - d0) * t)
    return sections[-1]


def about(centre, scale=(1, 1, 1), move=(0, 0, 0), slope=0.0):
    """A shape-key function: points scaled about `centre` (fighter space),
    the side-up plane tipped by `slope` (up per metre of side), then moved."""
    def f(q):
        d = [(q[i] - centre[i]) * scale[i] for i in range(3)]
        return (centre[0] + d[0] + move[0], centre[1] + d[1] + move[1], centre[2] + d[2] + slope * d[0] + move[2])
    return f


def head_frame(b):
    """hp, hr and the inverse of hp: texel positions back to the 1.80 m
    reference head's coordinates (side, fwd, up), for painting faces."""
    s = b.head
    hz = b.j["head"][0][2]

    def hp(side, fwd, up):
        # Head parts scale about the head bone's base, by the head factor too.
        return (side * b.k * s, fwd * b.k * s, hz + (up - 1.55) * b.k * s)

    def hr(rx, rf, ru):
        return (rx * b.k * s, rf * b.k * s, ru * b.k * s)

    def ref(t):
        f = b.k * s
        return t.side / f, t.fwd / f, (t.up - hz) / f + 1.55

    return hp, hr, ref


# The three expressions every face swaps to (shape keys, keyed by the clips).
EXPRESSIONS = ("hurt", "ko", "win")


def head(p, b, c, face=True, paint=None, skull=None, chin="jaw"):
    """Neck, head, ears and a face: a brow ridge and nose, eyes (whites and
    pupils as separate pieces) and brows, with shape keys for the
    expressions; the mouth and hair are up to each fighter. c may set eyes,
    brows, whites, eye (white radii), lids (0 open … 1 heavy-lidded) and
    brow_lift (extra height for the left and right brows). The chin rides
    the `jaw` bone (`chin`: another bone keeps it still)."""
    hp, hr, _ = head_frame(b)
    n0, n1 = b.j["neck"]
    p.tube("neck", [(lerp(n0, n1, -0.4), b.r(0.052), {"chest": 1.0}, c["skin"]),
                    (lerp(n0, n1, 0.15), b.r(0.05), {"chest": 0.4, "neck": 0.6}, c["skin"]),
                    (lerp(n0, n1, 0.8), b.r(0.048), {"neck": 0.6, "head": 0.4}, c["skin"]),
                    (lerp(n0, n1, 1.3), b.r(0.046), {"head": 1.0}, c["skin"])], verts=8, paint=paint)
    p.blob("head", hp(0, 0.015, 1.665), hr(*(skull or (0.093, 0.105, 0.12))), c["skin"], "head", subdiv=2, paint=paint)
    # The jaw and chin, a little squarer than the egg.
    p.hull("head_jaw", [hp(x, f, u) for x, f, u in ((-0.07, 0.04, 1.6), (0.07, 0.04, 1.6), (-0.06, 0.085, 1.585), (0.06, 0.085, 1.585),
                                                     (-0.035, 0.1, 1.552), (0.035, 0.1, 1.552), (-0.05, 0.02, 1.56), (0.05, 0.02, 1.56),
                                                     (0, 0.105, 1.55), (-0.075, 0.0, 1.63), (0.075, 0.0, 1.63))], c["skin"], chin, paint=paint)
    for sd in (1, -1):
        p.blob(f"ear{sd}", hp(sd * 0.094, 0.0, 1.665), hr(0.018, 0.03, 0.036), c["skin"], "head", paint=paint)
    if not face:
        return hp, hr
    # The brow ridge over the eye sockets, and the nose.
    p.hull("brow_ridge", [hp(x, f, u) for x, f, u in ((-0.075, 0.09, 1.712), (0.075, 0.09, 1.712), (-0.06, 0.112, 1.706), (0.06, 0.112, 1.706),
                                                       (0, 0.124, 1.706), (-0.06, 0.104, 1.722), (0.06, 0.104, 1.722), (0, 0.116, 1.724))], c["skin"], "head", paint=paint)
    planes = c.get("planes", True)  # Mumbles' painted wooden face has none of these
    if planes:
        # The nose as a wedge: a narrow bridge, a sharp ridge out to the tip,
        # flared wings and a flat underside with two nostrils set into it.
        p.hull("nose", [hp(x, f, u) for x, f, u in ((-0.008, 0.11, 1.697), (0.008, 0.11, 1.697), (0, 0.123, 1.697), (0, 0.147, 1.649),
                                                    (-0.021, 0.11, 1.643), (0.021, 0.11, 1.643), (-0.016, 0.122, 1.635), (0.016, 0.122, 1.635),
                                                    (0, 0.135, 1.634))], c["skin"], "head", paint=paint)
        dark = tuple(int(v * 0.45) for v in c["skin"])
        for sd in (1, -1):
            p.blob(f"nostril{sd}", hp(sd * 0.0085, 0.1285, 1.6355), hr(0.0048, 0.0042, 0.0018), dark, "head")
            # Cheekbones: a plane under each eye, angled out to the side.
            p.hull(f"cheek{sd}", [hp(sd * x, f, u) for x, f, u in ((0.047, 0.109, 1.664), (0.074, 0.084, 1.668), (0.071, 0.08, 1.634), (0.047, 0.105, 1.638),
                                                                    (0.047, 0.082, 1.664), (0.07, 0.06, 1.666), (0.068, 0.058, 1.636), (0.047, 0.08, 1.638))],
                   c["skin"], "head", paint=paint)
    else:
        p.hull("nose", [hp(-0.012, 0.112, 1.69), hp(0.012, 0.112, 1.69), hp(0, 0.122, 1.695),
                        hp(-0.017, 0.112, 1.645), hp(0.017, 0.112, 1.645), hp(0, 0.142, 1.648), hp(0, 0.122, 1.64)], c["skin"], "head", paint=paint)
    er = c.get("eye", (0.021, 0.008, 0.015))
    lids = c.get("lids", 0.0)
    for sd in (1, -1):
        ec = (sd * c.get("eye_side", 0.037), 0.105, 1.688)
        centre = hp(*ec)
        white = hr(er[0], er[1], er[2] * (1 - 0.35 * lids))
        wc = hp(ec[0], ec[1], ec[2] - er[2] * 0.3 * lids)
        squint = {"hurt": about(wc, (1.05, 1, 0.45)), "ko": about(wc, (1.05, 1, 0.12), (0, 0, -0.002)), "win": about(wc, (1, 1, 0.75))}
        p.blob(f"eye{sd}", wc, white, c.get("whites", (240, 236, 226)), "head", shapes=squint, paint=c.get("eye_paint"))
        if planes and lids < 0.5:
            # A lid line over the top of the eye (heavy lids are their own line);
            # it squints with the eye.
            import math
            arc = [(hp(ec[0] + math.cos(a) * er[0] * 1.06, ec[1] + er[1] * 0.75, ec[2] - er[2] * 0.3 * lids + math.sin(a) * er[2] * (1 - 0.35 * lids) * 1.08), 0.0019 * b.k * b.head)
                   for a in (math.radians(d) for d in (170, 140, 115, 90, 65, 40, 10))]
            p.tube(f"lid_line{sd}", [(q, r, {"head": 1.0}, c.get("lid_line", tuple(int(v * 0.5) for v in c["skin"]))) for q, r in arc], verts=4, shapes=squint)
        pc = hp(ec[0] - sd * c.get("pupil_in", 0.004), ec[1] + er[1] * 0.85, ec[2] - er[2] * 0.3 * lids - 0.001)
        pr = hr(er[0] * 0.42, er[1] * 0.45, er[2] * 0.62 * (1 - 0.3 * lids))
        p.blob(f"pupil{sd}", pc, pr, c.get("eyes", (34, 28, 28)), "head", paint=c.get("eye_paint"),
               shapes={"hurt": about(pc, (0.7, 1, 0.5)), "ko": about(pc, (1.2, 1, 0.12), (0, 0, -0.003)), "win": about(pc, (1, 1, 0.75))})
        if lids:
            # Heavy upper lids: a skin-coloured hood over the top of each eye.
            lc = hp(ec[0], ec[1] + 0.004, ec[2] + er[2] * 0.55)
            p.blob(f"lid{sd}", lc, hr(er[0] * 1.15, er[1] * 1.1, er[2] * 0.55 * lids), c["skin"], "head", paint=paint,
                   shapes={"ko": about(lc, (1, 1, 1.4), (0, 0, -0.004))})
        lift = c.get("brow_lift", (0.0, 0.0))[0 if sd > 0 else 1]  # one brow higher (L, R)
        bc = hp(sd * 0.04, 0.114, 1.716 + c.get("brow_raise", 0.0) + lift)
        p.box(f"brow{sd}", bc, hr(0.038, 0.012, 0.009), c.get("brows", c["hair"]), "head",
              shapes={"hurt": about(bc, move=(0, 0, -0.005), slope=sd * 0.45), "ko": about(bc, move=(0, 0, -0.006), slope=sd * 0.15),
                      "win": about(bc, move=(0, 0, 0.008), slope=-sd * 0.1)})
    return hp, hr


def mouth(p, b, centre, width, height, colour, kind="grin", inner=(60, 24, 28), teeth=None, paint=None, lips=None, skin=None):
    """A mouth (reference head coordinates): `grin` is a D-shaped open smile
    (with a row of teeth), `line` a closed mouth, `lips` lips over a line.
    Shape keys: a grimace when hurt, slack when KO'd, wider when winning.
    `lips` (a colour, with the `skin` they fade into) rolls lips round a
    grin or a `lips` mouth, set into the face with tucked corners."""
    hp, hr, _ = head_frame(b)
    cx, cf, cu = centre
    c0 = hp(*centre)
    shapes = {"hurt": about(c0, (0.85, 1, 2.0), (0, 0, -0.004)), "ko": about(c0, (0.6, 1, 1.7), (0, 0, -0.004)), "win": about(c0, (1.2, 1, 1.5))}

    def lower(q):
        # The mouth's lower half rides the jaw, so it opens when the jaw drops.
        return {"jaw": 1.0} if q[2] < c0[2] - 1e-4 else {"head": 1.0}

    if lips is not None and kind in ("grin", "lips"):
        _lips(p, b, centre, width, height, kind, lips, skin or colour, inner, shapes)
        if kind == "lips":
            # The lips are the mouth now: a dark line between them.
            p.box("mouth", c0, hr(width * 0.9, 0.01, height * 0.3), inner, "head", shapes=shapes, weigh=lower)
            return

    if kind == "grin":
        w, h = width / 2, height
        pts = [hp(cx + x * w, cf, cu + h * 0.35) for x in (-1, -0.5, 0, 0.5, 1)]
        pts += [hp(cx + x * w * 0.8, cf + 0.004, cu + h * 0.35 - h * (1 - x * x) * 1.0) for x in (-0.75, -0.4, 0, 0.4, 0.75)]
        pts += [hp(cx + x * w * 0.9, cf - 0.006, cu + h * 0.1) for x in (-1, 1)]
        p.hull("mouth", pts, inner, "head", shapes=shapes, weigh=lower)
        if teeth:
            # The upper teeth fill the top of the grin, in front of the mouth.
            tp = [hp(cx + x * w * 0.9, cf + 0.007, cu + h * 0.33) for x in (-1, -0.5, 0, 0.5, 1)]
            tp += [hp(cx + x * w * 0.78, cf + 0.009, cu + h * 0.33 - h * 0.5 * (1 - 0.6 * x * x)) for x in (-0.9, -0.45, 0, 0.45, 0.9)]
            tp += [hp(cx, cf + 0.001, cu + h * 0.2)]
            p.hull("teeth", tp, teeth, "head", paint=paint, shapes={"hurt": about(c0, (0.85, 1, 1.0), (0, 0.001, 0.002)), "ko": about(c0, (0.6, 1, 0.8), (0, 0, 0.001)),
                                                                     "win": about(c0, (1.2, 1, 1.3))})
    else:
        p.box("mouth", c0, hr(width, 0.012, height), inner if kind == "line" else colour, "head", shapes=shapes, weigh=lower)
        if kind == "lips":
            for name, du, hh in (("lip_top", height * 0.7, 0.45), ("lip_bottom", -height * 0.75, 0.55)):
                lc = hp(cx, cf + 0.002, cu + du)
                p.box(name, lc, hr(width * (1.05 if du > 0 else 0.95), 0.014, height * hh), colour, "head" if du > 0 else "jaw",
                      shapes={"hurt": about(c0, (0.85, 1, 2.0), (0, 0, -0.004)), "ko": about(c0, (0.6, 1, 1.7), (0, 0, -0.004)), "win": about(c0, (1.2, 1, 1.5))})


def _lips(p, b, centre, width, height, kind, colour, skin, inner, shapes):
    """Upper and lower lips rolled along the mouth's outline (the upper on
    the head, the lower on the jaw), painted from that outline with a soft
    edge into the skin, and a small dark tuck at each corner."""
    from . import paint as P

    hp, hr, ref = head_frame(b)
    cx, cf, cu = centre
    w, h = width / 2, height
    k = b.k * b.head
    if kind == "grin":
        # Along the grin's straight top and round its D-shaped bottom.
        top = lambda x: cu + h * 0.35 + 0.0025
        bottom = lambda x: cu + h * 0.35 - h * (1 - x * x) * 0.95 - 0.003
        r_top, r_bottom = 0.0032, 0.0042
    else:
        # A closed mouth: a cupid's bow on top, a fuller lower lip.
        top = lambda x: cu + h * 0.55 + 0.0012 * abs(x) - 0.0015 * (1 - abs(x)) * (abs(x) < 0.35)
        bottom = lambda x: cu - h * 0.6 + 0.002 * x * x
        r_top, r_bottom = 0.0034, 0.0044
    xs = (-1.0, -0.8, -0.5, -0.2, 0.0, 0.2, 0.5, 0.8, 1.0)
    for name, line, r0, bone in (("lip_top", top, r_top, "head"), ("lip_bottom", bottom, r_bottom, "jaw")):
        def radius(x, r0=r0):
            return r0 * (1 - 0.55 * x * x)

        def lip_paint(t, line=line, radius=radius):
            # The lip's colour across the middle of its roll, fading into the
            # skin at its edges, so it reads as set into the face.
            x, _, u = ref(t)
            rx = np.clip((x - cx) / w, -1, 1)
            d = np.abs(u - np.array([line(v) for v in rx])) / np.maximum(1e-4, np.array([radius(v) for v in rx]))
            a = np.clip(1.6 - 1.1 * d, 0, 1)
            t.c = np.array(colour, float) * a[:, None] + np.array(skin, float) * (1 - a[:, None])
            return P.light(t)

        rings = [(hp(cx + x * w * 1.02, cf + 0.003 - 0.004 * x * x, line(x)), radius(x) * k, {bone: 1.0}, colour) for x in xs]
        p.tube(name, rings, verts=6, paint=lip_paint, shapes=shapes)
    for sd in (1, -1):
        corner = (top(1.0) + bottom(1.0)) / 2
        p.blob(f"mouth_corner{sd}", hp(cx + sd * w * 1.04, cf - 0.002, corner), hr(0.0035, 0.004, 0.0035), tuple(int(v * 0.6) for v in inner), "head", shapes=shapes)


def face_paint(b, skin, eyes_shadow=None, blush=None, stubble=None, tan=None, extra=None):
    """A paint function for the head's skin pieces: shading in the eye
    sockets and under the nose and chin, then (optional) eye shadow, blush,
    stubble (a darker jaw), a tan; `extra(t, side, fwd, up)` paints more in
    reference head coordinates."""
    from . import paint as P

    _, _, ref = head_frame(b)

    def fn(t):
        c = P.light(t)
        x, f, u = ref(t)
        front = f > 0.04
        for sd in (1, -1):
            c = P.shade(c, front & P.ellipse(x, u, sd * 0.038, 1.692, 0.04, 0.026), 0.86)
        c = P.shade(c, front & P.ellipse(x, u, 0, 1.636, 0.022, 0.01), 0.85)
        if tan is not None:
            c = P.put(c, np.ones(len(c), bool), tan, 0.35)
        if eyes_shadow is not None:
            for sd in (1, -1):
                c = P.put(c, front & P.ellipse(x, u, sd * 0.04, 1.704, 0.034, 0.012), eyes_shadow, 0.8)
        if blush is not None:
            for sd in (1, -1):
                c = P.put(c, front & P.ellipse(x, u, sd * 0.058, 1.648, 0.022, 0.016), blush, 0.55)
        if stubble is not None:
            jaw = (u < 1.632 - 0.25 * np.abs(x)) & (f > -0.03) & ~P.ellipse(x, u, 0, 1.622, 0.03, 0.012)
            c = P.put(c, jaw & (u > 1.53), stubble, 0.55)
        if extra is not None:
            c = extra(t, c, x, f, u)
        return c

    return fn


def lit(t):
    """The default paint: just the soft painted light."""
    from . import paint as P

    return P.light(t)


def clump(p, name, root, tip, width, colour, bone, paint=None, flat=0.6, shapes=None):
    """A chunky, faceted lock of hair (or any tapering piece): a hull from a
    ring at `root` (fighter space) to a point at `tip`, widest a third of
    the way along; `flat` squashes it across."""
    import math

    from mathutils import Vector

    r, t = Vector(root), Vector(tip)
    a = (t - r).normalized()
    u = a.orthogonal().normalized()
    v = a.cross(u)
    pts = []
    for along, wid in ((0.0, 0.8), (0.35, 1.0), (0.75, 0.55)):
        c = r + (t - r) * along
        for k in range(5):
            ang = 2 * math.pi * k / 5 + along
            pts.append(tuple(c + (u * math.cos(ang) + v * math.sin(ang) * flat) * width * wid))
    pts.append(tuple(t))
    return p.hull(name, pts, colour, bone, paint=paint, shapes=shapes)


def hand(p, b, s, colour, size=1.0, paint=None, thumb_colour=None):
    """A faceted hand on the step-21 bones: the palm with the thumb's ball
    and a knuckle bump per finger on the hand, then each finger as three
    tapering pieces, one per phalanx (the index on index…index_3, the other
    three together on fingers…fingers_3), and the thumb in two. The bones
    curl them (rig.pose_hands_and_jaw); each piece starts a little behind its
    joint, so a curl shows no gap."""
    import math

    wr, a, w, n, L = hand_frame(b.j, s)
    L *= size
    hd = f"hand.{s}"
    k = b.k * (1 + (b.g - 1) * 0.5) * size
    fj = finger_joints(b.height, s, size)

    def at(t, u, v):
        return tuple(wr + a * t + w * u + n * v)

    def slab(name, sections, u0, u1, bone):
        # sections: (t along the hand, half-width, half-thickness); u0…u1 the
        # slice across it (−1 little-finger side … 1 thumb side).
        pts = []
        for t, wid, th in sections:
            for u in (u0, u1):
                for v in (-1, 1):
                    pts.append(at(t * L, u * wid * k, v * th * k * (1.0 if v > 0 else 0.9)))
        p.hull(name, pts, colour, bone, paint=paint)

    def piece(name, c0, c1, r0, r1, bone, col, back=0.6):
        # A five-sided tapering piece from c0 to c1, slightly flattened
        # front to back, its base pushed back into the joint behind it.
        c0, c1 = np.array(c0), np.array(c1)
        d = (c1 - c0) / np.linalg.norm(c1 - c0)
        u = np.cross(n, d)
        u /= np.linalg.norm(u)
        v = np.cross(d, u)
        pts = []
        for c, r in ((c0 - d * r0 * back, r0), (c1, r1)):
            for i in range(5):
                ang = 2 * math.pi * i / 5 + math.pi / 2
                pts.append(tuple(c + (u * math.cos(ang) + v * math.sin(ang) * 0.85) * r))
        p.hull(name, pts, col, bone, paint=paint)

    slab(f"palm.{s}", ((-0.1, 0.034, 0.02), (0.15, 0.046, 0.024), (0.45, 0.048, 0.019)), -1, 1, hd)
    # The thumb's ball, on the palm side by the wrist.
    ball = [at(t * L, u * k, v * k) for t in (0.05, 0.32) for u in (0.022, 0.046) for v in (-0.026, 0.004)]
    p.hull(f"thenar.{s}", ball, colour, hd, paint=paint)

    def along(bone):
        return [float(np.dot(np.array(q) - wr, a)) for q in fj[bone]]

    # (finger, group, across the hand, tip as a fraction of the hand, radius)
    for f, g, u, tip, r in (("index", "index", 0.036, 0.98, 0.0115), ("middle", "fingers", 0.012, 1.0, 0.012),
                            ("ring", "fingers", -0.012, 0.96, 0.011), ("little", "fingers", -0.035, 0.88, 0.0095)):
        bones = [f"{g}.{s}", f"{g}_2.{s}", f"{g}_3.{s}"]
        ts = [along(bones[0])[0], along(bones[1])[0], along(bones[2])[0], tip * L]
        rs = [r * k, r * k * 0.93, r * k * 0.86, r * k * 0.75]
        # The knuckle: a bump on the back of the hand.
        kn = np.array(at(ts[0], u * k, 0.012 * k))
        p.hull(f"knuckle_{f}.{s}", [tuple(kn + e * r * k * 0.8) for e in (a, -a, w, -w, n, -n * 1.5)], colour, hd, paint=paint)
        for i, bone in enumerate(bones):
            piece(f"{f}{i + 1}.{s}", at(ts[i], u * k, 0), at(ts[i + 1], u * k, 0), rs[i], rs[i + 1], bone, colour)
    th0, th1 = fj[f"thumb.{s}"]
    th2 = fj[f"thumb_2.{s}"][1]
    tc = thumb_colour or colour
    piece(f"thumb1.{s}", th0 - (th1 - th0) * 0.25, th1, 0.016 * k, 0.0135 * k, f"thumb.{s}", tc)
    piece(f"thumb2.{s}", th1, th2, 0.0135 * k, 0.0105 * k, f"thumb_2.{s}", tc)


def grip(b, s):
    """A held prop's frame on hand `s` at rest: the wrist, `a` along the hand
    to the fingertips, `w` toward the thumb (forward), the hand's length, and
    the point inside the fist it collapses to (Parts.held). Props run out
    along `a`, so a prop's tip `reach` metres past the fingertips is where
    anim.tip_point puts it."""
    wr, ht = (np.array(v) for v in b.j[f"hand.{s}"])
    L = float(np.linalg.norm(ht - wr))
    a = (ht - wr) / L
    w = np.cross(a, (1.0, 0, 0))
    w /= np.linalg.norm(w)
    if w[1] < 0:
        w = -w
    return wr, a, w, L, tuple(wr + a * 0.35 * L)


def ring(p, name, centre, u, v, radius, thick, colour, bone, mat=1, paint=None, n=12):
    """A torus in the plane of u and v (a handcuff, a key ring)."""
    import math

    pts = [tuple(np.array(centre) + radius * (math.cos(t) * np.array(u) + math.sin(t) * np.array(v)))
           for t in (2 * math.pi * i / n for i in range(n + 1))]
    p.tube(name, [(q, thick, {bone: 1.0}, colour) for q in pts], verts=5, mat=mat, caps=False, paint=paint)


def arms(p, b, c, sleeve=1.0, cuff=None, pads=False, paint=None, hand_paint=None, cuff_rim=None):
    """Arms, shoulder to wrist in one tube with weights graded across the
    elbow; `sleeve` is how far down the top's colour goes (0 bare, 0.45
    short sleeves, 1 to the wrist); `cuff` a colour at the wrist, and
    `cuff_rim` a separate rim there (a shirt cuff showing under a sleeve)."""
    for s, side in (("L", 1), ("R", -1)):
        sh, el = b.j[f"upper_arm.{s}"]
        wr = b.j[f"forearm.{s}"][1]
        ua, fa, hd, sb = f"upper_arm.{s}", f"forearm.{s}", f"hand.{s}", f"shoulder.{s}"
        upper = c["top"] if sleeve > 0.4 else c["skin"]
        lower = c["top"] if sleeve > 0.9 else c["skin"]
        if pads:
            p.blob(f"pad.{s}", b.p(side * 0.19, 0, 1.425), (b.r(0.078), b.r(0.078), b.r(0.062)), c["top"], sb, paint=paint)
        else:
            p.blob(f"shoulder.{s}", b.p(side * 0.18, 0, 1.42), (b.r(0.062), b.r(0.062), b.r(0.055)), c["top"], sb, paint=paint)
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
        ], verts=10, paint=paint)
        if 0.3 < sleeve < 0.9:
            # A short sleeve's hem, a separate rim above the elbow.
            p.seg(f"sleeve_hem.{s}", lerp(sh, el, 0.7), lerp(sh, el, 0.8), b.r(0.06), b.r(0.058), c["top"], ua, verts=10, paint=paint)
        elif sleeve >= 0.9:
            p.seg(f"sleeve_cuff.{s}", lerp(el, wr, 0.8), lerp(el, wr, 0.9), b.r(0.05), b.r(0.049), c["top"], fa, verts=10, paint=paint)
        if cuff_rim:
            p.seg(f"cuff.{s}", lerp(el, wr, 0.88), lerp(el, wr, 1.0), b.r(0.044), b.r(0.042), cuff_rim, fa, verts=10, paint=paint)
        hand(p, b, s, c["skin"], c.get("hand", 1.0), paint=hand_paint)


def legs(p, b, c, shin=None, shoe_h=0.1, paint=None, shoe_paint=None, cuffs=True):
    """Legs, hip to ankle in one tube with weights graded across the knee;
    shoes are rigid on the foot and toe, with a sole and a toe cap, and the
    trousers end in a cuff. `shin` colours the lower leg differently (leg
    warmers, boots)."""
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
        ], verts=10, paint=paint)
        if cuffs and shin is None:
            p.seg(f"trouser_cuff.{s}", lerp(knee, ankle, 0.86), lerp(knee, ankle, 0.97), b.r(0.058), b.r(0.057), c["bottom"], sn, verts=10, paint=paint)
        x, k, g = ankle[0], b.k, b.g
        w = 0.047 * k * g
        h = shoe_h * k
        p.hull(f"shoe.{s}", [(x + dx, f * k, u) for dx in (-w, w) for f, u in ((-0.065, 0.02 * k), (-0.065, h), (0.0, h * 1.15), (0.13, 0.02 * k), (0.13, h * 0.72))],
               c["shoes"], ft, paint=shoe_paint)
        p.hull(f"toecap.{s}", [(x + dx, 0.128 * k, u) for dx in (-w * 0.96, w * 0.96) for u in (0.02 * k, h * 0.7)]
               + [(x + dx, 0.215 * k, u) for dx in (-w * 0.77, w * 0.77) for u in (0.02 * k, h * 0.42)], c.get("toecap", c["shoes"]), f"toe.{s}", paint=shoe_paint)
        sole = c.get("sole", tuple(max(0, v - 18) for v in c["shoes"]))
        ws = w * 1.08
        p.hull(f"sole.{s}", [(x + dx, f * k, u) for dx in (-ws, ws) for f in (-0.072, 0.13) for u in (0, 0.022 * k)], sole, ft, paint=shoe_paint)
        p.hull(f"sole_toe.{s}", [(x + dx, f * k, u) for dx in (-ws, ws) for f in (0.128,) for u in (0, 0.022 * k)]
               + [(x + dx, 0.222 * k, u) for dx in (-ws * 0.8, ws * 0.8) for u in (0, 0.02 * k)], sole, f"toe.{s}", paint=shoe_paint)
