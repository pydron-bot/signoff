"""The Eleven O'Clock News: Margaret's show, a 1987 local news studio, in
three segments (docs/DESIGN.md): Headlines, The Ticker (the anchor desk
rides up on its riser in the middle of the floor) and Lights Out (the rig
fails lamp by lamp). Built by lib/stage.py; positions are (x, fwd, up) in
stage space, as for Weather. The fighters fight on fwd = 0; the back wall
stands at fwd = −4.12, the arena runs to x = ±6.

Objects (the game shows them by segment and places the props and effects):
- `set`: the floor, the back wall, the lighting grid, the studio cameras on their pedestals at x = ±5.6, dark flats at the sides
- `seg_headlines`: the globe, the CH 0 NEWS header, the station clock and
  the lamps hanging from the grid (segments 1 and 2)
- `seg_ticker`: over that, the red band and the BREAKING panel, and the
  riser's plate in the floor (segment 2)
- `seg_lightsout`: the dead backdrop in front of the wall (fwd = −4.05),
  cables hanging from the grid where lamps were, two fallen lamps (segment 3)
- `prop_desk`: the anchor desk, 1.2 × 0.8 × 0.7 m, curved front with the
  station logo; origin at its bottom centre, at x = 0, fwd = −0.4
- `fx_lamp`, `fx_wreck`, `fx_mark`: the falling fresnel (its lens at the
  origin), the smashed lamp, the yellow tape cross; placed by the game
"""
import math

import numpy as np

from lib import clutter as C
from lib import foreground as fg
from lib import paint as P
from lib.bake import area, spot

ID = "news"
DENSE = ("header", "clock", "breaking", "desk")

FLOOR = (44, 50, 62)
WALL = (20, 34, 70)
GRID = (52, 52, 58)
LAMP = (28, 28, 32)
LENS = (255, 240, 190)
CAMERA = (64, 64, 70)
PEDESTAL = (40, 40, 44)
FLAT = (16, 20, 34)
GLOBE = (40, 96, 190)
LAND = (110, 170, 230)
HEADER = (16, 24, 52)
GOLD = (236, 196, 92)
WHITE = (240, 240, 236)
RED = (200, 30, 36)
STEEL = (120, 124, 132)
HAZARD = (236, 196, 40)
DEAD = (24, 24, 28)
CABLE = (18, 18, 20)
WOOD = (94, 62, 38)
TAPE = (246, 212, 40)
GLASS = (200, 214, 230)

WALL_F = -4.12
# The wall graphics: the globe (centre height, radius), the header board's
# middle, the clock, and the ticker's red band.
GLOBE_U, GLOBE_R = 2.75, 1.75
HEADER_U = 5.0
CLOCK_U = 3.3
BAND_U = 1.0
LAMP_X = (-5, -3, -1, 1, 3, 5)
GRID_U = 6.8

# Segment 1's pieces: in place for the set's AO bake (lib/bake.py).
FIRST = ("seg_headlines",)

LIGHTS = [
    {"segment": "Headlines", "background": "#06101e",
     "ambient": {"color": "#dfe8ff", "intensity": 1.3},
     "key": {"color": "#ffffff", "intensity": 2.2, "position": [0, 6, 8]},
     "rim": {"color": "#4a7aff", "intensity": 0.8, "position": [3, 4, -4]}},
    {"segment": "The Ticker", "background": "#081428",
     "ambient": {"color": "#d8e4ff", "intensity": 1.2},
     "key": {"color": "#fff4e0", "intensity": 2.2, "position": [-3, 6, 7]},
     "rim": {"color": "#ff3a3a", "intensity": 0.9, "position": [-3, 4, -4]}},
    {"segment": "Lights Out", "background": "#020308",
     "ambient": {"color": "#8090b0", "intensity": 0.8},
     "key": {"color": "#fff0d0", "intensity": 2.0, "position": [0, 8, 6]},
     "rim": {"color": "#3050a0", "intensity": 0.5, "position": [0, 3, -6]}},
]

# What gives off light (step 23 C): part name → strength, or a rule.
EMISSION = {
    "fg_cam_tally": 2,
    "globe": lambda t: np.where(np.hypot(t.side, t.up - GLOBE_U) < GLOBE_R, 1.5, 0.0),
    "header": 2,
    "clock": 1.0,  # a white face: any more and it blooms into a ball
    r"lamp\d_lens|fresnel_lens": 3,
    "breaking": 2,
    r"tally-?\d+": 2,
}

# The baked light (step 23 B): segment 1's grid Fresnels, a pool on the floor
# under each and a wash on the back wall, and the globe's blue on the floor.
# The Ticker and Lights Out use it too: the game dims it as the lamps fall.
LIGHTMAPS = {
    1: (("seg_headlines",), [
        *[spot((x, 0.0 if k % 2 else -1.0, 6.0), (x, (0.0 if k % 2 else -1.0) + 0.8, 0), (255, 230, 190), 2000, angle=40, blend=0.5)
          for k, x in enumerate(LAMP_X)],
        area((0, -2.6, 7.6), (12.0, 0.5), (230, 225, 255), 300, aim=(0, WALL_F, 3.0)),
        area((0, WALL_F + 0.08, GLOBE_U), (3.0, 3.0), (90, 150, 255), 250, aim=(0, 4.0, 0.5)),
    ]),
}


def lit(t, **k):
    return P.light(t, **k)


def metal(t):
    return lit(t, lo=0.7, hi=1.1)


# Paint ------------------------------------------------------------------

def floor(t):
    """Polished studio floor: big square tiles, a sheen in the middle, tape
    marks where the fighters start and the cameras roll, darker to the back."""
    x, z = t.side, t.fwd
    c = P.shade(t.c, P.lines(x, 1.2, 0.012) | P.lines(z, 1.2, 0.012), 0.78)
    for _ in range(12):
        cx, cz = t.rng.uniform(-8, 8), t.rng.uniform(-3.5, 6)
        c = P.shade(c, P.ellipse(x, z, cx, cz, t.rng.uniform(0.5, 1.4), t.rng.uniform(0.2, 0.5)), 0.93)
    for sx in (-1.5, 1.5):
        mark = ((np.abs(x - sx) < 0.04) & (np.abs(z) < 0.3)) | ((np.abs(z - 0.3) < 0.04) & (np.abs(x - sx) < 0.2))
        c = P.put(c, mark, (230, 230, 220))
    for sx in (-5.6, 5.6):
        c = P.put(c, (np.abs(z + 0.6) < 0.025) & (np.abs(x - sx) < 1.0), TAPE, 0.8)
    k = (1 + 0.35 * np.exp(-(x ** 2 / 20 + z ** 2 / 4))) * (1 - 0.35 * np.clip((-z - 2.0) / 2.0, 0, 1))
    return c * k[:, None]


def wall(t):
    """The back wall: deep blue panels, lighter toward the middle, a thin
    gold rule along the bottom."""
    x, u = t.side, t.up
    c = P.shade(t.c, P.lines(x, 2.0, 0.03), 0.8)
    c = P.put(c, (u > 0.55) & (u < 0.6), GOLD, 0.6)
    k = (0.75 + 0.45 * np.exp(-(x ** 2) / 30)) * (1 - 0.4 * np.clip((u - 6.0) / 2.0, 0, 1))
    return c * k[:, None]


def globe(t):
    """The globe graphic: a blue disc with latitude and longitude lines and
    blocky continents, a pale rim; transparent-black outside (the wall)."""
    x, u = t.side, t.up - GLOBE_U
    r = np.hypot(x, u) / GLOBE_R
    c = np.empty_like(t.c)
    c[:] = WALL
    inside = r < 1
    c = P.put(c, inside, GLOBE)
    lat = np.arcsin(np.clip(u / GLOBE_R, -1, 1))
    lon = np.arcsin(np.clip(x / (GLOBE_R * np.maximum(np.cos(lat), 0.05)), -1, 1))
    cell = np.floor(lat / 0.22) * 13.1 + np.floor(lon / 0.26) * 7.7
    land = inside & (np.mod(np.sin(cell) * 937.1, 1.0) < 0.35)
    c = P.put(c, land, LAND)
    grid = inside & (P.lines(lat, math.pi / 9, 0.012) | P.lines(lon, math.pi / 9, 0.016))
    c = P.put(c, grid, (190, 220, 255), 0.7)
    c = P.put(c, (r > 0.97) & (r < 1.03), (200, 226, 255))
    glow = np.clip(1 - np.abs(r - 1) / 0.12, 0, 1) * (r > 1)
    return P.put(c, glow, (60, 110, 220), 0.4)


def header(t):
    """CH 0 NEWS in gold over AT 11 in white, on a navy board with a gold rule."""
    x, u = t.side, t.up
    front = t.n[:, 1] > 0.5
    c = P.shade(t.c, ~front, 0.7)
    ink = P.text(x, u, "CH 0 NEWS", 0.62, 0.0, HEADER_U - 0.03)
    c = P.put(c, front & ink, GOLD)
    c = P.put(c, front & P.text(x, u, "AT 11", 0.26, 0.0, HEADER_U - 0.43), WHITE)
    c = P.put(c, front & ((np.abs(u - HEADER_U + 0.13) < 0.025) & (np.abs(x) < 2.6)), GOLD)
    return c


def clock(cx, cu, r):
    """The studio clock: white face, hour ticks, the hands at eleven."""
    def paint(t):
        x, u = t.side - cx, t.up - cu
        front = t.n[:, 1] > 0.5
        d = np.hypot(x, u)
        a = np.arctan2(x, u)
        c = P.put(t.c, front & (d < r * 0.92), WHITE)
        ticks = front & (d > r * 0.75) & (d < r * 0.88) & (np.abs(np.mod(a + math.pi / 12, math.pi / 6) - math.pi / 12) < 0.05)
        c = P.put(c, ticks, (30, 30, 36))
        for ang, length, width in ((-math.pi / 6, 0.5, 0.035), (0.0, 0.75, 0.025)):  # hour at 11, minute at 12
            along = x * math.sin(ang) + u * math.cos(ang)
            across = x * math.cos(ang) - u * math.sin(ang)
            c = P.put(c, front & (along > -0.02) & (along < r * length) & (np.abs(across) < r * width * 2), (20, 20, 24))
        c = P.put(c, front & (d < r * 0.06), RED)
        return c
    return paint


def band(t):
    """The breaking-news band: red with bright edges and a sweep of light."""
    u = t.up
    c = P.put(t.c, (np.abs(u - BAND_U) > 0.32), (255, 90, 90))
    s = np.mod(t.side * 0.4, 3.0) - 1.5
    return P.put(c, np.exp(-(s ** 2) / 0.05), (255, 140, 130), 0.35)


def breaking(t):
    x, u = t.side, t.up
    front = t.n[:, 1] > 0.5
    c = P.shade(t.c, ~front, 0.7)
    c = P.put(c, front & P.text(x, u, "BREAKING", 0.58, 0.0, HEADER_U - 0.06), WHITE)
    return P.put(c, front & P.text(x, u, "NEWS", 0.26, 0.0, HEADER_U - 0.46), (255, 210, 200))


def riser(t):
    """The riser's plate: steel tread with hazard stripes round its edge."""
    x, z = t.side, t.fwd
    c = P.shade(t.c, P.lines(x + z, 0.08, 0.02), 0.85)
    edge = (np.abs(x) > 0.92) | (np.abs(z + 0.4) > 0.37)
    stripes = np.mod(x + z, 0.3) < 0.15
    return P.put(c, edge & stripes, HAZARD)


def dead_backdrop(t):
    """The backdrop, dead: dark grey, the globe's ghost, a scorch."""
    x, u = t.side, t.up
    c = P.shade(t.c, P.lines(x, 2.0, 0.03), 0.75)
    c = P.put(c, np.abs(np.hypot(x, u - GLOBE_U) - GLOBE_R) < 0.03, (44, 46, 56))
    c = P.shade(c, P.ellipse(x, u, 2.6, HEADER_U, 1.1, 0.8), 0.6)
    t.c = c
    return lit(t, lo=0.8)


def desk_paint(t):
    """Walnut veneer with a blue panel across the curved front carrying the
    station logo, a chrome strip along the top."""
    x, z, u = t.side, t.fwd, t.up
    c = P.put(t.c, P.grain(x, u, 0.04, 0.008, 4.0), np.array(WOOD) * 0.8)
    front = t.n[:, 1] > 0.3
    panel = front & (u > 0.32) & (u < 0.62) & (np.abs(x) < 0.5)
    c = P.put(c, panel, (24, 60, 150))
    c = P.put(c, panel & P.text(x, u, "CH 0", 0.12, 0.0, 0.48), WHITE)
    c = P.put(c, panel & P.text(x, u, "NEWS", 0.08, 0.0, 0.36), GOLD)
    c = P.put(c, (u > 0.76) & front, (200, 204, 212))
    t.c = c
    return lit(t, lo=0.75)


def camera_paint(t):
    """A studio camera: grey body, CH 0 on its side, a red tally light."""
    c = P.put(t.c, (t.n[:, 0] ** 2 > 0.5) & P.text(t.fwd, t.up, "CH 0", 0.1, -0.6, 1.55), WHITE)
    t.c = c
    return metal(t)


def tape(t):
    return P.shade(t.c, P.lines(t.side + t.fwd, 0.05, 0.02), 0.95)


# Pieces -----------------------------------------------------------------

def quad(p, name, x0, x1, u0, u1, f, colour, paint, mat=0):
    """An upright rectangle facing the camera at fwd = f."""
    p.poly(name, [(x0, f, u0), (x1, f, u0), (x1, f, u1), (x0, f, u1)], colour, "set", (0, 1, 0), mat=mat, paint=paint)


def fresnel(p, name, at, mat=0, bone="set"):
    """A fresnel lamp hanging lens down on its yoke, its lens at `at`."""
    x, f, u = at
    p.seg(f"{name}_body", (x, f, u), (x, f, u + 0.42), 0.2, 0.17, LAMP, bone, verts=8, mat=mat, paint=metal)
    p.seg(f"{name}_lens", (x, f, u - 0.01), (x, f, u + 0.01), 0.17, 0.17, LENS, bone, verts=8, mat=mat, paint=lambda t: t.c)
    for s in (-1, 1):
        p.seg(f"{name}_yoke{s}", (x + s * 0.23, f, u + 0.2), (x + s * 0.23, f, u + 0.55), 0.015, 0.015, GRID, bone, verts=4, mat=mat)
    p.seg(f"{name}_yoke_top", (x - 0.24, f, u + 0.55), (x + 0.24, f, u + 0.55), 0.015, 0.015, GRID, bone, verts=4, mat=mat)


def flat_poly(p, name, pts, colour, paint, mat=0, up=0.004):
    p.poly(name, [(x, f, up) for x, f in pts], colour, "set", (0, 0, 1), mat=mat, paint=paint)


def build(make):
    def studio(p):
        p.poly("floor", [(-9.6, -4.2, 0), (9.6, -4.2, 0), (9.6, 9, 0), (-9.6, 9, 0)], FLOOR, "set", (0, 0, 1), paint=floor)
        quad(p, "wall", -10, 10, 0, 8.5, WALL_F, WALL, wall)
        # The lighting grid: three pipes along the stage, a lamp over each spot.
        for k, f in enumerate((-3.0, -1.0, 1.0)):
            p.seg(f"pipe{k}", (-9.5, f, GRID_U), (9.5, f, GRID_U), 0.04, 0.04, GRID, "set", verts=6, paint=metal)
        for k, x in enumerate((-6, -2, 2, 6)):
            p.seg(f"crossbar{k}", (x, -3.2, GRID_U + 0.05), (x, 1.2, GRID_U + 0.05), 0.03, 0.03, GRID, "set", verts=4, paint=metal)
        # Studio cameras on pedestals at the sides, lenses toward the middle.
        for s in (-1, 1):
            x = s * 5.6
            p.seg(f"ped_base{s}", (x, -0.9, 0.0), (x, -0.9, 0.12), 0.38, 0.34, PEDESTAL, "set", verts=6, paint=metal)
            p.seg(f"ped_column{s}", (x, -0.9, 0.12), (x, -0.9, 1.25), 0.07, 0.06, (150, 152, 160), "set", verts=6, paint=metal)
            p.seg(f"ped_ring{s}", (x, -0.9, 0.95), (x, -0.9, 0.98), 0.3, 0.3, (150, 152, 160), "set", verts=8, paint=metal)
            p.box(f"camera{s}", (x, -0.9, 1.45), (0.36, 0.7, 0.42), CAMERA, "set", paint=camera_paint)
            p.seg(f"lens{s}", (x - s * 0.18, -0.9, 1.42), (x - s * 0.42, -0.9, 1.42), 0.11, 0.1, (24, 24, 28), "set", verts=8, paint=metal)
            p.blob(f"tally{s}", (x, -0.6, 1.7), (0.03, 0.03, 0.03), RED, "set")
            p.seg(f"handle{s}", (x + s * 0.15, -1.2, 1.4), (x + s * 0.5, -1.5, 1.2), 0.02, 0.02, PEDESTAL, "set", verts=4)
            # Dark flats closing the set off at the sides.
            p.box(f"flat{s}", (s * 6.9, -1.5, 3.0), (0.3, 5.4, 6.0), FLAT, "set", paint=lambda t: lit(t, lo=0.6))

    def headlines(p):
        # The lamps hang over the fighting floor until Lights Out drops them
        # (there only their cables are left).
        # (The lamps are swing_lamp*, children of this.)
        r = GLOBE_R + 0.3
        quad(p, "globe", -r, r, GLOBE_U - r, GLOBE_U + r, WALL_F + 0.02, GLOBE, globe)
        p.box("header", (0, WALL_F + 0.08, HEADER_U), (5.6, 0.1, 1.05), HEADER, "set", paint=header)
        p.seg("clock_rim", (4.4, WALL_F + 0.02, CLOCK_U), (4.4, WALL_F + 0.12, CLOCK_U), 0.55, 0.55, (40, 40, 46), "set", verts=16, paint=metal)
        p.seg("clock", (4.4, WALL_F + 0.12, CLOCK_U), (4.4, WALL_F + 0.13, CLOCK_U), 0.52, 0.52, WHITE, "set", verts=16, paint=clock(4.4, CLOCK_U, 0.52))

    def ticker(p):
        # The red band low along the wall, and BREAKING over the header.
        p.box("band", (0, WALL_F + 0.15, BAND_U), (19.0, 0.04, 0.75), RED, "set", paint=band)
        p.box("breaking", (0, WALL_F + 0.2, HEADER_U), (5.8, 0.08, 1.15), RED, "set", paint=breaking)
        flat_poly(p, "riser", [(-1.0, -0.8), (1.0, -0.8), (1.0, 0.0), (-1.0, 0.0)], STEEL, riser)

    def lightsout(p):
        rng = np.random.default_rng(23)
        quad(p, "backdrop_dead", -10, 10, 0, 6.2, -4.05, DEAD, dead_backdrop)
        for k, x in enumerate(LAMP_X):
            f = 0.0 if k % 2 else -1.0
            drop = rng.uniform(0.8, 1.8)
            pts = [(x, f, GRID_U), (x + 0.05, f + 0.03, GRID_U - drop * 0.5), (x + rng.uniform(-0.15, 0.15), f + 0.06, GRID_U - drop)]
            p.tube(f"cable{k}", [(q, 0.012, {"set": 1.0}, CABLE) for q in pts], verts=4)
        for s in (-1, 1):
            x = s * 4.3
            p.seg(f"fallen{s}", (x, -2.6, 0.2), (x + s * 0.42, -2.4, 0.2), 0.2, 0.17, LAMP, "set", verts=8, paint=metal)
            p.seg(f"fallen_lens{s}", (x - s * 0.01, -2.6, 0.2), (x + s * 0.01, -2.6, 0.2), 0.17, 0.17, (70, 70, 64), "set", verts=8)

    def desk(p):
        # Curved front (bulging toward the camera), flat back, origin at the
        # bottom centre; the top overhangs a little.
        pts = []
        for i in range(9):
            a = math.pi * i / 8
            x, bulge = -0.56 * math.cos(a), 0.06 * math.sin(a)
            for u in (0.0, 0.74):
                pts.append((x, 0.28 + bulge, u))
            pts += [(x, -0.33, 0.0), (x, -0.33, 0.74)]
        p.hull("desk", pts, WOOD, "set", mat=1, paint=desk_paint)
        p.box("desk_top", (0, 0.0, 0.775), (1.2, 0.7, 0.05), (60, 40, 26), "set", mat=1, paint=lambda t: lit(t, lo=0.8))

    def lamp(p):
        fresnel(p, "fresnel", (0, 0, 0), mat=1)

    def wreck(p):
        rng = np.random.default_rng(31)
        p.seg("wreck_body", (-0.25, 0, 0.18), (0.17, 0.05, 0.16), 0.19, 0.16, LAMP, "set", verts=8, mat=1, paint=metal)
        p.seg("wreck_yoke", (-0.1, 0.25, 0.02), (0.3, 0.3, 0.05), 0.015, 0.015, GRID, "set", verts=4, mat=1)
        for k in range(16):
            a, r = rng.uniform(0, 2 * math.pi), 0.2 + 0.32 * math.sqrt(rng.uniform(0, 1))
            cx, cf = r * math.cos(a), r * math.sin(a)
            s = rng.uniform(0.03, 0.08)
            flat_poly(p, f"glass{k}", [(cx + s * math.cos(a + d), cf + s * math.sin(a + d)) for d in (0, 2.2, 4.1)], GLASS,
                      lambda t: lit(t, lo=0.9, hi=1.15), mat=1, up=0.003)

    def mark(p):
        for k, a in enumerate((math.pi / 4, -math.pi / 4)):
            ca, sa = math.cos(a), math.sin(a)
            pts = [(sx * 0.5 * ca - sw * 0.06 * sa, sx * 0.5 * sa + sw * 0.06 * ca) for sx, sw in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
            flat_poly(p, f"tape{k}", pts, TAPE, tape, mat=1, up=0.003 + 0.001 * k)

    make("set", studio)
    make("seg_headlines", headlines)
    make("seg_ticker", ticker)
    make("seg_lightsout", lightsout)
    # Set pieces the game moves on big hits (art step 29), origins at their
    # pivots: the lamps over the floor swing from the grid (gone with
    # seg_headlines when Lights Out drops them).
    for k, x in enumerate(LAMP_X):
        f = 0.0 if k % 2 else -1.0
        make(f"swing_lamp{k}", lambda p, k=k, x=x, f=f: fresnel(p, f"lamp{k}", (x, f, GRID_U - 0.62)), pivot=(x, f, GRID_U), parent="seg_headlines")
    make("prop_desk", desk, at=(0, -0.4, 0))
    make("fg_left", lambda p: fg.camera(p, "fg_cam", 1), at=(-6.2, 3.0, 0))
    make("fg_right", lambda p: fg.boom(p, "fg_boom", -1), at=(6.2, 3.0, 0))
    make("fg_top", lambda p: fg.lamp(p, "fg_lamp"), at=(-2.5, 2.0, 5.0))
    make("fx_lamp", lamp)
    make("fx_wreck", wreck)
    make("fx_mark", mark)
    # Set dressing the game knocks about (step 30), each round its middle.
    make("clutter_script", C.script)
    make("clutter_mug", lambda p: C.mug(p, (30, 52, 110), "NEWS", (240, 240, 236)))
    make("clutter_bin", C.bin)
