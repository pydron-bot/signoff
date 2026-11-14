"""Set dressing that gets knocked about (docs/BLENDER-TODO.md, step 30): the
loose odds and ends on a stage's floor. The game moves them (src/render/
clutter.ts), so each is its own `clutter_<id>` object built round its middle
(origin at the centre of its box), in the `props` material, its size as
listed in src/render/clutterData.ts (side, up, fwd; the asset test checks
it). Rolling pieces lie with their axis along fwd: the game rolls them about
it. Low and chunky: they're seen from 6 m and more, a few per cent of the
screen's height.
"""
import math

import numpy as np

from . import paint as P

PAPER = (236, 232, 220)
INK = (40, 40, 52)
STEEL = (170, 174, 182)


def lit(t, lo=0.8):
    return P.light(t, lo=lo)


def clipboard(p, title="FORECAST"):
    """A masonite clipboard with the forecast on it: 0.3 × 0.03 × 0.4 m."""
    def page(t):
        c = P.put(t.c, P.lines(t.fwd, 0.035, 0.006) & (t.fwd > -0.1) & (np.abs(t.side) < 0.11), (120, 130, 170))
        c = P.put(c, P.text(t.side, -t.fwd, title, 0.035, 0.0, 0.12), INK)
        t.c = c
        return lit(t, lo=0.9)

    p.box("cb_board", (0, 0, -0.008), (0.3, 0.4, 0.014), (150, 104, 62), "set", mat=1, paint=lit)
    p.box("cb_page", (0, 0.01, 0.0015), (0.26, 0.34, 0.005), PAPER, "set", mat=1, paint=page)
    p.box("cb_clip", (0, -0.17, 0.008), (0.12, 0.05, 0.014), STEEL, "set", mat=1, paint=lit)


def mug(p, body, label, label_colour):
    """A coffee mug standing up, its handle to +side: 0.15 × 0.14 × 0.11 m (its box's middle at the origin)."""
    cx = -0.02

    def side(t):
        front = t.fwd > 0.02
        c = P.put(t.c, front & P.text(t.side - cx, t.up, label, 0.03, 0.0, 0.0), label_colour)
        t.c = c
        return lit(t)

    p.seg("mug_body", (cx, 0, -0.07), (cx, 0, 0.07), 0.052, 0.055, body, "set", verts=10, mat=1, paint=side)
    p.seg("mug_coffee", (cx, 0, 0.055), (cx, 0, 0.066), 0.047, 0.047, (70, 42, 24), "set", verts=10, mat=1)
    p.hull("mug_handle", [(cx + 0.045, f, u) for f in (-0.012, 0.012) for u in (-0.04, 0.045)] + [(cx + 0.095, f, u) for f in (-0.012, 0.012) for u in (-0.025, 0.03)],
           body, "set", mat=1, paint=lit)


def tape(p):
    """A roll of gaffer tape on its edge, its axis along fwd: 0.2 across, 0.07 thick."""
    p.seg("tape_roll", (0, -0.035, 0), (0, 0.035, 0), 0.1, 0.1, (34, 34, 40), "set", verts=12, mat=1, paint=lambda t: lit(t, lo=0.7))
    p.seg("tape_core", (0, -0.037, 0), (0, 0.037, 0), 0.055, 0.055, (176, 140, 96), "set", verts=12, mat=1, paint=lit)
    p.seg("tape_hole", (0, -0.039, 0), (0, 0.039, 0), 0.042, 0.042, (20, 18, 16), "set", verts=12, mat=1)


def dumbbell(p, colour=(236, 74, 160)):
    """A vinyl hand weight, its bar along fwd: hex ends 0.16 across, 0.34 long."""
    p.seg("db_bar", (0, -0.12, 0), (0, 0.12, 0), 0.024, 0.024, (150, 150, 158), "set", verts=8, mat=1, paint=lit)
    for s, name in ((-1, "db_end0"), (1, "db_end1")):
        p.seg(name, (0, s * 0.11, 0), (0, s * 0.17, 0), 0.08, 0.075, colour, "set", verts=6, mat=1, spin=math.pi / 6, paint=lit)


def bottle(p, colour=(120, 200, 230), cap=(240, 70, 120), label="BURN"):
    """A squeeze bottle lying down, its axis along fwd: 0.09 across, 0.26 long."""
    def body(t):
        band = np.abs(t.fwd + 0.02) < 0.04
        c = P.put(t.c, band, (250, 236, 90))
        c = P.put(c, band & (t.up > 0) & P.text(t.side, t.fwd + 0.02, label, 0.022, 0.0, 0.0), INK)
        t.c = c
        return lit(t, lo=0.85)

    p.seg("bt_body", (0, -0.13, 0), (0, 0.05, 0), 0.044, 0.044, colour, "set", verts=10, mat=1, paint=body)
    p.seg("bt_neck", (0, 0.05, 0), (0, 0.09, 0), 0.044, 0.02, colour, "set", verts=10, mat=1, paint=lit)
    p.seg("bt_cap", (0, 0.09, 0), (0, 0.13, 0), 0.022, 0.012, cap, "set", verts=8, mat=1, paint=lit)


def towel(p, colour=(80, 210, 220), stripe=(250, 120, 180)):
    """A gym towel folded and dropped: 0.5 × 0.04 × 0.32 m, a little rumpled."""
    def stripes(t):
        c = P.put(t.c, (np.abs(np.abs(t.side) - 0.17) < 0.025), stripe)
        t.c = c
        return lit(t, lo=0.85)

    rng = np.random.default_rng(31)
    pts = []
    for sx in (-0.25, -0.08, 0.08, 0.25):
        for sf in (-0.16, 0.16):
            pts.append((sx, sf, -0.02))
            pts.append((sx * 0.97, sf * 0.95, 0.008 + rng.uniform(0, 0.012)))
    p.hull("towel", pts, colour, "set", mat=1, paint=stripes)


def script(p):
    """A sheaf of script pages, stapled: 0.22 × 0.025 × 0.3 m."""
    def top(t):
        c = P.put(t.c, P.lines(t.fwd, 0.022, 0.005) & (t.fwd > -0.09) & (np.abs(t.side) < 0.085) & (t.up > 0.005), (90, 90, 110))
        c = P.put(c, (t.up > 0.005) & P.text(t.side, -t.fwd, "11 PM", 0.03, 0.0, 0.11), INK)
        c = P.put(c, (t.up > 0.005) & (np.abs(t.side + 0.08) < 0.012) & (np.abs(t.fwd + 0.13) < 0.004), STEEL)
        t.c = c
        return lit(t, lo=0.9)

    p.box("sc_stack", (0, 0, -0.003), (0.22, 0.3, 0.018), (226, 222, 210), "set", mat=1, paint=lambda t: lit(t, lo=0.85))
    p.box("sc_top", (0.006, 0.004, 0.008), (0.215, 0.295, 0.005), PAPER, "set", mat=1, paint=top)


def bin(p):
    """A grey metal wastebasket, paper balls on top: 0.3 × 0.36 × 0.3 m."""
    def side(t):
        c = P.shade(t.c, P.lines(np.arctan2(t.fwd, t.side), 0.35, 0.05), 0.85)
        t.c = c
        return lit(t, lo=0.75)

    p.seg("bin_body", (0, 0, -0.18), (0, 0, 0.16), 0.12, 0.148, (110, 116, 124), "set", verts=10, mat=1, paint=side)
    p.seg("bin_rim", (0, 0, 0.16), (0, 0, 0.175), 0.152, 0.152, (150, 156, 164), "set", verts=10, mat=1, paint=lit)
    for k, (s, f, u) in enumerate(((0.04, 0.03, 0.17), (-0.05, -0.02, 0.165), (0.0, -0.06, 0.15))):
        p.blob(f"bin_paper{k}", (s, f, u), (0.045, 0.045, 0.035), PAPER, "set", 1, mat=1, paint=lambda t: lit(t, lo=0.85))


def tomato(p):
    """A ripe red tomato: 0.16 across, 0.15 high with its green calyx.

    Was an onion (0.13, brown): from the game camera it was a few brown
    pixels on the checked floor. Red reads against black and white.
    """
    def skin(t):
        a = np.arctan2(t.fwd, t.side)
        # Faint lobes round the middle, and a paler shoulder on top.
        c = P.shade(t.c, P.lines(a, 0.9, 0.12), 0.88)
        c = P.put(c, t.up > 0.05, (236, 92, 70))
        t.c = c
        return lit(t, lo=0.78)

    p.blob("tomato", (0, 0, -0.007), (0.08, 0.08, 0.066), (214, 38, 28), "set", 1, mat=1, paint=skin)
    green = (58, 130, 46)
    for k in range(5):
        a = 2 * math.pi * k / 5 + 0.3
        p.seg(f"tomato_leaf{k}", (0, 0, 0.058), (0.042 * math.cos(a), 0.042 * math.sin(a), 0.054),
              0.012, 0.003, green, "set", verts=4, mat=1)
    p.seg("tomato_stem", (0, 0, 0.056), (0.004, 0.0, 0.074), 0.006, 0.004, (70, 110, 50), "set", verts=5, mat=1)


def lid(p):
    """A steel pot lid with a black knob: 0.32 across, 0.05 high."""
    pts = [(0.16 * math.cos(2 * math.pi * k / 16), 0.16 * math.sin(2 * math.pi * k / 16), -0.025) for k in range(16)]
    pts += [(0.1 * math.cos(2 * math.pi * k / 12), 0.1 * math.sin(2 * math.pi * k / 12), 0.005) for k in range(12)]
    p.hull("lid", pts, STEEL, "set", mat=1, paint=lambda t: lit(t, lo=0.7))
    p.box("lid_knob", (0, 0, 0.015), (0.06, 0.03, 0.02), (30, 30, 34), "set", mat=1, paint=lit)


def spoon(p):
    """A wooden spoon: 0.36 long along side, its bowl at +side."""
    def wood(t):
        c = P.shade(t.c, P.grain(t.fwd + t.up, t.side, period=0.012), 0.88)
        t.c = c
        return lit(t, lo=0.85)

    p.seg("spoon_handle", (-0.18, 0, 0), (0.07, 0, 0), 0.011, 0.014, (196, 150, 96), "set", verts=6, mat=1, paint=wood)
    p.blob("spoon_bowl", (0.12, 0, 0), (0.06, 0.035, 0.013), (196, 150, 96), "set", 1, mat=1, paint=wood)
