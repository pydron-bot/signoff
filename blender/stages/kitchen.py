"""Kitchen Live: Gus's show, a daytime cooking-show kitchen gone very wrong,
in three segments (docs/DESIGN.md): Prep, Grease Fire (the fire takes both
ends of the kitchen and flares at one) and The Oven (everything blackened,
the big oven open and glowing). Built by lib/stage.py; positions are
(x, fwd, up) in stage space, as for Weather. The fighters fight on fwd = 0
in front of the long counter (fwd = −1.6, top at 0.95 m); the tiled back
wall stands at fwd = −3.0, the side walls at x = ±6.6.

Objects (the game shows them by segment and places the props and effects):
- `set`: the chequered floor, the tiled walls, the stainless counter with
  its hob, the extractor hood
- `seg_prep`: shelves of jars, the KITCHEN LIVE sign (segment 1)
- `seg_grease`: the two walls of flame at x = ±4.8 and the smoke under the
  ceiling (segment 2)
- `seg_oven`: the scorching, and the big oven at the back with its door
  hanging open and its glow (segment 3)
- `prop_pot`, `prop_knives`: the stockpot and the knife block, origins at
  their bottom centres, on the counter at x = −3 and +3
- `fx_flare`, `fx_mark`: the gout of flame (origin at its base) and the
  yellow tape cross; placed by the game
"""
import math

import numpy as np

from lib import foreground as fg
from lib import paint as P
from lib.bake import area
from lib.texture import bright

ID = "kitchen"
DENSE = ("sign", "oven")

TILE = (226, 226, 214)
GROUT = (170, 170, 160)
FLOOR_A = (232, 230, 220)
FLOOR_B = (34, 34, 38)
STEEL = (184, 188, 196)
STEEL_DARK = (120, 124, 132)
HOB = (30, 30, 34)
WOOD = (150, 104, 62)
RED = (200, 40, 40)
CREAM = (250, 236, 200)
FLAME = (255, 120, 30)
FLAME_TIP = (255, 220, 90)
FLAME_ROOT = (230, 60, 20)
SMOKE = (40, 34, 32)
SOOT = (22, 18, 16)
OVEN = (52, 50, 54)
GLOW = (255, 140, 40)
POT = (196, 200, 208)
TAPE = (246, 212, 40)
JARS = ((210, 80, 40), (230, 190, 60), (110, 150, 60), (150, 60, 90), (220, 220, 200), (90, 60, 40))

WALL_F = -3.0
COUNTER_F, COUNTER_U = -1.6, 0.95
# The oven and the sign sit right of the hood (over the hob at x = −1.2).
OVEN_X, OVEN_U0, OVEN_U1, OVEN_W = 1.4, 1.15, 2.5, 1.7
SIGN_X = 3.6

# Segment 1's pieces: in place for the set's AO bake (lib/bake.py).
FIRST = ("seg_prep",)

LIGHTS = [
    {"segment": "Prep", "background": "#1a1208",
     "ambient": {"color": "#fff4e0", "intensity": 1.4},
     "key": {"color": "#fff0d8", "intensity": 2.2, "position": [-3, 6, 8]},
     "rim": {"color": "#80c0ff", "intensity": 0.6, "position": [3, 4, -4]}},
    {"segment": "Grease Fire", "background": "#1c0800",
     "ambient": {"color": "#ffc890", "intensity": 1.2},
     "key": {"color": "#ffb060", "intensity": 2.0, "position": [0, 6, 7]},
     "rim": {"color": "#ff5010", "intensity": 1.2, "position": [0, 3, -4]}},
    {"segment": "The Oven", "background": "#200400",
     "ambient": {"color": "#ff9a60", "intensity": 1.1},
     "key": {"color": "#ff8040", "intensity": 2.0, "position": [0, 5, 7]},
     "rim": {"color": "#ff3000", "intensity": 1.0, "position": [0, 2, -5]}},
]

# What gives off light (step 23 C): part name → strength, or a rule.
EMISSION = {
    "fg_cam_tally": 2,
    "sign": bright(2.5, 150, 200),
    "hood_light": 2,
    r"wall-?1_.*|embers.*": 3,
    r"flare.*": 4,
    "oven_glow": 3,
    "oven_halo": 1.5,
}


def _strips():
    """A strip light under each shelf, down onto the counter and wall."""
    out = []
    for x0, x1 in ((2.2, 5.6), (-5.6, -3.2)):
        for u in (1.75, 2.35):
            at = ((x0 + x1) / 2, WALL_F + 0.2, u - 0.04)
            out.append(area(at, (x1 - x0 - 0.1, 0.06), (255, 236, 210), 60, aim=(at[0], WALL_F + 0.6, 0)))
    return out


# The baked light (step 23 B): Prep's light under the hood on the hob and
# counter and the strips under the shelves (Grease Fire uses it, flickered by
# the game); The Oven's orange pouring from the oven door, the hood dead.
LIGHTMAPS = {
    1: (("seg_prep",), [
        area((-1.2, -2.2, 2.26), (1.3, 0.5), (255, 238, 204), 250, aim=(-1.2, -2.2, 0)),
        *_strips(),
    ]),
    3: (("seg_prep", "seg_oven"), [
        area((OVEN_X, WALL_F + 0.65, (OVEN_U0 + OVEN_U1) / 2), (1.5, 1.2), (255, 120, 40), 700, aim=(OVEN_X, 4.0, 0.3)),
        *_strips(),
    ]),
}
# The GLB is near its 2 MB with the atlases: the light maps go at 512² (the
# same layout as the AO, so just coarser; the light is soft anyway).
LIGHT_SIZE = 512
# ...and in steps of 4 (of 255), to fit with the GLB under 2 MB.
LIGHT_STEP = 4
# ...and the glow atlas at 512² (mostly flames, which the bloom softens).
GLOW_SIZE = 512


def lit(t, **k):
    return P.light(t, **k)


def metal(t):
    """Brushed stainless: fine horizontal grain, a sheen."""
    c = P.shade(t.c, P.lines(t.up + t.fwd * 0.3, 0.02, 0.004), 0.94)
    t.c = P.put(c, P.facing(t, (0.2, 0.5, 0.85), 0.8), (240, 244, 250), 0.35)
    return lit(t, lo=0.75, hi=1.1)


# Paint ------------------------------------------------------------------

def floor(t):
    """Black-and-white chequered lino, scuffed, darker to the back."""
    x, z = t.side, t.fwd
    check = (np.floor(x / 0.5) + np.floor(z / 0.5)) % 2 == 0
    c = np.where(check[:, None], np.array(FLOOR_A, float), np.array(FLOOR_B, float))
    for _ in range(14):
        cx, cz = t.rng.uniform(-8, 8), t.rng.uniform(-2.5, 6)
        c = P.shade(c, P.ellipse(x, z, cx, cz, t.rng.uniform(0.3, 1.0), t.rng.uniform(0.15, 0.4)), 0.9)
    for sx in (-1.5, 1.5):
        mark = ((np.abs(x - sx) < 0.04) & (np.abs(z) < 0.3)) | ((np.abs(z - 0.3) < 0.04) & (np.abs(x - sx) < 0.2))
        c = P.put(c, mark, (220, 60, 60))
    k = (1 + 0.2 * np.exp(-(x ** 2 / 20 + z ** 2 / 4))) * (1 - 0.3 * np.clip((-z - 1.5) / 1.5, 0, 1))
    return c * k[:, None]


def tiles(t):
    """White subway tiles, a red stripe at counter height."""
    x, u = t.side if abs(np.mean(t.n[:, 0])) < 0.5 else t.fwd, t.up
    row = np.floor(u / 0.15)
    c = P.put(t.c, P.lines(u, 0.15, 0.008) | P.lines(x + np.mod(row, 2) * 0.15, 0.3, 0.008), GROUT)
    c = P.put(c, (u > 1.18) & (u < 1.3), RED)
    k = 1 - 0.35 * np.clip((u - 3.5) / 2.0, 0, 1)
    return c * k[:, None]


def counter_front(t):
    """The counter's front: stainless doors with handles and a kick plate."""
    x, u = t.side, t.up
    front = t.n[:, 1] > 0.5
    c = P.shade(t.c, front & P.lines(x, 0.8, 0.012), 0.7)
    c = P.put(c, front & (np.abs(np.mod(x, 0.8) - 0.4) < 0.15) & (np.abs(u - 0.78) < 0.012), STEEL_DARK)
    c = P.shade(c, front & (u < 0.1), 0.5)
    t.c = c
    return metal(t)


def sign(t):
    """KITCHEN LIVE in cream on red, with a bulb border."""
    x, u = t.side - SIGN_X, t.up
    front = t.n[:, 1] > 0.5
    c = P.shade(t.c, ~front, 0.7)
    c = P.put(c, front & P.text(x, u, "KITCHEN", 0.42, 0.0, 3.86), CREAM)
    c = P.put(c, front & P.text(x, u, "LIVE", 0.3, 0.0, 3.46), (255, 220, 120))
    k = np.floor((x + 2.0) / 0.2)
    bulbs = (np.hypot(x - (-2.0 + (k + 0.5) * 0.2), np.minimum(np.abs(u - 4.38), np.abs(u - 3.32))) < 0.035)
    return P.put(c, front & bulbs, (255, 240, 180))


def flame(top):
    """Fire: deep red at the root, orange, yellow tips."""
    def paint(t):
        u = np.clip(t.up / top, 0, 1)
        stops = ((0.0, FLAME_ROOT), (0.35, FLAME), (0.8, FLAME_TIP), (1.0, (255, 250, 200)))
        return np.stack([np.interp(u, [s[0] for s in stops], [s[1][ch] for s in stops]) for ch in range(3)], axis=1)
    return paint


def smoke(t):
    c = P.shade(t.c, P.lines(t.side * 0.4 + t.up, 0.3, 0.06), 0.8)
    return c


def soot(t):
    return P.shade(t.c, P.lines(t.side + t.fwd, 0.21, 0.05), 0.8)


def oven_paint(t):
    """The oven's black enamel front, a chrome rail and dials."""
    x, u = t.side - OVEN_X, t.up
    front = t.n[:, 1] > 0.5
    c = t.c
    c = P.put(c, front & (u > OVEN_U1 - 0.22) & (u < OVEN_U1 - 0.04), (30, 30, 34))
    for k in range(5):
        c = P.put(c, front & (np.hypot(x - (-0.6 + 0.3 * k), u - (OVEN_U1 - 0.13)) < 0.05), (200, 200, 206))
    t.c = c
    return lit(t, lo=0.7)


def glow(t):
    """The open oven: white-hot at the back, orange to the edges."""
    x, u = t.side - OVEN_X, t.up - (OVEN_U0 + OVEN_U1 - 0.25) / 2
    r = np.hypot(x / 0.75, u / 0.5)
    stops = ((0.0, (255, 250, 210)), (0.5, (255, 190, 80)), (1.0, (230, 90, 20)))
    return np.stack([np.interp(r, [s[0] for s in stops], [s[1][ch] for s in stops]) for ch in range(3)], axis=1)


def halo(t):
    """Light pouring out over the scorched wall round the oven."""
    x, u = t.side - OVEN_X, t.up - (OVEN_U0 + OVEN_U1) / 2
    r = np.hypot(x / 1.6, u / 1.2)
    return P.put(t.c, np.clip(1 - r, 0, 1), GLOW, 0.8)


def pot_paint(t):
    c = P.put(t.c, P.facing(t, (0.2, 0.5, 0.85), 0.75), (250, 252, 255), 0.5)
    t.c = P.shade(c, P.lines(t.up, 0.08, 0.004), 0.85)
    return lit(t, lo=0.75)


def knives_paint(t):
    t.c = P.put(t.c, P.grain(t.side, t.up, 0.03, 0.006, 5.0), np.array(WOOD) * 0.8)
    return lit(t)


def tape(t):
    return P.shade(t.c, P.lines(t.side + t.fwd, 0.05, 0.02), 0.95)


# Pieces -----------------------------------------------------------------

def quad(p, name, x0, x1, u0, u1, f, colour, paint, mat=0):
    p.poly(name, [(x0, f, u0), (x1, f, u0), (x1, f, u1), (x0, f, u1)], colour, "set", (0, 1, 0), mat=mat, paint=paint)


def flat_poly(p, name, pts, colour, paint, mat=0, up=0.004):
    p.poly(name, [(x, f, up) for x, f in pts], colour, "set", (0, 0, 1), mat=mat, paint=paint)


def flames(p, name, x0, x1, f0, f1, top, n, rng, mat=0):
    """A bank of flame tongues over a patch of floor, up to `top` metres."""
    for k in range(n):
        x, f = rng.uniform(min(x0, x1), max(x0, x1)), rng.uniform(f0, f1)
        h = top * rng.uniform(0.45, 1.0)
        r = rng.uniform(0.18, 0.32)
        p.seg(f"{name}{k}", (x, f, 0.0), (x + rng.uniform(-0.1, 0.1), f + rng.uniform(-0.1, 0.1), h), r, 0.01, FLAME, "set",
              verts=5, mat=mat, paint=flame(top))


def build(make):
    def kitchen(p):
        p.poly("floor", [(-9.6, WALL_F, 0), (9.6, WALL_F, 0), (9.6, 9, 0), (-9.6, 9, 0)], FLOOR_A, "set", (0, 0, 1), paint=floor)
        quad(p, "wall", -6.6, 6.6, 0, 6.5, WALL_F, TILE, tiles)
        for s in (-1, 1):
            p.poly(f"sidewall{s}", [(s * 6.6, WALL_F, 0), (s * 6.6, 2.0, 0), (s * 6.6, 2.0, 6.5), (s * 6.6, WALL_F, 6.5)], TILE, "set", (-s, 0, 0), paint=tiles)
        # The long stainless counter, its hob and a sink.
        p.box("counter", (0, COUNTER_F, COUNTER_U / 2 - 0.02), (13.0, 0.8, COUNTER_U - 0.04), STEEL, "set", paint=counter_front)
        p.box("counter_top", (0, COUNTER_F, COUNTER_U - 0.02), (13.1, 0.86, 0.04), STEEL, "set", paint=metal)
        for k, cx in enumerate((-1.2, 1.2)):
            def hob_paint(t, cx=cx):
                x, z = t.side - cx, t.fwd - COUNTER_F
                c = t.c
                for bx in (-0.25, 0.25):
                    for bz in (-0.15, 0.15):
                        d = np.hypot(x - bx, z - bz)
                        c = P.put(c, P.lines(d, 0.05, 0.012) & (d < 0.12), (90, 90, 96))
                return c
            p.box(f"hob{k}", (cx, COUNTER_F, COUNTER_U + 0.005), (0.9, 0.6, 0.01), HOB, "set", paint=hob_paint)
        p.box("sink", (4.6, COUNTER_F, COUNTER_U + 0.002), (0.8, 0.5, 0.01), STEEL_DARK, "set", paint=metal)
        p.seg("tap", (4.6, COUNTER_F - 0.3, COUNTER_U), (4.6, COUNTER_F - 0.15, COUNTER_U + 0.35), 0.02, 0.02, STEEL, "set", verts=6, paint=metal)
        # The extractor hood, off to the left over the hob.
        hood = [(x, f, u) for x, f, u in ((-1.0, -2.95, 2.3), (1.0, -2.95, 2.3), (-1.0, -1.4, 2.3), (1.0, -1.4, 2.3),
                                          (-0.4, -2.95, 3.0), (0.4, -2.95, 3.0), (-0.4, -2.5, 3.0), (0.4, -2.5, 3.0))]
        p.hull("hood", [(x - 1.2, f, u) for x, f, u in hood], STEEL, "set", paint=metal)
        p.box("hood_flue", (-1.2, -2.75, 4.6), (0.6, 0.4, 3.2), STEEL, "set", paint=metal)
        # The light under the hood, over the hob.
        p.box("hood_light", (-1.2, -2.2, 2.29), (1.4, 0.6, 0.02), (255, 238, 204), "set")

    def prep(p):
        rng = np.random.default_rng(3)
        for k, (x0, x1) in enumerate(((2.2, 5.6), (-5.6, -3.2))):
            for j, u in enumerate((1.75, 2.35)):
                p.box(f"shelf{k}{j}", ((x0 + x1) / 2, WALL_F + 0.14, u), (x1 - x0, 0.26, 0.04), WOOD, "set", paint=knives_paint)
                x = x0 + 0.15
                while x < x1 - 0.15:
                    h, r = rng.uniform(0.14, 0.3), rng.uniform(0.05, 0.08)
                    col = JARS[int(rng.integers(len(JARS)))]
                    p.seg(f"jar{k}{j}_{x:.2f}", (x, WALL_F + 0.14, u + 0.02), (x, WALL_F + 0.14, u + 0.02 + h), r, r, col, "set", verts=6, paint=lambda t: lit(t, lo=0.8))
                    p.seg(f"lid{k}{j}_{x:.2f}", (x, WALL_F + 0.14, u + 0.02 + h), (x, WALL_F + 0.14, u + 0.05 + h), r * 1.05, r * 1.05, (200, 180, 120), "set", verts=6)
                    x += r * 2 + rng.uniform(0.04, 0.12)
        p.box("sign", (SIGN_X, WALL_F + 0.08, 3.85), (4.3, 0.1, 1.25), RED, "set", paint=sign)

    def grease(p):
        rng = np.random.default_rng(7)
        for s in (-1, 1):
            # A wall of flame 0.6 m deep and 3.2 m tall, from the back wall to fwd = 1.
            flames(p, f"wall{s}_", s * 4.5, s * 5.1, -3.0, 1.0, 3.2, 34, rng)
            p.box(f"embers{s}", (s * 4.8, -1.0, 0.02), (0.8, 4.0, 0.04), (120, 30, 10), "set", paint=lambda t: t.c)
            flat_poly(p, f"scorch_counter{s}", [(s * 3.8, COUNTER_F - 0.4), (s * 6.5, COUNTER_F - 0.4), (s * 6.5, COUNTER_F + 0.4), (s * 3.8, COUNTER_F + 0.4)],
                      SOOT, soot, up=COUNTER_U + 0.01)
        for k in range(10):
            x = -6 + 12 * k / 9 + rng.uniform(-0.4, 0.4)
            p.blob(f"smoke{k}", (x, rng.uniform(-2.6, -0.5), rng.uniform(4.6, 5.6)), (rng.uniform(1.0, 1.6), rng.uniform(0.6, 1.0), rng.uniform(0.3, 0.5)),
                   SMOKE, "set", paint=smoke)

    def oven(p):
        rng = np.random.default_rng(9)
        # The scorching: soot over the wall, the counter and the floor.
        for k in range(12):
            cx, cu = rng.uniform(-6, 6), rng.uniform(0.8, 5.0)
            r = rng.uniform(0.6, 1.4)
            p.poly(f"soot_wall{k}", [(cx + r * math.cos(a), WALL_F + 0.02 + 0.001 * k, cu + r * 0.7 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 9)[:-1]],
                   SOOT, "set", (0, 1, 0), paint=soot)
        for k in range(10):
            cx, cf = rng.uniform(-6, 6), rng.uniform(-1.1, 3.0)
            r = rng.uniform(0.4, 1.0)
            flat_poly(p, f"soot_floor{k}", [(cx + r * math.cos(a), cf + r * 0.6 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 9)[:-1]], SOOT, soot, up=0.003 + 0.0002 * k)
        flat_poly(p, "soot_counter", [(-6.5, COUNTER_F - 0.42), (6.5, COUNTER_F - 0.42), (6.5, COUNTER_F + 0.42), (-6.5, COUNTER_F + 0.42)], SOOT, soot, up=COUNTER_U + 0.012)
        # The big oven, set into the wall above the counter, its door hanging
        # open toward the camera and the glow pouring out.
        cu = (OVEN_U0 + OVEN_U1) / 2
        p.poly("oven_halo", [(OVEN_X + 1.9 * math.cos(a), WALL_F + 0.03, cu + 1.4 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 17)[:-1]],
               SOOT, "set", (0, 1, 0), paint=halo)
        hw = OVEN_W / 2
        p.box("oven_top", (OVEN_X, WALL_F + 0.3, OVEN_U1 - 0.12), (OVEN_W + 0.1, 0.6, 0.26), OVEN, "set", paint=oven_paint)
        for s in (-1, 1):
            p.box(f"oven_side{s}", (OVEN_X + s * (hw - 0.04), WALL_F + 0.3, (OVEN_U0 + OVEN_U1) / 2), (0.1, 0.6, OVEN_U1 - OVEN_U0), OVEN, "set", paint=oven_paint)
        p.box("oven_floor", (OVEN_X, WALL_F + 0.3, OVEN_U0 + 0.03), (OVEN_W, 0.6, 0.06), OVEN, "set", paint=oven_paint)
        quad(p, "oven_glow", OVEN_X - hw + 0.08, OVEN_X + hw - 0.08, OVEN_U0 + 0.06, OVEN_U1 - 0.25, WALL_F + 0.05, GLOW, glow)
        # The door, hinged at the bottom front edge, dropped open over the
        # counter and sagging off its hinge.
        f0, u0 = WALL_F + 0.6, OVEN_U0
        d = 0.6
        tip_f, tip_u = f0 + d * math.cos(math.radians(14)), u0 - d * math.sin(math.radians(14))
        p.hull("oven_door", [(OVEN_X + sx * hw, f + df, u) for sx in (-1, 1) for (f, u) in ((f0, u0), (tip_f, tip_u)) for df in (0, 0.05)], OVEN, "set", paint=lit)
        p.seg("oven_handle", (OVEN_X - hw * 0.7, tip_f + 0.1, tip_u + 0.05), (OVEN_X + hw * 0.7, tip_f + 0.1, tip_u + 0.05), 0.02, 0.02, STEEL, "set", verts=6, paint=metal)

    def pot(p):
        p.seg("pot", (0, 0, 0.0), (0, 0, 0.4), 0.25, 0.25, POT, "set", verts=12, mat=1, paint=pot_paint)
        p.seg("pot_lid", (0, 0, 0.4), (0, 0, 0.425), 0.262, 0.24, POT, "set", verts=12, mat=1, paint=pot_paint)
        p.seg("pot_knob", (0, 0, 0.425), (0, 0, 0.45), 0.03, 0.035, (30, 30, 34), "set", verts=6, mat=1)
        for s in (-1, 1):
            p.box(f"pot_handle{s}", (s * 0.27, 0, 0.32), (0.05, 0.1, 0.03), STEEL_DARK, "set", mat=1, paint=metal)

    def knives(p):
        # A slanted wooden block, its handles sticking up out of the top.
        block = [(x, f, u) for x in (-0.15, 0.15) for f, u in ((-0.1, 0.0), (0.1, 0.0), (-0.1, 0.36), (0.02, 0.36))]
        p.hull("block", block, WOOD, "set", mat=1, paint=knives_paint)
        for k, x in enumerate((-0.1, -0.035, 0.035, 0.1)):
            p.seg(f"handle{k}", (x, -0.05, 0.33), (x, -0.08, 0.48 - 0.02 * (k % 2)), 0.016, 0.016, (24, 24, 28), "set", verts=6, mat=1, paint=lit)

    def flare(p):
        rng = np.random.default_rng(13)
        flames(p, "flare", -0.5, 0.5, -0.4, 0.4, 2.2, 14, rng, mat=1)

    def mark(p):
        for k, a in enumerate((math.pi / 4, -math.pi / 4)):
            ca, sa = math.cos(a), math.sin(a)
            pts = [(sx * 0.6 * ca - sw * 0.06 * sa, sx * 0.6 * sa + sw * 0.06 * ca) for sx, sw in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
            flat_poly(p, f"tape{k}", pts, TAPE, tape, mat=1, up=0.003 + 0.001 * k)

    make("set", kitchen)
    make("seg_prep", prep)
    make("seg_grease", grease)
    make("seg_oven", oven)
    make("prop_pot", pot, at=(-3, COUNTER_F, COUNTER_U))
    make("prop_knives", knives, at=(3, COUNTER_F, COUNTER_U))
    make("fg_left", lambda p: fg.camera(p, "fg_cam", 1), at=(-6.2, 3.0, 0))
    make("fg_right", lambda p: fg.cue_cards(p, "fg_cards", -1), at=(6.2, 3.0, 0))
    make("fg_top", lambda p: fg.hood_edge(p, "fg_hood"), at=(-3.0, 2.0, 5.0))
    make("fx_flare", flare)
    make("fx_mark", mark)

