"""Weather at Eleven: Channel 0's weather studio, in three segments (one per
round, docs/DESIGN.md): the calm studio, the forecast coming true (storm),
and the flood. Built by lib/stage.py; positions are (x, fwd, up) in stage
space: x along the stage, fwd toward the camera, up. The fighters fight on
fwd = 0, between the studio flats at x = ±6.4, in front of the weather-map
wall at fwd = −4.

Objects (the game shows them by segment and places the props and effects):
- `set`: the studio, every static piece merged (one draw call)
- `seg_storm`: segment 2 on top of the set (storm map, papers on the floor)
- `seg_flood`: segment 3 on top of both (flood map, the live cables)
- `prop_dolly_left`, `prop_dolly_right`: the kickable camera dollies at
  x = ∓4.6, fwd = −0.2 (their origins on the floor under their centres)
- `fx_lightning`, `fx_scorch`, `fx_paper`, `fx_water`, `fx_puddle`, `fx_spark`:
  effects at the origin, placed by the game
"""
import math

import numpy as np

from lib import foreground as fg
from lib import paint as P
from lib.bake import area, spot
from lib.texture import bright

ID = "weather"
DENSE = ("map", "header", "screen", "tv_screen")

FLOOR = (44, 44, 54)
WALL = (20, 34, 84)
SEA = (34, 86, 164)
LAND = (84, 150, 78)
FRONT = (60, 110, 235)
WHITE = (240, 240, 236)
YELLOW = (250, 214, 70)
RED = (214, 56, 40)
NAVY = (16, 22, 52)
CHROMA = (34, 168, 76)
METAL = (56, 58, 66)
FLAT = (70, 62, 82)
WOOD = (176, 136, 88)
TAPE = (232, 190, 52)
RUBBER = (26, 26, 30)
COPPER = (210, 126, 62)
PAPER = (236, 232, 220)
BOLT = (246, 248, 255)
SPARK = (255, 236, 150)
WATER = (46, 112, 150)
LIVE = (70, 176, 236)

# The map's rectangle on the wall, and its header bar above.
MAP_X0, MAP_X1, MAP_Y0, MAP_Y1 = -7.0, 3.4, 0.9, 4.4
HEAD_Y1 = 5.15
WALL_F = -4.0

# Light rig per segment, for the game (three.js space: x, y up, z toward
# the camera). Written to the `lights` node's extras; see BLENDER-TODO.
LIGHTS = [
    {"segment": "The Studio", "background": "#07070c",
     "ambient": {"color": "#ffffff", "intensity": 1.4},
     "key": {"color": "#fff1e0", "intensity": 2.2, "position": [-3, 6, 8]},
     "rim": {"color": "#9fb4ff", "intensity": 0.6, "position": [2, 5, -4]}},
    {"segment": "The Forecast Comes True", "background": "#04050a",
     "ambient": {"color": "#a8b4d8", "intensity": 0.85},
     "key": {"color": "#c8d4ff", "intensity": 1.5, "position": [4, 7, 6]},
     "rim": {"color": "#7a88c8", "intensity": 0.8, "position": [-2, 6, -4]},
     "flash": {"color": "#e8f0ff", "intensity": 3.5}},
    {"segment": "Flood Warning", "background": "#03080a",
     "ambient": {"color": "#9cc8d0", "intensity": 1.0},
     "key": {"color": "#d8f0f4", "intensity": 1.7, "position": [-2, 6, 7]},
     "rim": {"color": "#4fa8c8", "intensity": 0.7, "position": [0, -1, 4]}},
]

# What gives off light (step 23 C): part name → strength, or a rule.
EMISSION = {
    "fg_cam_tally": 2,
    "tv_screen": 1.5,
    "lamp_lensring": 3,
    "(camera|dolly)_tally": 2,
    r"(trunk|branch)\d+|flash": 4,
    r"spark.*": 3,
    "puddle": bright(1.5, 190, 215),
}

# The baked light (step 23 B): {segment: (pieces shown, lamps)}; segments 2
# and 3 use map 1. The lamp beyond the right flat (its lens, aimed at the
# middle), the colour bars spilling off the monitor cart, a wash down the map.
LIGHTMAPS = {
    1: ((), [
        spot((8.8, -1.34, 2.35), (0, 0, 1.2), (255, 236, 200), 900, angle=40),
        area((-9.2, -1.3, 1.07), (0.7, 0.48), (200, 205, 235), 60, aim=(-9.2, 3.0, 0.0)),
        area((-1.8, -2.8, 6.4), (10.6, 0.3), (230, 235, 255), 700, aim=(-1.8, -4.0, 2.6)),
    ]),
}


def lit(t, **k):
    return P.light(t, **k)


# Paint ------------------------------------------------------------------

def floor(t):
    """Painted studio floor: sheet seams, scuffs, tape marks where the
    fighters start, a pool of light in the middle and a darker cove at the back."""
    x, z = t.side, t.fwd
    c = P.shade(t.c, P.lines(x, 2.44, 0.03) | P.lines(z, 1.22, 0.03), 0.78)
    for _ in range(16):
        cx, cz = t.rng.uniform(-11, 11), t.rng.uniform(-3.5, 7)
        c = P.shade(c, P.ellipse(x, z, cx, cz, t.rng.uniform(0.5, 1.4), t.rng.uniform(0.2, 0.5)), 0.9)
    for sx in (-1.5, 1.5):
        mark = ((np.abs(x - sx) < 0.04) & (np.abs(z) < 0.3)) | ((np.abs(z - 0.3) < 0.04) & (np.abs(x - sx) < 0.2))
        c = P.put(c, mark, TAPE)
    cross = ((np.abs(x - z) < 0.05) | (np.abs(x + z) < 0.05)) & (np.abs(x) < 0.22) & (np.abs(z) < 0.22)
    c = P.put(c, cross, TAPE)
    k = 1 + 0.22 * np.exp(-(x ** 2 / 30 + z ** 2 / 6)) - 0.3 * np.clip((-z - 2.6) / 1.4, 0, 1)
    return c * k[:, None]


def wall(t):
    """The cyclorama behind the map: panel seams, a skirting, a pool of light,
    'STORM CENTER' to the left of the map and the station's 'CH 0' to the right."""
    x, y = t.side, t.up
    c = P.shade(t.c, P.lines(x, 1.22, 0.05), 0.8)
    c = P.shade(c, y < 0.35, 0.55)
    band = (y > 4.55) & (y < 4.75) & (x < -8.0)
    c = P.put(c, band, RED)
    c = P.put(c, P.text(x, y, "STORM CENTER", 0.45, -11.3, 3.85), WHITE)
    ring = np.hypot(x - 10.4, y - 3.4)
    c = P.put(c, (ring > 1.15) & (ring < 1.4), YELLOW)
    c = P.put(c, P.text(x, y, "CH 0", 0.8, 10.4, 3.0), WHITE)
    k = 0.8 + 0.4 * np.exp(-((x + 1.5) ** 2 / 60 + (y - 3.0) ** 2 / 8))
    return c * k[:, None]


def weather_map(t):
    """1987's forecast: green land and blue sea, dashed state lines, a cold
    front with its triangles, H and L, the sun, a rain cloud and city
    temperatures on dark tags, in a white frame. In map coordinates (metres
    from its bottom-left corner)."""
    u, v = t.side - MAP_X0, t.up - MAP_Y0
    c = np.empty_like(t.c)
    c[:] = SEA
    coast = 6.0 + 0.5 * np.sin(v * 1.9) + 0.25 * np.sin(v * 4.3 + 0.7) - 1.3 * np.exp(-((v - 1.7) ** 2) / 0.12)
    south = 0.35 + 0.2 * np.sin(u * 1.3 + 0.5)
    land = ((u < coast) & (v > south)) | P.ellipse(u, v, 8.3, 1.0, 0.75, 0.42) | P.ellipse(u, v, 9.3, 0.72, 0.3, 0.2)
    c = P.shade(c, ~land & P.lines(v + 0.08 * np.sin(u * 3), 0.4, 0.035), 1.15)
    c = P.put(c, land, LAND)
    borders = land & ((P.lines(u + 0.3 * np.sin(v * 2), 2.3, 0.04) & P.dashes(v, 0.2))
                      | (P.lines(v + 0.15 * np.sin(u * 1.7), 1.6, 0.04, 0.5) & P.dashes(u, 0.2)))
    c = P.put(c, borders, (225, 235, 215), 0.8)
    d = u - (3.9 + 0.7 * np.sin(v * 1.2 + 0.4))
    s = np.mod(v, 0.55) - 0.275
    front = (np.abs(d) < 0.05) | ((d > 0) & (d < 0.24) & (np.abs(s) < 0.15 * (1 - d / 0.24)))
    c = P.put(c, front, FRONT)
    c = P.put(c, P.text(u, v, "H", 0.7, 1.9, 2.4), FRONT)
    c = P.put(c, P.text(u, v, "L", 0.7, 7.6, 2.6), RED)
    r, a = np.hypot(u - 4.9, v - 2.75), np.arctan2(v - 2.75, u - 4.9)
    c = P.put(c, (r < 0.24) | ((r > 0.3) & (r < 0.42) & (np.mod(a + 0.15, math.pi / 4) < 0.3)), YELLOW)
    rain = (v > 1.25) & (v < 1.68) & (np.abs(u - 7.0) < 0.38) & P.lines(u - v * 0.35, 0.17, 0.045)
    c = P.put(c, rain, (150, 200, 255))
    cloud = P.ellipse(u, v, 7.0, 1.9, 0.42, 0.24) | P.ellipse(u, v, 7.35, 2.08, 0.32, 0.26) | P.ellipse(u, v, 6.66, 2.04, 0.26, 0.2)
    c = P.put(c, cloud, WHITE)
    for cu, cv, temp in ((1.1, 1.3, "72"), (3.3, 0.75, "81"), (2.7, 2.8, "64"), (5.1, 2.1, "77"), (0.5, 2.8, "58")):
        c = P.put(c, (np.abs(u - cu - 0.38) < 0.27) & (v > cv - 0.07) & (v < cv + 0.4), NAVY)
        c = P.put(c, P.text(u, v, temp, 0.3, cu + 0.38, cv + 0.02), YELLOW)
        c = P.put(c, P.ellipse(u, v, cu, cv + 0.15, 0.07, 0.07), WHITE)
    w = MAP_X1 - MAP_X0
    frame = (u < 0.07) | (u > w - 0.07) | (v < 0.07) | (v > MAP_Y1 - MAP_Y0 - 0.07)
    return P.put(c, frame, WHITE)


def header(t):
    """The bar over the map: the show's title, a station bug and the clock."""
    x, y = t.side, t.up
    c = P.put(t.c, y < MAP_Y1 + 0.17, YELLOW)
    c = P.put(c, P.text(x, y, "WEATHER AT ELEVEN", 0.42, MAP_X0 + 0.25, MAP_Y1 + 0.3, centred=False), WHITE)
    ring = np.hypot(x - 0.25, y - (MAP_Y1 + 0.52))
    c = P.put(c, ring < 0.3, WHITE)
    c = P.put(c, P.text(x, y, "0", 0.36, 0.25, MAP_Y1 + 0.34), RED)
    return P.put(c, P.text(x, y, "11:04", 0.42, 2.25, MAP_Y1 + 0.3), WHITE)


def storm_map(t):
    """The forecast comes true: the map dimmed under a swirling radar cell,
    warning triangles and a red banner."""
    u, v = t.side - MAP_X0, t.up - MAP_Y0
    c = weather_map(t)
    lum = c @ np.array([0.299, 0.587, 0.114])
    c = c * 0.25 + lum[:, None] * 0.35
    a = np.arctan2(v - 2.3, u - 3.4)
    rr = np.hypot((u - 3.4) / 2.2, (v - 2.3) / 1.25)
    rr = rr + 0.12 * np.sin(3 * a + rr * 5)
    for lim, col in ((1.0, (60, 190, 70)), (0.72, (240, 210, 60)), (0.48, (240, 130, 40)), (0.26, (220, 40, 40))):
        c = P.put(c, rr < lim, col, 0.9)
    for cu, cv in ((7.9, 2.6), (1.0, 2.7)):
        tri = (v > cv) & (v < cv + 0.55) & (np.abs(u - cu) < 0.32 * (1 - (v - cv) / 0.55))
        c = P.put(c, tri, YELLOW)
        c = P.put(c, P.text(u, v, "!", 0.3, cu, cv + 0.06) & tri, NAVY)
    c = P.put(c, v < 0.66, (190, 30, 30))
    c = P.put(c, P.text(u, v, "SEVERE STORM WARNING", 0.36, (MAP_X1 - MAP_X0) / 2, 0.15), WHITE)
    return c


def flood_map(t):
    """Flood Warning: the coast and the south under hatched flood water, a
    blue banner."""
    u, v = t.side - MAP_X0, t.up - MAP_Y0
    c = weather_map(t)
    lum = c @ np.array([0.299, 0.587, 0.114])
    c = c * 0.45 + lum[:, None] * 0.3
    coast = 6.0 + 0.5 * np.sin(v * 1.9) + 0.25 * np.sin(v * 4.3 + 0.7) - 1.3 * np.exp(-((v - 1.7) ** 2) / 0.12)
    flood = (v < 1.5 + 0.25 * np.sin(u * 1.8)) | (u > coast - 1.1 - 0.3 * np.sin(v * 3))
    c = P.put(c, flood, (40, 110, 220), 0.85)
    c = P.put(c, flood & P.lines(u + v, 0.3, 0.07), (140, 200, 255), 0.8)
    c = P.put(c, v < 0.66, (24, 56, 160))
    c = P.put(c, P.text(u, v, "FLOOD WARNING", 0.36, (MAP_X1 - MAP_X0) / 2, 0.15), WHITE)
    return c


def chroma(t):
    """The green screen: panel seams and tracking crosses in darker green tape."""
    x, y = t.side, t.up
    c = P.shade(t.c, P.lines(x, 1.0, 0.04, 0.3), 0.9)
    du, dv = np.mod(x - 0.3, 1.0) - 0.5, np.mod(y - 0.2, 1.0) - 0.5
    plus = ((np.abs(du) < 0.12) & (np.abs(dv) < 0.025)) | ((np.abs(dv) < 0.12) & (np.abs(du) < 0.025))
    c = P.put(c, plus, (18, 112, 48))
    k = 0.9 + 0.2 * np.exp(-((x - 5.2) ** 2 / 4 + (y - 2.4) ** 2 / 3))
    return c * k[:, None]


def flat(t):
    """A studio flat: painted canvas toward the arena (a kick panel, the
    station's stripes, 'CH 0' stencilled), plywood and framing behind."""
    x, z, y = t.side, t.fwd, t.up
    sign = np.sign(x)
    inner = -t.n[:, 0] * sign > 0.5
    front = t.n[:, 1] > 0.5
    c = P.shade(t.c, inner & (y < 0.9), 0.7)
    c = P.put(c, inner & (y > 3.7) & (y < 3.85), RED)
    c = P.put(c, inner & (y > 3.9) & (y < 4.0), YELLOW)
    # Across the inner face as seen from the arena: −fwd on the left flat, +fwd on the right.
    u = np.where(sign < 0, -(z + 1), z + 1)
    c = P.put(c, inner & P.text(u, y, "CH 0", 0.6, 0.0, 2.1), (200, 190, 210), 0.8)
    c = P.put(c, front, (44, 40, 50))
    c = P.put(c, front & (np.abs(y - 1.6) < 0.05), TAPE)
    back = ~inner & ~front
    c = P.put(c, back, WOOD)
    c = P.put(c, back & P.grain(z, y, 0.06, 0.02, 2.0), (150, 112, 70))
    c = P.put(c, back & (P.lines(y, 1.2, 0.08) | P.lines(z, 1.0, 0.08)), (120, 90, 56))
    t.c = c
    return lit(t)


def wood(t):
    t.c = P.put(t.c, P.grain(t.side + t.fwd, t.up, 0.05, 0.015, 4.0), np.array(t.c[0]) * 0.82)
    return lit(t)


def colour_bars(t):
    """SMPTE bars, as every studio monitor showed between takes."""
    x0, x1 = -9.55, -8.85
    u = np.clip((t.side - x0) / (x1 - x0), 0, 0.999)
    bars = np.array([(192, 192, 192), (192, 192, 0), (0, 192, 192), (0, 192, 0), (192, 0, 192), (192, 0, 0), (0, 0, 192)], dtype=float)
    c = bars[(u * 7).astype(int)]
    low = t.up < np.min(t.up) + 0.1
    return np.where(low[:, None], bars[(6 - (u * 7).astype(int))] * 0.6, c)


def dolly_paint(ox):
    def paint(t):
        side = np.abs(t.n[:, 1]) > 0.5
        c = P.put(t.c, side & P.text(t.side - ox, t.up, "CH 0", 0.1, 0.0, 0.77) & (t.up > 0.7), WHITE)
        t.c = c
        return lit(t, lo=0.75)
    return paint


def paper(t):
    t.c = P.put(t.c, P.lines(t.side + t.fwd * 0.3, 0.05, 0.02), (150, 150, 160), 0.5)
    return lit(t, lo=0.9)


def scorch(t):
    r, a = np.hypot(t.side, t.fwd), np.arctan2(t.fwd, t.side)
    edge = 0.36 + 0.14 * np.abs(np.sin(a * 3.5)) + 0.05 * np.sin(a * 11)
    c = np.empty_like(t.c)
    c[:] = (62, 54, 50)
    c = P.put(c, r < edge, (26, 22, 20))
    c = P.put(c, (r < edge * 0.45) & (np.mod(a, 0.6) < 0.25), (96, 86, 78))
    return c


def puddle(t):
    r = np.hypot(t.side, t.fwd)
    c = P.put(t.c, P.lines(r, 0.16, 0.04), (170, 230, 255))
    return P.put(c, r < 0.12, (230, 248, 255))


def glow(t):
    r = np.hypot(t.side, t.fwd)
    return P.put(t.c, r < 0.25, BOLT)


# Pieces -----------------------------------------------------------------

def quad(p, name, x0, x1, y0, y1, f, colour, paint, mat=0):
    """An upright rectangle facing the camera at fwd = f."""
    p.poly(name, [(x0, f, y0), (x1, f, y0), (x1, f, y1), (x0, f, y1)], colour, "set", (0, 1, 0), mat=mat, paint=paint)


def disc(p, name, r, up, colour, paint, mat=1, n=20):
    p.poly(name, [(r * math.cos(2 * math.pi * k / n), r * math.sin(2 * math.pi * k / n), up) for k in range(n)], colour, "set", (0, 0, 1), mat=mat, paint=paint)


def sheet(p, name, x, f, a, up, mat, w=0.21, h=0.297):
    ca, sa = math.cos(a), math.sin(a)
    pts = []
    for sx in (-w / 2, w / 2):
        for sf in (-h / 2, h / 2):
            for su in (0, 0.004):
                pts.append((x + sx * ca - sf * sa, f + sx * sa + sf * ca, up + su))
    p.hull(name, pts, PAPER, "set", mat=mat, paint=paper)


def dolly(p, name, ox, of, d, mat, paint):
    """A TV studio camera on a pedestal dolly, lens toward +x (d = 1) or −x,
    0.9 × 1.0 × 0.7 m, its origin on the floor under its middle (ox, of)."""
    X = lambda x, f, u: (ox + x * d, of + f, u)  # noqa: E731
    base = []
    for k in range(3):
        a = 2 * math.pi * k / 3
        for u in (0.08, 0.15):
            base.append(X(0.4 * math.cos(a), 0.4 * math.sin(a), u))
    p.hull(f"{name}_base", base, (44, 46, 52), "set", mat=mat, paint=paint)
    for k in range(3):
        a = 2 * math.pi * k / 3
        p.blob(f"{name}_wheel{k}", X(0.36 * math.cos(a), 0.34 * math.sin(a), 0.05), (0.05, 0.05, 0.05), RUBBER, "set", 0, mat=mat, paint=paint)
    p.seg(f"{name}_column", X(0, 0, 0.15), X(0, 0, 0.64), 0.07, 0.055, (150, 155, 165), "set", mat=mat, paint=paint)
    p.box(f"{name}_head", X(0, 0, 0.68), (0.16, 0.16, 0.08), METAL, "set", mat=mat, paint=paint)
    p.box(f"{name}_body", X(0.02, 0, 0.84), (0.46, 0.24, 0.26), (70, 72, 82), "set", mat=mat, paint=paint)
    p.seg(f"{name}_lens", X(0.25, 0, 0.85), X(0.43, 0, 0.85), 0.075, 0.09, RUBBER, "set", mat=mat, paint=paint)
    p.blob(f"{name}_glass", X(0.435, 0, 0.85), (0.012, 0.07, 0.07), (40, 60, 110), "set", 1, mat=mat, paint=paint)
    p.box(f"{name}_finder", X(-0.12, 0, 0.94), (0.16, 0.15, 0.1), (60, 62, 70), "set", mat=mat, paint=paint)
    p.blob(f"{name}_tally", X(0.2, 0, 0.98), (0.03, 0.03, 0.02), (230, 30, 30), "set", 1, mat=mat, paint=paint)
    for s in (-1, 1):
        p.seg(f"{name}_bar{s}", X(-0.16, s * 0.08, 0.74), X(-0.42, s * 0.22, 0.6), 0.015, 0.015, RUBBER, "set", mat=mat, paint=paint)


def light_stand(p, name, x, f, aim):
    """A Fresnel on a tripod, aimed at `aim` (x, fwd, up)."""
    for k in range(3):
        a = 2 * math.pi * k / 3 + 0.3
        p.seg(f"{name}_leg{k}", (x + 0.45 * math.cos(a), f + 0.45 * math.sin(a), 0), (x, f, 0.8), 0.02, 0.02, METAL, "set", paint=lit)
    p.seg(f"{name}_pole", (x, f, 0.8), (x, f, 2.3), 0.025, 0.02, METAL, "set", paint=lit)
    head = (x, f, 2.4)
    dv = np.array(aim) - np.array(head)
    dv = dv / np.linalg.norm(dv)
    tip = tuple(np.array(head) + dv * 0.4)
    p.seg(f"{name}_can", head, tip, 0.18, 0.2, RUBBER, "set", verts=10, paint=lit)
    p.seg(f"{name}_lensring", tip, tuple(np.array(tip) + dv * 0.01), 0.17, 0.17, (255, 240, 200), "set", verts=10)


def build(make):
    def studio(p):
        p.poly("floor", [(-14, -4, 0), (14, -4, 0), (14, 11, 0), (-14, 11, 0)], FLOOR, "set", (0, 0, 1), paint=floor)
        quad(p, "wall", -20, 20, 0, 10, WALL_F, WALL, wall)
        # The map and its header, and the green screen: shake_map and shake_screen.
        # Studio flats at the arena's walls, braced and weighted behind.
        for s in (-1, 1):
            p.box(f"flat{s}", (s * 6.4, -1, 2.5), (0.8, 4, 5), FLAT, "set", paint=flat)
            p.seg(f"brace{s}", (s * 6.8, -1, 3.2), (s * 7.9, -1, 0.02), 0.04, 0.04, WOOD, "set", paint=wood)
            for k, ff in enumerate((-2.4, 0.4)):
                p.blob(f"sandbag{s}{k}", (s * 7.1, ff, 0.1), (0.25, 0.16, 0.1), (110, 96, 70), "set", 1, paint=lit)
        # Beyond the flats: a monitor cart with colour bars, a spare camera,
        # a light on a stand, apple boxes, a coil of cable.
        p.box("cart", (-9.2, -1.6, 0.42), (1.0, 0.6, 0.7), METAL, "set", paint=lit)
        p.box("tv", (-9.2, -1.6, 1.07), (0.8, 0.55, 0.6), (110, 76, 48), "set", paint=wood)
        quad(p, "tv_screen", -9.55, -8.85, 0.83, 1.31, -1.6 + 0.276, (192, 192, 192), colour_bars)
        dolly(p, "camera", -11.2, 0.6, 1, 0, dolly_paint(-11.2))
        light_stand(p, "lamp", 9.2, -1.4, (0, 0, 1.2))
        for k, (bx, bf, bu) in enumerate(((10.6, 0.5, 0.15), (10.62, 0.5, 0.45), (11.2, 0.2, 0.15))):
            p.box(f"apple{k}", (bx, bf, bu), (0.5, 0.3, 0.3), WOOD, "set", paint=wood)
        for k in range(14):
            a0, a1 = 2 * math.pi * k / 14, 2 * math.pi * (k + 1) / 14
            for ring, r in enumerate((0.3, 0.26)):
                p.seg(f"coil{ring}_{k}", (-8.2 + r * math.cos(a0), 1.4 + r * math.sin(a0), 0.02 + ring * 0.03),
                      (-8.2 + r * math.cos(a1), 1.4 + r * math.sin(a1), 0.02 + ring * 0.03), 0.018, 0.018, RUBBER, "set", verts=5, paint=lit)

    def wall_map(p):
        quad(p, "map", MAP_X0, MAP_X1, MAP_Y0, MAP_Y1, WALL_F + 0.02, SEA, weather_map)
        quad(p, "header", MAP_X0, MAP_X1, MAP_Y1, HEAD_Y1, WALL_F + 0.02, RED, header)

    def green_screen(p):
        # The green screen on its stand, right of the map.
        quad(p, "screen", 3.4 + 0.4, 7.4 - 0.4, 0.6, 3.6, -3.5, CHROMA, chroma)
        for s in (3.75, 7.05):
            p.box(f"screen_post{s}", (s, -3.5, 1.95), (0.08, 0.08, 3.9), METAL, "set", paint=lit)
            p.box(f"screen_foot{s}", (s, -3.5, 0.03), (0.12, 0.9, 0.06), METAL, "set", paint=lit)
        p.box("screen_top", (5.4, -3.5, 3.65), (3.4, 0.08, 0.1), METAL, "set", paint=lit)

    def storm_overlay(p):
        quad(p, "map_storm", MAP_X0, MAP_X1, MAP_Y0, MAP_Y1, WALL_F + 0.04, SEA, storm_map)

    def flood_overlay(p):
        quad(p, "map_flood", MAP_X0, MAP_X1, MAP_Y0, MAP_Y1, WALL_F + 0.06, SEA, flood_map)

    def storm(p):
        rng = np.random.default_rng(7)
        for k in range(24):
            x = rng.uniform(-12, 12)
            f = rng.uniform(-3.6, 5)
            sheet(p, f"page{k}", x, f, rng.uniform(0, math.pi), 0.002 + 0.0005 * k, 0)

    def flood(p):
        for s in (-1, 1):
            # A junction box on the wall and its cable snaking out to the puddle.
            p.box(f"junction{s}", (s * 3.9, WALL_F + 0.08, 0.6), (0.34, 0.14, 0.42), (150, 150, 140), "set", paint=lit)
            p.box(f"junction_sign{s}", (s * 3.9, WALL_F + 0.155, 0.62), (0.16, 0.01, 0.16), YELLOW, "set", paint=lit)
            path = [(3.9, WALL_F + 0.12, 0.42), (3.9, -3.6, 0.04), (3.6, -2.7, 0.04), (3.25, -1.9, 0.04), (3.1, -1.2, 0.04), (3.0, -0.6, 0.05)]
            for k, (a, b) in enumerate(zip(path, path[1:])):
                p.seg(f"cable{s}_{k}", (s * a[0], a[1], a[2]), (s * b[0], b[1], b[2]), 0.035, 0.035, RUBBER, "set", verts=6, paint=lit)
            for k, (dx, df) in enumerate(((0.06, 0.1), (-0.05, 0.12), (0.0, 0.14))):
                p.seg(f"wire{s}_{k}", (s * 3.0, -0.6, 0.05), (s * (3.0 + dx), -0.6 + df, 0.06), 0.012, 0.006, COPPER, "set", verts=4)

    def lightning(p):
        # About 8 m tall, its foot on the floor at the origin, with two branches.
        rng = np.random.default_rng(3)
        pts = [(0.0, 0.0, 8.0)]
        for k in range(1, 10):
            pts.append((rng.uniform(-0.35, 0.35) if k < 9 else 0.0, rng.uniform(-0.08, 0.08) if k < 9 else 0.0, 8.0 - 8.0 * k / 9))
        _bolt(p, "trunk", pts, 0.13, 0.07)
        for b, (k, dx) in enumerate(((2, 1.2), (5, -0.9))):
            x, f, u = pts[k]
            br = [(x, f, u), (x + dx * 0.5, f, u - 0.6), (x + dx * 0.8, f + 0.05, u - 1.1), (x + dx, f, u - 1.7)]
            _bolt(p, f"branch{b}", br, 0.06, 0.025)
        disc(p, "flash", 0.6, 0.01, (170, 200, 255), glow)

    def dolly_obj(d):
        def parts(p):
            dolly(p, "dolly", 0, 0, d, 1, dolly_paint(0))
        return parts

    make("set", studio)
    make("seg_storm", storm)
    make("seg_flood", flood)
    # Set pieces the game shakes on big hits (art step 29), origins at their
    # pivots: the map with its header (and the storm and flood maps over it,
    # shaken with it), the green screen on its stand.
    make("shake_map", wall_map, pivot=(0, WALL_F, MAP_Y0), parent="set")
    make("shake_map_storm", storm_overlay, pivot=(0, WALL_F, MAP_Y0), parent="seg_storm")
    make("shake_map_flood", flood_overlay, pivot=(0, WALL_F, MAP_Y0), parent="seg_flood")
    make("shake_screen", green_screen, pivot=(5.4, -3.5, 0), parent="set")
    make("prop_dolly_left", dolly_obj(1), at=(-4.6, -0.2, 0))
    make("prop_dolly_right", dolly_obj(-1), at=(4.6, -0.2, 0))
    make("fg_left", lambda p: fg.camera(p, "fg_cam", 1), at=(-6.2, 3.0, 0))
    make("fg_right", lambda p: fg.boom(p, "fg_boom", -1), at=(6.2, 3.0, 0))
    make("fg_top", lambda p: fg.boom_tip(p, "fg_tip", -1), at=(4.4, 2.0, 5.0))
    make("fx_lightning", lightning)
    make("fx_scorch", lambda p: disc(p, "scorch", 0.6, 0.006, (62, 54, 50), scorch, n=24))
    make("fx_paper", lambda p: sheet(p, "paper", 0, 0, 0.3, 0, 1))
    make("fx_water", lambda p: p.poly("water", [(-14, -4, 0.22), (14, -4, 0.22), (14, 11, 0.22), (-14, 11, 0.22)], WATER, "set", (0, 0, 1), mat=2))
    make("fx_puddle", lambda p: disc(p, "puddle", 0.8, 0.235, LIVE, puddle, n=24))
    make("fx_spark", _spark)


def _bolt(p, name, pts, w0, w1):
    """Jagged segments through pts, tapering from w0 to w1 wide."""
    n = len(pts) - 1
    for i, (a, b) in enumerate(zip(pts, pts[1:])):
        wa = w0 + (w1 - w0) * i / n
        wb = w0 + (w1 - w0) * (i + 1) / n
        p.seg(f"{name}{i}", a, b, wa, wb, BOLT, "set", verts=5, mat=1, paint=lambda t: lit(t, lo=0.95))


def _spark(p):
    """The crackle at a live cable's end, about 0.5 m across."""
    rng = np.random.default_rng(5)
    p.blob("spark_core", (0, 0, 0.05), (0.05, 0.05, 0.05), (255, 255, 230), "set", 1, mat=1)
    for i in range(6):
        a = 2 * math.pi * i / 6 + rng.uniform(-0.3, 0.3)
        pts = [(0, 0, 0.05)]
        for k in range(1, 4):
            r = 0.08 * k
            pts.append((r * math.cos(a) + rng.uniform(-0.03, 0.03), r * math.sin(a) + rng.uniform(-0.03, 0.03), 0.05 + rng.uniform(0, 0.12) * k / 3))
        for k, (a_, b_) in enumerate(zip(pts, pts[1:])):
            p.seg(f"spark{i}_{k}", a_, b_, 0.012, 0.006, SPARK if i % 2 else LIVE, "set", verts=4, mat=1)
