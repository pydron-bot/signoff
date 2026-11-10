"""The living room at 3:33 a.m. (docs/BLENDER-TODO.md, step 24 C): where the
title's viewer sits. The game draws the attract mode on `screen` and pushes
in through it on START.

Stage space as the fights (side, fwd toward the viewer, up), the origin on
the floor under the TV's front. The room is closed (for the bakes):

- `set`: the room, the TV in its wood cabinet on a stand with the VCR under
  it (its clock at 3:33), the coffee table, the rug, the sofa's arm in the
  foreground, the standard lamp (off), the window with its blinds and the
  street outside; one 1024² atlas
- `screen`: the CRT's glass, a curved quad with UVs 0–1 across it (u to the
  right, v up as seen from the sofa), in the material `screen`
- `camera_start` (on the sofa, 2.5 m from the set) and `camera_end` (just
  short of the glass, the screen filling a 30° view): empties whose −Z looks
  at the screen's middle
- the light: the streetlight through the blinds, baked into
  `room-light.png` (step 23 B); the game lights the rest from the screen
"""
import math

import numpy as np

from lib import paint as P
from lib.bake import spot

ID = "room"
AUDIENCE = False
SCREEN = True
ATLAS = {0: 1024, 1: 512}
# Everything static is on the `set` material (the game puts the light map on
# every material of `set`, and props have their own UV layout); the light map
# at 1024², or the blinds' bars alias.
DENSE = ("guide", "vcr_clock")

WALLPAPER = (156, 132, 100)
CARPET = (112, 84, 62)
RUG = (128, 52, 40)
WOOD = (104, 66, 40)
WOOD_DARK = (64, 40, 26)
CABINET = (92, 58, 34)
BEZEL = (40, 38, 36)
GLASS = (24, 30, 28)
SOFA = (86, 98, 70)
CEILING = (150, 140, 124)
CREAM = (214, 200, 168)
BRASS = (170, 140, 80)
BLIND = (200, 190, 168)
NIGHT = (14, 18, 34)
ORANGE = (255, 150, 60)
GREEN = (90, 255, 140)
ASH = (150, 150, 146)
PAPER = (226, 220, 200)

# Walls: back (behind the TV), sides, and the front behind the sofa.
BACK, FRONT, SIDE, HIGH = -1.0, 3.6, 2.6, 2.5
WIN_X0, WIN_X1, WIN_U0, WIN_U1 = 1.05, 2.15, 0.95, 2.05

# The TV: cabinet on a stand, screen 0.6 × 0.45 (4:3), left of the controls.
STAND_U = 0.42
CAB = (0.0, -0.62, STAND_U + 0.37)  # centre
CAB_SIZE = (0.96, 0.56, 0.74)
SCREEN_C = (-0.12, CAB[1] + CAB_SIZE[1] / 2, CAB[2] + 0.02)  # the glass's middle, flat
SCREEN_W, SCREEN_H, BULGE = 0.6, 0.45, 0.025

EMPTIES = [
    ("camera_start", (0.05, 2.3, 1.05), (SCREEN_C[0], SCREEN_C[1] + BULGE, SCREEN_C[2] - 0.15)),
    # At 30° (vertical) the 0.45 m screen fills the height from 0.84 m.
    ("camera_end", (SCREEN_C[0], SCREEN_C[1] + BULGE + 0.84, SCREEN_C[2]), (SCREEN_C[0], SCREEN_C[1] + BULGE, SCREEN_C[2])),
]
# The vertical field of view each camera empty is framed for, in its glTF
# extras as `fov` (degrees): wide enough on the sofa to take in the room.
FOV = {"camera_start": 50, "camera_end": 30}

LIGHTS = [
    {"segment": "3:33 a.m.", "background": "#000000",
     "ambient": {"color": "#202838", "intensity": 0.3},
     "key": {"color": "#a8b8ff", "intensity": 0.8, "position": [0, 1, -3]},
     "rim": {"color": "#ff9a50", "intensity": 0.4, "position": [2, 2, -4]}},
]

# What gives off light: the street outside, the streetlight's lamp, the VCR's clock.
EMISSION = {
    "outside": lambda t: np.where(np.hypot(t.side - 2.0, t.up - 2.3) < 0.07, 3.0, 0.8),
    "vcr_clock": 1.5,
}

# The streetlight through the blinds onto the floor, the rug and the table.
# It sits in the window's reveal, in front of the painted street (which
# would shadow a lamp further out), small, so the slats cast sharp bars.
LIGHTMAPS = {
    1: ((), [spot((1.6, -1.55, 2.0), (0.2, 1.6, 0.0), ORANGE, 300, angle=70, blend=0.3, radius=0.03)]),
}


def lit(t, **k):
    return P.light(t, **k)


def wallpaper(t):
    """1987 wallpaper: narrow stripes and a dado line, a skirting at the foot."""
    u = t.side + t.fwd
    c = P.shade(t.c, P.lines(u, 0.16, 0.035), 0.82)
    c = P.put(c, np.abs(t.up - 0.95) < 0.02, WOOD_DARK)
    c = P.put(c, t.up < 0.1, WOOD_DARK)
    t.c = c
    return lit(t)


def carpet(t):
    t.c = t.c * (0.92 + 0.12 * t.rng.random(len(t.c)))[:, None]
    return lit(t)


def rug(t):
    """A rug with a border and a diamond in the middle."""
    x, f = t.side, t.fwd - 1.2
    c = P.put(t.c, (np.abs(x) > 0.95) | (np.abs(f) > 0.6), (190, 150, 90))
    c = P.put(c, (np.abs(x) / 0.7 + np.abs(f) / 0.4) < 1, (60, 40, 70))
    t.c = c * (0.94 + 0.08 * t.rng.random(len(c)))[:, None]
    return lit(t)


def wood(t):
    t.c = P.put(t.c, P.grain(t.side + t.fwd, t.up, 0.04, 0.01, 3.0), np.array(t.c[0]) * 0.8)
    return lit(t)


def cabinet(t):
    """The TV's wood cabinet: grain, and on its front the controls panel
    (a speaker grille and the channel dial) right of the screen."""
    t.c = P.put(t.c, P.grain(t.side + t.fwd, t.up, 0.03, 0.008, 4.0), np.array(t.c[0]) * 0.8)
    front = t.n[:, 1] > 0.5
    grille = front & (t.side > 0.24) & (t.side < 0.42) & (t.up > CAB[2] - 0.32) & (t.up < CAB[2] - 0.02)
    t.c = P.put(t.c, grille & P.lines(t.up, 0.02, 0.008), (30, 24, 20))
    return lit(t)


def outside(t):
    """The street at night: a dark sky, the streetlight's glow and its lamp,
    the post, a roofline."""
    x, u = t.side, t.up
    c = np.empty_like(t.c)
    c[:] = NIGHT
    glow = np.clip(1 - np.hypot(x - 2.0, u - 2.3) / 0.6, 0, 1)
    c = P.put(c, glow, ORANGE, 0.6)
    c = P.put(c, np.hypot(x - 2.0, u - 2.3) < 0.07, (255, 220, 160))
    c = P.put(c, (np.abs(x - 2.06) < 0.02) & (u < 2.28), (8, 8, 10))
    c = P.put(c, u < 1.25 + 0.15 * (x > 1.5), (6, 6, 10))
    return c


def guide(t):
    """TV Guide, open at Channel 0: two pages of listings, the left one
    headed CH 0, a ring round 3:30."""
    x, f = t.side - 0.32, t.fwd - 1.12
    c = P.put(t.c, P.lines(f, 0.018, 0.005) & (np.abs(x) > 0.012), (120, 116, 108))
    c = P.put(c, P.text(x + 0.11, -f, "CH 0", 0.03, 0.0, -0.12), (160, 30, 30))
    ring = np.abs(np.hypot((x + 0.1) / 1.6, f - 0.02) - 0.022) < 0.003
    return P.put(c, ring, (200, 40, 40))


def vcr_clock(t):
    c = np.empty_like(t.c)
    c[:] = (6, 10, 8)
    return P.put(c, P.text(t.side - 0.12, t.up, "3:33", 0.05, 0.0, STAND_U - 0.12), GREEN)


def quad(p, name, pts, colour, facing, paint, mat=0):
    p.poly(name, pts, colour, "set", facing, mat=mat, paint=paint)


def room(p):
    quad(p, "floor", [(-SIDE, BACK, 0), (SIDE, BACK, 0), (SIDE, FRONT, 0), (-SIDE, FRONT, 0)], CARPET, (0, 0, 1), carpet)
    quad(p, "ceiling", [(-SIDE, BACK, HIGH), (-SIDE, FRONT, HIGH), (SIDE, FRONT, HIGH), (SIDE, BACK, HIGH)], CEILING, (0, 0, -1), lit)
    # The back wall round the window.
    for name, (x0, x1, u0, u1) in (("back_l", (-SIDE, WIN_X0, 0, HIGH)), ("back_r", (WIN_X1, SIDE, 0, HIGH)),
                                   ("back_low", (WIN_X0, WIN_X1, 0, WIN_U0)), ("back_high", (WIN_X0, WIN_X1, WIN_U1, HIGH))):
        quad(p, name, [(x0, BACK, u0), (x1, BACK, u0), (x1, BACK, u1), (x0, BACK, u1)], WALLPAPER, (0, 1, 0), wallpaper)
    for s in (-1, 1):
        quad(p, f"side{s}", [(s * SIDE, BACK, 0), (s * SIDE, FRONT, 0), (s * SIDE, FRONT, HIGH), (s * SIDE, BACK, HIGH)][::s], WALLPAPER, (-s, 0, 0), wallpaper)
    quad(p, "front", [(SIDE, FRONT, 0), (-SIDE, FRONT, 0), (-SIDE, FRONT, HIGH), (SIDE, FRONT, HIGH)], WALLPAPER, (0, -1, 0), wallpaper)
    # The window: its reveal, a sill, the blinds (slats with gaps the
    # streetlight comes through), the street beyond.
    for name, c, size in (("win_top", ((WIN_X0 + WIN_X1) / 2, BACK - 0.06, WIN_U1 + 0.03), (WIN_X1 - WIN_X0 + 0.12, 0.12, 0.06)),
                          ("win_l", (WIN_X0 - 0.03, BACK - 0.06, (WIN_U0 + WIN_U1) / 2), (0.06, 0.12, WIN_U1 - WIN_U0)),
                          ("win_r", (WIN_X1 + 0.03, BACK - 0.06, (WIN_U0 + WIN_U1) / 2), (0.06, 0.12, WIN_U1 - WIN_U0)),
                          ("sill", ((WIN_X0 + WIN_X1) / 2, BACK + 0.05, WIN_U0 - 0.02), (WIN_X1 - WIN_X0 + 0.2, 0.16, 0.04))):
        p.box(name, c, size, CREAM, "set", paint=lit)
    k = 0
    u = WIN_U1 - 0.06
    while u > WIN_U0 + 0.02:
        p.box(f"slat{k}", ((WIN_X0 + WIN_X1) / 2, BACK + 0.04, u), (WIN_X1 - WIN_X0 - 0.02, 0.05, 0.006), BLIND, "set", paint=lit)
        u -= 0.075
        k += 1
    quad(p, "outside", [(WIN_X0 - 0.4, BACK - 0.7, 0.6), (WIN_X1 + 0.4, BACK - 0.7, 0.6), (WIN_X1 + 0.4, BACK - 0.7, 2.6), (WIN_X0 - 0.4, BACK - 0.7, 2.6)],
         NIGHT, (0, 1, 0), outside)
    for name, c, size in (("reveal_l", (WIN_X0 - 0.2, BACK - 0.355, 1.5), (0.4, 0.69, 2.6)),
                          ("reveal_r", (WIN_X1 + 0.2, BACK - 0.355, 1.5), (0.4, 0.69, 2.6)),
                          ("reveal_low", ((WIN_X0 + WIN_X1) / 2, BACK - 0.355, WIN_U0 / 2), (WIN_X1 - WIN_X0, 0.69, WIN_U0)),
                          ("reveal_high", ((WIN_X0 + WIN_X1) / 2, BACK - 0.355, (WIN_U1 + 2.6) / 2), (WIN_X1 - WIN_X0, 0.69, 2.6 - WIN_U1))):
        # 1 cm behind the wall's face, so the two don't fight.
        p.box(name, c, size, (40, 36, 34), "set", paint=lit)
    # The rug and the coffee table, the ashtray and TV Guide on it.
    p.poly("rug", [(-1.1, 0.5, 0.004), (1.1, 0.5, 0.004), (1.1, 1.9, 0.004), (-1.1, 1.9, 0.004)], RUG, "set", (0, 0, 1), paint=rug)
    p.box("table_top", (0.1, 1.2, 0.42), (1.1, 0.6, 0.04), WOOD, "set", paint=wood)
    for sx in (-1, 1):
        for sf in (-1, 1):
            p.box(f"table_leg{sx}{sf}", (0.1 + sx * 0.5, 1.2 + sf * 0.25, 0.2), (0.05, 0.05, 0.4), WOOD_DARK, "set", paint=wood)
    p.seg("ashtray", (-0.2, 1.3, 0.44), (-0.2, 1.3, 0.465), 0.075, 0.07, (70, 80, 84), "set", verts=10, paint=lit)
    for k, (dx, df, a) in enumerate(((0.02, 0.01, 0.4), (-0.03, -0.02, 2.2))):
        x0, f0 = -0.2 + dx, 1.3 + df
        p.seg(f"butt{k}", (x0, f0, 0.47), (x0 + 0.05 * math.cos(a), f0 + 0.05 * math.sin(a), 0.475), 0.006, 0.006, ASH, "set", verts=4)
    for k, dx in enumerate((-0.11, 0.11)):
        p.box(f"guide{k}", (0.32 + dx, 1.12, 0.443), (0.21, 0.28, 0.006), PAPER, "set", paint=guide)
    # The sofa's arm in the foreground (right), and the seat it ends.
    p.box("sofa_arm", (0.52, 2.2, 0.3), (0.26, 1.1, 0.6), SOFA, "set", paint=lit)
    p.seg("sofa_roll", (0.52, 1.65, 0.6), (0.52, 2.75, 0.6), 0.15, 0.15, SOFA, "set", verts=10, paint=lit)
    p.box("sofa_seat", (-0.6, 2.2, 0.22), (1.98, 0.9, 0.44), SOFA, "set", paint=lit)
    p.box("sofa_back", (-0.6, 2.8, 0.55), (2.24, 0.3, 1.1), SOFA, "set", paint=lit)
    # The standard lamp, off, in the corner by the TV.
    p.seg("lamp_base", (-1.9, -0.55, 0.0), (-1.9, -0.55, 0.03), 0.16, 0.15, BRASS, "set", verts=10, paint=lit)
    p.seg("lamp_pole", (-1.9, -0.55, 0.03), (-1.9, -0.55, 1.45), 0.012, 0.012, BRASS, "set", verts=5, paint=lit)
    p.seg("lamp_shade", (-1.9, -0.55, 1.4), (-1.9, -0.55, 1.72), 0.27, 0.17, CREAM, "set", verts=12, paint=lit)
    # The TV stand: a top, sides, a shelf with the VCR on it.
    p.box("stand_top", (0, -0.62, STAND_U - 0.02), (1.02, 0.5, 0.04), WOOD_DARK, "set", paint=wood)
    for s in (-1, 1):
        p.box(f"stand_side{s}", (s * 0.49, -0.62, (STAND_U - 0.04) / 2), (0.04, 0.5, STAND_U - 0.04), WOOD_DARK, "set", paint=wood)
    p.box("stand_shelf", (0, -0.62, 0.05), (0.94, 0.48, 0.03), WOOD_DARK, "set", paint=wood)
    p.box("vcr", (0, -0.6, STAND_U - 0.115), (0.44, 0.32, 0.09), (36, 36, 40), "set", paint=lit)
    p.box("vcr_clock", (0.12, -0.6 + 0.161, STAND_U - 0.095), (0.24, 0.004, 0.07), (6, 10, 8), "set", paint=vcr_clock)
    # The TV: a wood cabinet, the bezel round the glass, the dial and rabbit ears.
    p.box("cabinet", CAB, CAB_SIZE, CABINET, "set", paint=cabinet)
    fr = CAB[1] + CAB_SIZE[1] / 2
    p.box("bezel", (SCREEN_C[0], fr + 0.005, SCREEN_C[2]), (SCREEN_W + 0.08, 0.01, SCREEN_H + 0.08), BEZEL, "set", paint=lit)
    for k, u in enumerate((CAB[2] + 0.2, CAB[2] + 0.08)):
        p.seg(f"knob{k}", (0.33, fr, u), (0.33, fr + 0.03, u), 0.035, 0.03, (30, 28, 26), "set", verts=8, paint=lit)
    for s in (-1, 1):
        p.seg(f"ear{s}", (0.15, CAB[1], CAB[2] + CAB_SIZE[2] / 2), (0.15 + s * 0.32, CAB[1] - 0.05, CAB[2] + CAB_SIZE[2] / 2 + 0.5), 0.004, 0.003, (180, 180, 186), "set", verts=4)
    p.blob("ear_base", (0.15, CAB[1], CAB[2] + CAB_SIZE[2] / 2 + 0.02), (0.05, 0.05, 0.025), (30, 28, 26), "set", 0)


def glass(p):
    """The CRT's face: a grid bulging toward the viewer, 0.6 × 0.45."""
    nx, nu = 8, 6
    x0, u0, f = SCREEN_C[0] - SCREEN_W / 2, SCREEN_C[2] - SCREEN_H / 2, SCREEN_C[1] + 0.012

    def pt(i, j):
        a, b = i / nx * 2 - 1, j / nu * 2 - 1
        return (x0 + SCREEN_W * i / nx, f + BULGE * (1 - a * a) * (1 - b * b), u0 + SCREEN_H * j / nu)

    for i in range(nx):
        for j in range(nu):
            p.poly(f"glass{i}_{j}", [pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1)], GLASS, "set", (0, 1, 0), mat=2)


def finish(objs):
    """The screen's UVs: 0–1 across the glass, u to the right, v up, as the
    sofa sees it."""
    o = next(o for o in objs if o.name == "screen")
    me = o.data
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    vi = np.empty(len(me.loops), dtype=np.int64)
    me.loops.foreach_get("vertex_index", vi)
    # Blender: x is side, z is up (the object sits at the origin).
    u = (co[vi, 0] - (SCREEN_C[0] - SCREEN_W / 2)) / SCREEN_W
    v = (co[vi, 2] - (SCREEN_C[2] - SCREEN_H / 2)) / SCREEN_H
    me.uv_layers["UV"].data.foreach_set("uv", np.stack([u, v], axis=1).ravel())


def build(make):
    make("set", room)
    make("screen", glass)
