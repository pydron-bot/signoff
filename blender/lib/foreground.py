"""Foreground silhouettes (docs/BLENDER-TODO.md, step 24 A): studio kit
between the camera and the fight, at the edges of the frame. The game draws
them near-black against the lit set, so they're shape, not surface: plain
dark colours in the `props` material, under 400 triangles each.

Each builder adds an object's parts around its own origin in stage space
(side, fwd, up); the stage places it with make(..., at=...). `d` is the side
the fight is on (+1: the object stands on the left, the fight to its right).

    fg_left / fg_right: origin on the floor under the middle, 1.6–2.2 m tall,
        nothing more than 1.5 m toward the middle (they stand at x = ∓6.2 and
        must stay clear of x = −4.5 to 4.5).
    fg_top: origin at its top (y = 5 when placed), hanging down to 4.2.
"""
import math

DARK = (34, 34, 38)
METAL = (70, 72, 78)
RUBBER = (24, 24, 26)
TALLY = (230, 30, 30)

_kw = dict(mat=1)


def camera(p, name, d):
    """A studio camera on its pedestal, looking at the set (back and in), its
    tally light on top: 1.75 m tall."""
    for k in range(3):
        a = 2 * math.pi * k / 3 + 0.4
        foot = (0.42 * math.cos(a), 0.42 * math.sin(a), 0.06)
        p.seg(f"{name}_leg{k}", (0, 0, 0.12), foot, 0.04, 0.03, METAL, "set", verts=4, **_kw)
        p.blob(f"{name}_wheel{k}", foot, (0.06, 0.06, 0.06), RUBBER, "set", 0, **_kw)
    p.seg(f"{name}_column", (0, 0, 0.1), (0, 0, 1.25), 0.09, 0.07, METAL, "set", verts=6, **_kw)
    p.seg(f"{name}_ring", (0, 0, 0.95), (0, 0, 0.99), 0.3, 0.3, DARK, "set", verts=8, **_kw)
    # The head looks back at the set and a little in toward the middle.
    look = (0.35 * d, -1.0)
    n = math.hypot(*look)
    lx, lf = look[0] / n, look[1] / n
    p.box(f"{name}_head", (0, 0, 1.45), (0.4, 0.62, 0.38), DARK, "set", **_kw)
    p.seg(f"{name}_lens", (lx * 0.3, lf * 0.3, 1.45), (lx * 0.62, lf * 0.62, 1.45), 0.12, 0.13, RUBBER, "set", verts=8, **_kw)
    p.box(f"{name}_finder", (-lx * 0.05, -lf * 0.05, 1.71), (0.22, 0.3, 0.15), DARK, "set", **_kw)
    for s in (-1, 1):
        p.seg(f"{name}_handle{s}", (s * 0.18, -lf * 0.25, 1.3), (s * 0.3, -lf * 0.75, 1.12), 0.02, 0.02, METAL, "set", verts=4, **_kw)
    p.blob(f"{name}_tally", (0, 0, 1.79), (0.03, 0.03, 0.02), TALLY, "set", 0, **_kw)


def boom(p, name, d):
    """A boom mic on its stand: a tripod, a pole, the arm angled up and in
    toward the fight (stopping 1.4 m in), the mic in its shock mount: 2.1 m."""
    for k in range(3):
        a = 2 * math.pi * k / 3 + 0.2
        p.seg(f"{name}_leg{k}", (0, 0, 0.7), (0.5 * math.cos(a), 0.5 * math.sin(a), 0.0), 0.02, 0.02, METAL, "set", verts=4, **_kw)
    p.seg(f"{name}_pole", (0, 0, 0.0), (0, 0, 1.55), 0.025, 0.02, METAL, "set", verts=5, **_kw)
    tail, tip = (-0.45 * d, 0.1, 1.45), (1.35 * d, -0.4, 2.05)
    p.seg(f"{name}_arm", tail, tip, 0.025, 0.015, DARK, "set", verts=5, **_kw)
    p.blob(f"{name}_weight", tail, (0.09, 0.09, 0.09), DARK, "set", 0, **_kw)
    p.seg(f"{name}_mic", (tip[0], tip[1], tip[2] - 0.05), (tip[0] + 0.1 * d, tip[1] - 0.25, tip[2] - 0.15), 0.05, 0.04, RUBBER, "set", verts=6, **_kw)
    p.seg(f"{name}_cable", (0, 0, 1.5), (0.2 * d, 0.15, 0.0), 0.008, 0.008, RUBBER, "set", verts=3, **_kw)


def speakers(p, name, d):
    """A PA speaker stack: a bass bin, a cabinet on it, a horn on top: 1.8 m."""
    p.box(f"{name}_bin", (0, 0, 0.45), (0.75, 0.6, 0.9), DARK, "set", **_kw)
    p.box(f"{name}_cab", (0.02 * d, 0, 1.25), (0.62, 0.52, 0.7), DARK, "set", **_kw)
    p.box(f"{name}_horn", (0.04 * d, -0.02, 1.7), (0.5, 0.44, 0.2), DARK, "set", **_kw)
    for k, u in enumerate((0.45, 1.28)):
        p.seg(f"{name}_cone{k}", (0, -0.3, u), (0, -0.32, u), 0.24 if k == 0 else 0.17, 0.2 if k == 0 else 0.14, RUBBER, "set", verts=8, **_kw)


def mic_stand(p, name, d):
    """A vocal mic on a straight stand with a short boom toward the fight: 1.65 m."""
    p.seg(f"{name}_base", (0, 0, 0.0), (0, 0, 0.03), 0.16, 0.16, METAL, "set", verts=8, **_kw)
    p.seg(f"{name}_pole", (0, 0, 0.03), (0, 0, 1.45), 0.015, 0.012, METAL, "set", verts=5, **_kw)
    p.seg(f"{name}_arm", (-0.1 * d, 0, 1.43), (0.45 * d, -0.1, 1.62), 0.012, 0.01, METAL, "set", verts=4, **_kw)
    p.seg(f"{name}_mic", (0.45 * d, -0.1, 1.62), (0.55 * d, -0.14, 1.66), 0.025, 0.035, RUBBER, "set", verts=6, **_kw)
    p.seg(f"{name}_cable", (0.45 * d, -0.1, 1.6), (0.1 * d, 0.2, 0.0), 0.006, 0.006, RUBBER, "set", verts=3, **_kw)


def cue_cards(p, name, d):
    """A cue-card stand: an easel with a stack of big cards on it: 1.85 m."""
    for s in (-1, 1):
        p.seg(f"{name}_leg{s}", (s * 0.32, 0.1, 0.0), (s * 0.18, -0.05, 1.85), 0.02, 0.018, METAL, "set", verts=4, **_kw)
    p.seg(f"{name}_back", (0, 0.45, 0.0), (0, -0.02, 1.6), 0.02, 0.018, METAL, "set", verts=4, **_kw)
    p.box(f"{name}_ledge", (0, -0.08, 0.95), (0.7, 0.08, 0.04), METAL, "set", **_kw)
    # The cards lean back on the easel, facing the fight (away from us).
    for k in range(3):
        p.box(f"{name}_card{k}", (0, -0.1 - 0.012 * k, 1.38 + 0.01 * k), (0.76, 0.01, 0.84), (60 + 12 * k, 58 + 12 * k, 54 + 12 * k), "set", **_kw)


def lamp(p, name):
    """A Fresnel hanging from the grid on its yoke: from the origin (on the
    pipe) down 0.8 m, the barn doors open."""
    p.seg(f"{name}_pipe", (-0.5, 0, 0.0), (0.5, 0, 0.0), 0.025, 0.025, METAL, "set", verts=5, **_kw)
    p.box(f"{name}_clamp", (0, 0, -0.06), (0.06, 0.06, 0.12), DARK, "set", **_kw)
    for s in (-1, 1):
        p.seg(f"{name}_yoke{s}", (s * 0.17, 0, -0.12), (s * 0.17, 0, -0.45), 0.015, 0.015, DARK, "set", verts=4, **_kw)
    p.seg(f"{name}_yoke_top", (-0.17, 0, -0.12), (0.17, 0, -0.12), 0.015, 0.015, DARK, "set", verts=4, **_kw)
    # The body tips down toward the fight (back, −fwd).
    a, b = (0, 0.12, -0.38), (0, -0.2, -0.55)
    p.seg(f"{name}_body", a, b, 0.13, 0.14, DARK, "set", verts=8, **_kw)
    for k, (dx, du) in enumerate(((0.19, 0), (-0.19, 0), (0, 0.19), (0, -0.19))):
        p.box(f"{name}_door{k}", (dx, -0.26, -0.55 + du - 0.04 * (du < 0)), (0.02 if dx else 0.3, 0.14, 0.3 if dx else 0.02), RUBBER, "set", **_kw)


def boom_tip(p, name, d):
    """The end of a boom pole reaching in over the fight from off frame: the
    pole from the origin, sloping down, the mic in its shock mount."""
    tip = (1.6 * d, -0.1, -0.6)
    p.seg(f"{name}_pole", (0, 0, 0.0), tip, 0.025, 0.02, DARK, "set", verts=5, **_kw)
    p.seg(f"{name}_mount", tip, (tip[0], tip[1], tip[2] - 0.12), 0.06, 0.06, METAL, "set", verts=6, **_kw)
    p.seg(f"{name}_mic", (tip[0] - 0.05 * d, tip[1] + 0.1, tip[2] - 0.17), (tip[0] + 0.1 * d, tip[1] - 0.3, tip[2] - 0.2), 0.04, 0.035, RUBBER, "set", verts=6, **_kw)
    p.seg(f"{name}_fur", (tip[0] + 0.1 * d, tip[1] - 0.3, tip[2] - 0.2), (tip[0] + 0.14 * d, tip[1] - 0.42, tip[2] - 0.21), 0.05, 0.03, (70, 66, 60), "set", verts=6, **_kw)


def hood_edge(p, name):
    """The near edge of a second extractor hood, over the camera: a steel
    skirt 0.8 m deep under the collar where its flue would go up."""
    pts = [(x, f, u) for x, f, u in ((-1.0, -0.6, -0.8), (1.0, -0.6, -0.8), (-1.0, 0.6, -0.8), (1.0, 0.6, -0.8),
                                       (-0.4, -0.3, -0.1), (0.4, -0.3, -0.1), (-0.4, 0.3, -0.1), (0.4, 0.3, -0.1))]
    p.hull(f"{name}_skirt", pts, METAL, "set", **_kw)
    p.box(f"{name}_collar", (0, 0, -0.05), (0.5, 0.4, 0.1), METAL, "set", **_kw)
