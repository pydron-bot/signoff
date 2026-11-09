"""Feel the Burn at Dawn: Rox's aerobics show, a 1987 studio at sunrise, in
three segments (docs/DESIGN.md): Warm-Up, Double Time (the tape runs fast)
and Burnout (the mirrors shatter and the room opens into the dark). Built by
lib/stage.py; positions are (x, fwd, up) in stage space, as for Weather. The
fighters fight on fwd = 0 in front of the mirror wall at fwd = −3.9; the
side walls stand at x = ±6.4 until Burnout, which opens the floor to the
drapes at ±8.4.

Objects (the game shows them by segment and places the props and effects):
- `set`: what stays all round: the sprung floor and its mats, the wall with
  its windows' frames above the mirrors, the ceiling rig
- `seg_warmup`: the mirrors and barre, the side walls with speakers, the
  neon sign, the dawn in the windows (segments 1 and 2)
- `seg_double`: over that, the chase lights, the DOUBLE TIME panel, the
  risen sun (segment 2)
- `seg_burnout`: the broken mirrors, glass on the floor, black windows, the
  dead sign and the drapes (segment 3, with `seg_warmup` hidden)
- `prop_boombox`: the throwable boombox, origin at its bottom centre, at
  x = 0, fwd = −0.3
- `fx_shard`, `fx_shatter`, `fx_mark`: the falling mirror shard (its point
  at the origin), broken glass, the tape cross; placed by the game
"""
import math

import numpy as np

from lib import paint as P

ID = "burn"
DENSE = ("sign", "double_sign", "dead_sign")

BOARDS = (150, 98, 58)
MAT = (46, 92, 168)
WALL = (150, 96, 122)
CONCRETE = (58, 52, 60)
TRIM = (232, 222, 214)
MIRROR = (176, 190, 204)
ALU = (186, 188, 196)
WOOD = (196, 150, 96)
SIDE = (118, 74, 104)
TOLEX = (24, 24, 28)
BOARD = (26, 16, 30)
PINK = (255, 70, 168)
CYAN = (64, 224, 255)
YELLOW = (255, 214, 80)
ORANGE = (255, 140, 60)
GLASS = (168, 186, 206)
DRAPE = (22, 18, 28)
TAPE = (238, 236, 226)
SILVER = (172, 174, 182)
RUBBER = (26, 26, 30)

# The mirror wall: eight panels between nine posts, and the windows above.
WALL_F = -4.0
MIRROR_F = -3.9
MIRROR_X = [-8.0 + 2.0 * i for i in range(9)]
MIRROR_U0, MIRROR_U1 = 0.12, 3.0
WIN_X = (-6.0, -3.0, 0.0, 3.0, 6.0)
WIN_W = 2.3
WIN_U0, WIN_U1 = 3.95, 6.85
SIGN_U = 3.47
# The sign's lettering: (text, height, centre x, baseline).
SIGN_LINES = (("FEEL THE BURN", 0.3, 0.0, 3.55), ("AT DAWN", 0.22, 0.0, 3.17))

# Light rig per segment, for the game (three.js space: x, y up, z toward
# the camera). Written to the `lights` node's extras; see BLENDER-TODO.
LIGHTS = [
    {"segment": "Warm-Up", "background": "#1a0c14",
     "ambient": {"color": "#ffe6d8", "intensity": 1.3},
     "key": {"color": "#ffc890", "intensity": 2.0, "position": [-4, 5, 8]},
     "rim": {"color": "#ff7ab0", "intensity": 0.7, "position": [3, 4, -4]}},
    {"segment": "Double Time", "background": "#140a10",
     "ambient": {"color": "#fff0e0", "intensity": 1.5},
     "key": {"color": "#ffffff", "intensity": 2.4, "position": [3, 7, 7]},
     "rim": {"color": "#40e0ff", "intensity": 0.9, "position": [-3, 5, -4]}},
    {"segment": "Burnout", "background": "#020206",
     "ambient": {"color": "#6a5a9a", "intensity": 0.6},
     "key": {"color": "#c8b8ff", "intensity": 1.4, "position": [0, 8, 6]},
     "rim": {"color": "#ff4a8a", "intensity": 0.6, "position": [0, 3, -6]}},
]


def lit(t, **k):
    return P.light(t, **k)


def mix(a, b, k):
    return tuple(int(x + (y - x) * k) for x, y in zip(a, b))


def ramp(v, stops):
    """Colours along v through (position, colour) stops, per texel."""
    xs = [s[0] for s in stops]
    return np.stack([np.interp(v, xs, [s[1][ch] for s in stops]) for ch in range(3)], axis=1)


# Paint ------------------------------------------------------------------

def floor(t):
    """The sprung maple floor: boards along the stage with staggered joints
    and a tone per board, the show's sunrise painted in front, tape marks
    where the fighters start, varnish catching the light in the middle; it
    darkens toward the back and out past the walls into Burnout's dark."""
    x, z = t.side, t.fwd
    row = np.floor(z / 0.2)
    tone = 0.93 + 0.12 * np.mod(np.sin(row * 12.9898) * 43758.5453, 1.0)
    c = t.c * tone[:, None]
    c = P.shade(c, P.lines(z, 0.2, 0.014), 0.7)
    c = P.shade(c, P.lines(x + np.mod(row * 0.83, 2.4), 2.4, 0.014), 0.72)
    c = P.shade(c, P.grain(z * 1.0, x, 0.07, 0.02, 0.9), 0.94)
    # The logo: a half sun on the horizon, rays, faded pink paint.
    r, a = np.hypot(x, z - 1.9), np.arctan2(-(z - 1.9), x)
    sun = (r < 0.9) & (z < 1.9)
    rays = (r > 1.05) & (r < 1.6) & (z < 1.9) & (np.mod(a + 0.13, math.pi / 9) < 0.13)
    c = P.put(c, sun | rays, (214, 92, 124), 0.55)
    c = P.put(c, (np.abs(z - 1.9) < 0.03) & (np.abs(x) < 1.8), (214, 92, 124), 0.55)
    for sx in (-1.5, 1.5):
        mark = ((np.abs(x - sx) < 0.04) & (np.abs(z) < 0.3)) | ((np.abs(z - 0.3) < 0.04) & (np.abs(x - sx) < 0.2))
        c = P.put(c, mark, (240, 110, 170))
    for _ in range(14):
        cx, cz = t.rng.uniform(-8, 8), t.rng.uniform(-3, 6)
        c = P.shade(c, P.ellipse(x, z, cx, cz, t.rng.uniform(0.4, 1.2), t.rng.uniform(0.15, 0.4)), 0.92)
    k = (1 + 0.25 * np.exp(-(x ** 2 / 24 + z ** 2 / 5))
         - 0.3 * np.clip((-z - 2.8) / 1.2, 0, 1)) * (1 - 0.8 * np.clip((np.abs(x) - 6.6) / 2.4, 0, 1))
    return c * k[:, None]


def mat_paint(t):
    """A blue vinyl exercise mat: four fold panels, lighter piping."""
    x, z = t.side, t.fwd
    c = P.shade(t.c, P.lines(x + 0.8, 0.4, 0.02), 0.72)
    top = t.n[:, 2] > 0.5
    edge = top & ((np.abs(np.mod(x + 0.8, 2.0) - 0.0) < 0.03) | (np.abs(np.mod(x + 0.8, 2.0) - 1.6) < 0.03)
                  | (np.abs(z + 2.2) > 0.42))
    c = P.put(c, edge, (120, 160, 220))
    t.c = c
    return lit(t, lo=0.75)


def in_window(x, u, pad=0.0):
    w = np.zeros(x.shape, dtype=bool)
    for cx in WIN_X:
        w |= (np.abs(x - cx) < WIN_W / 2 + pad) & (u > WIN_U0 - pad) & (u < WIN_U1 + pad)
    return w


def wall(t):
    """The back wall: bare concrete behind the mirrors (seen once they're
    gone), mauve plaster above with a stripe, white frames round the windows,
    darkening up into the ceiling."""
    x, u = t.side, t.up
    c = np.empty_like(t.c)
    c[:] = WALL
    low = u < MIRROR_U1 + 0.1
    c = P.put(c, low, CONCRETE)
    c = P.shade(c, low & P.lines(x, 1.2, 0.03), 0.75)
    for _ in range(8):
        cx, cu = t.rng.uniform(-9, 9), t.rng.uniform(0.2, 0.9)
        c = P.shade(c, low & P.ellipse(x, u, cx, cu, t.rng.uniform(0.4, 1.0), t.rng.uniform(0.15, 0.35)), 0.94)
    for k, (u0, col) in enumerate(((3.12, PINK), (3.2, ORANGE), (3.28, YELLOW))):
        c = P.put(c, (u > u0) & (u < u0 + 0.05) & ~in_window(x, u, 0.12), col, 0.7)
    c = P.put(c, in_window(x, u, 0.12) & ~in_window(x, u), TRIM)
    k = 1 - 0.45 * np.clip((u - 7.0) / 1.5, 0, 1)
    return c * k[:, None]


def muntins(c, x, u, cx, colour):
    lx = x - cx
    bars = (np.abs(lx) < 0.035) | (np.abs(u - (WIN_U0 + WIN_U1) / 2) < 0.035)
    bars |= (np.abs(lx) > WIN_W / 2 - 0.05) | (u < WIN_U0 + 0.05) | (u > WIN_U1 - 0.05)
    return P.put(c, bars, colour)


def skyline(x, u, cx):
    """Rooftops along the bottom of a window: blocky heights by column."""
    col = np.floor((x + 20) / 0.32)
    h = 0.12 + 0.34 * np.mod(np.sin(col * 7.31 + cx) * 9187.3, 1.0) ** 2
    tower = np.mod(col, 11) == 4
    return (u - WIN_U0) < np.where(tower, h + 0.35, h)


def pane(stops, sun, roofs, frame, stars=False):
    """A window: the sky as a ramp up the pane, a sun (x, u, radius, colour),
    rooftops and muntins."""
    def paint(t):
        x, u = t.side, t.up
        c = ramp((u - WIN_U0) / (WIN_U1 - WIN_U0), stops)
        if sun:
            sx, su, sr, scol = sun
            d = np.hypot(x - sx, u - su)
            c = P.put(c, np.clip(1 - (d - sr) / (sr * 2.5), 0, 1) * (d > sr), scol, 0.45)
            c = P.put(c, d < sr, scol)
        if stars:
            for _ in range(10):
                c = P.put(c, P.ellipse(x, u, t.rng.uniform(-7.2, 7.2), t.rng.uniform(5.0, 6.7), 0.025, 0.025), (150, 150, 180))
        cx = WIN_X[int(np.argmin([abs(np.mean(x) - w) for w in WIN_X]))]
        c = P.put(c, skyline(x, u, cx), roofs)
        return muntins(c, x, u, cx, frame)
    return paint


def mirror(x0, x1):
    """A painted mirror panel: pale blue-grey, the floor's warm brown in its
    lower edge, the dark room behind the camera in the middle, two soft
    diagonal streaks and a bevelled edge."""
    def paint(t):
        x, u = t.side, t.up
        c = np.empty_like(t.c)
        c[:] = MIRROR
        c = P.put(c, np.clip((0.75 - u) / 0.5, 0, 1), (150, 118, 100), 0.6)
        c = P.put(c, (u > 0.42) & (u < 0.56), (90, 120, 170), 0.35)
        c = P.shade(c, np.exp(-((u - 1.8) ** 2) / 0.5) > 0.5, 0.9)
        d = x * 0.55 + u
        for period, width, alpha in ((5.3, 0.18, 0.4), (3.7, 0.06, 0.3)):
            s = np.mod(d, period) - period / 2
            c = P.put(c, np.exp(-(s ** 2) / (width ** 2)), (250, 252, 255), alpha)
        bevel = (x - x0 < 0.05) | (x1 - x < 0.05) | (u - MIRROR_U0 < 0.05) | (MIRROR_U1 - u < 0.05)
        return P.put(c, bevel, (214, 224, 234))
    return paint


def broken_glass(t):
    """A jagged remnant of mirror, darkened, with crack lines."""
    x, u = t.side, t.up
    c = np.empty_like(t.c)
    c[:] = (74, 84, 102)
    c = P.put(c, P.lines(x * 0.8 + u * 0.6, 0.37, 0.012) | P.lines(x * -0.5 + u, 0.53, 0.012), (170, 182, 200), 0.8)
    s = np.mod(x * 0.55 + u, 4.1) - 2.0
    return P.put(c, np.exp(-(s ** 2) / 0.04), (190, 200, 220), 0.35)


def floor_glass(t):
    c = P.put(t.c, P.lines(t.side + t.fwd * 0.7, 0.23, 0.02), (226, 236, 248), 0.6)
    return lit(t, lo=0.9, hi=1.1)


def metal(t):
    return lit(t, lo=0.7, hi=1.1)


def wood(t):
    t.c = P.put(t.c, P.grain(t.side, t.up, 0.05, 0.01, 3.0), np.array(t.c[0]) * 0.82)
    return lit(t)


def side_wall(t):
    """A side wall: the inner face in mauve plaster with three slanting
    sunrise stripes and a dark skirting; the front edge dark."""
    x, z, u = t.side, t.fwd, t.up
    sign = np.sign(x)
    inner = -t.n[:, 0] * sign > 0.5
    c = P.shade(t.c, inner & (u < 0.3), 0.55)
    slope = u - 0.12 * (z + 1.5)
    for k, col in enumerate((PINK, ORANGE, YELLOW)):
        c = P.put(c, inner & (np.abs(slope - 2.2 - 0.26 * k) < 0.09), col, 0.85)
    c = P.put(c, ~inner, (44, 30, 40))
    t.c = c
    return lit(t, lo=0.75)


def speaker(cx, cu, r):
    """A speaker cabinet in black tolex: a woofer on the front, grey rim, cone
    and dust cap, and a little silver badge."""
    def paint(t):
        x, u = t.side, t.up
        front = t.n[:, 1] > 0.5
        d = np.hypot(x - cx, u - cu)
        c = P.put(t.c, front & (d < r), (92, 92, 100))
        c = P.put(c, front & (d < r * 0.88), (46, 46, 52))
        c = P.put(c, front & P.lines(d, r * 0.18, r * 0.03), (62, 62, 70))
        c = P.put(c, front & (d < r * 0.25), (30, 30, 34))
        badge = front & (np.abs(x - cx) < 0.08) & (np.abs(u - (cu - r - 0.06)) < 0.025)
        c = P.put(c, badge, (200, 200, 210))
        t.c = c
        return lit(t, lo=0.7)
    return paint


def neon_mask(x, u, lines, grow=0.0):
    m = np.zeros(x.shape, dtype=bool)
    offs = [(0.0, 0.0)] if grow == 0 else [(dx, du) for dx in (-grow, 0, grow) for du in (-grow, 0, grow)]
    for s, h, u0, v0, *centred in lines:
        for dx, du in offs:
            m |= P.text(x - dx, u - du, s, h, u0, v0, centred[0] if centred else True)
    return m


def neon(lines, tube, dead=None, lit_lines=None):
    """A neon sign on a dark board: tubes in the 5×7 font with a pale core and
    a halo. `dead` paints `lines` as unlit grey tubes and lights only
    `lit_lines` (Burnout: only BURN still on)."""
    def glow(x, u, c, ls, colour):
        c = P.put(c, neon_mask(x, u, ls, 0.06), colour, 0.3)
        c = P.put(c, neon_mask(x, u, ls, 0.014), colour)
        return P.put(c, neon_mask(x, u, ls), mix(colour, (255, 255, 255), 0.55))

    def paint(t):
        x, u = t.side, t.up
        front = t.n[:, 1] > 0.5
        c = P.shade(t.c, ~front, 0.7)
        c = P.put(c, front & ((np.abs(np.abs(x) - 1.9) < 0.04) & (np.abs(u - SIGN_U) < 0.38)), (60, 50, 66))
        if dead is not None:
            c = P.put(c, front & neon_mask(x, u, lines, 0.014), dead)
            if lit_lines:
                c = np.where(front[:, None], glow(x, u, c, lit_lines, tube), c)
        else:
            c = np.where(front[:, None], glow(x, u, c, lines, tube), c)
        return c
    return paint


def chase(t):
    """The chase-light strip: bulbs every 30 cm in yellow, pink and cyan."""
    x, u = t.side, t.up
    front = t.n[:, 1] > 0.5
    k = np.floor((x + 8.1) / 0.3)
    cx = -8.1 + (k + 0.5) * 0.3
    d = np.hypot(x - cx, u - 3.06)
    c = t.c
    for i, col in enumerate((YELLOW, PINK, CYAN)):
        sel = front & (np.mod(k, 3) == i)
        c = P.put(c, sel & (d < 0.05), col)
        c = P.put(c, sel & (d < 0.022), (255, 255, 240))
    return c


def boombox(t):
    """The boombox's front: two woofers with chrome rings, twin cassette decks
    with reels, a tuning dial and a row of keys on top; brushed silver."""
    x, z, u = t.side, t.fwd, t.up
    front = t.n[:, 1] > 0.5
    top = t.n[:, 2] > 0.5
    c = P.put(t.c, P.lines(u, 0.012, 0.004), np.array(SILVER) * 0.92)
    for sx in (-0.19, 0.19):
        d = np.hypot(x - sx, u - 0.14)
        c = P.put(c, front & (d < 0.105), (210, 212, 222))
        c = P.put(c, front & (d < 0.09), (34, 34, 40))
        c = P.put(c, front & (d < 0.09) & P.lines(d, 0.022, 0.006), (64, 64, 72))
    for dx in (-0.055, 0.055):
        deck = front & (np.abs(x - dx) < 0.045) & (np.abs(u - 0.12) < 0.04)
        c = P.put(c, deck, (40, 34, 30))
        for rx in (-0.02, 0.02):
            c = P.put(c, deck & (np.hypot(x - dx - rx, u - 0.125) < 0.012), (200, 190, 170))
    dial = front & (np.abs(x) < 0.1) & (np.abs(u - 0.225) < 0.022)
    c = P.put(c, dial, (30, 26, 24))
    c = P.put(c, dial & P.lines(x, 0.02, 0.004), ORANGE)
    c = P.put(c, dial & (np.abs(x - 0.03) < 0.003), (255, 60, 50))
    keys = top & (np.abs(x) < 0.12) & (np.abs(z) < 0.04)
    c = P.put(c, keys & P.lines(x + 0.12, 0.03, 0.022), (40, 40, 46))
    t.c = c
    return lit(t, lo=0.78)


def shard_paint(t):
    """Mirror glass: pale and bright, a streak across, brighter to the point."""
    x, u = t.side, t.up
    c = ramp(u / 1.2, ((0, (236, 244, 255)), (1, (176, 196, 222))))
    s = np.mod(x * 0.8 + u, 0.9) - 0.45
    return P.put(c, np.exp(-(s ** 2) / 0.01), (255, 255, 255), 0.5)


def tape(t):
    """Gaffer tape: matte off-white, a faint weave."""
    c = P.shade(t.c, P.lines(t.side + t.fwd, 0.05, 0.02), 0.95)
    return c


# Pieces -----------------------------------------------------------------

def quad(p, name, x0, x1, u0, u1, f, colour, paint, mat=0):
    """An upright rectangle facing the camera at fwd = f."""
    p.poly(name, [(x0, f, u0), (x1, f, u0), (x1, f, u1), (x0, f, u1)], colour, "set", (0, 1, 0), mat=mat, paint=paint)


def panes(p, name, f, paint):
    for k, cx in enumerate(WIN_X):
        quad(p, f"{name}{k}", cx - WIN_W / 2, cx + WIN_W / 2, WIN_U0, WIN_U1, f, (0, 0, 0), paint)


def frames(p, name, colour, bent=()):
    """The mirror wall's aluminium frame: nine posts and two rails (posts in
    `bent` are knocked askew, for Burnout)."""
    for i, x in enumerate(MIRROR_X):
        top = (x + (0.25 if i in bent else 0), MIRROR_F + 0.03 + (0.12 if i in bent else 0), MIRROR_U1)
        p.seg(f"{name}_post{i}", (x, MIRROR_F + 0.03, MIRROR_U0 - 0.05), top, 0.04, 0.04, colour, "set", verts=4, spin=math.pi / 4, paint=metal)
    for k, u in enumerate((MIRROR_U0 - 0.03, MIRROR_U1 + 0.02)):
        p.box(f"{name}_rail{k}", (0, MIRROR_F + 0.03, u), (16.1, 0.06, 0.07), colour, "set", paint=metal)


def sign_board(p, name, f, paint):
    p.box(name, (0, f, SIGN_U), (4.1, 0.08, 0.85), BOARD, "set", paint=paint)
    for s in (-1, 1):
        p.seg(f"{name}_hang{s}", (s * 1.6, f, SIGN_U + 0.42), (s * 1.6, f, WIN_U0 - 0.02), 0.008, 0.008, ALU, "set", verts=4)


def flat_poly(p, name, pts, colour, paint, mat=0, up=0.004, facing=(0, 0, 1)):
    p.poly(name, [(x, f, up) for x, f in pts], colour, "set", facing, mat=mat, paint=paint)


def shard_pts(rng, cx, cf, r):
    a0 = rng.uniform(0, 2 * math.pi)
    return [(cx + r * rng.uniform(0.5, 1.0) * math.cos(a0 + k * 2.1 + rng.uniform(-0.3, 0.3)),
             cf + r * rng.uniform(0.5, 1.0) * math.sin(a0 + k * 2.1 + rng.uniform(-0.3, 0.3))) for k in range(3)]


def build(make):
    def studio(p):
        p.poly("floor", [(-9.6, -4, 0), (9.6, -4, 0), (9.6, 9, 0), (-9.6, 9, 0)], BOARDS, "set", (0, 0, 1), paint=floor)
        for k, x in enumerate((-6, -4, -2, 0, 2, 4, 6)):
            p.box(f"mat{k}", (x, -2.2, 0.02), (1.6, 0.9, 0.04), MAT, "set", paint=mat_paint)
        quad(p, "wall", -10, 10, 0, 8.5, WALL_F - 0.02, WALL, wall)
        for k, cx in enumerate(WIN_X):
            p.box(f"sill{k}", (cx, WALL_F + 0.06, WIN_U0 - 0.1), (WIN_W + 0.3, 0.14, 0.06), TRIM, "set", paint=metal)
        # The ceiling rig: two pipes and a row of cans aimed at the floor.
        for k, f in enumerate((-3.2, -1.2)):
            p.seg(f"pipe{k}", (-9.5, f, 7.4), (9.5, f, 7.4), 0.05, 0.05, (60, 60, 66), "set", verts=6, paint=metal)
        for k, x in enumerate((-6, -3.6, -1.2, 1.2, 3.6, 6)):
            p.seg(f"can{k}", (x, -1.2, 7.3), (x * 0.95, -0.9, 6.95), 0.13, 0.15, RUBBER, "set", verts=8, paint=metal)

    def warmup(p):
        for i in range(8):
            x0, x1 = MIRROR_X[i], MIRROR_X[i + 1]
            quad(p, f"mirror{i}", x0, x1, MIRROR_U0, MIRROR_U1, MIRROR_F, MIRROR, mirror(x0, x1))
        frames(p, "frame", ALU)
        p.seg("barre", (-8, -3.55, 1.0), (8, -3.55, 1.0), 0.03, 0.03, WOOD, "set", verts=8, paint=wood)
        for k, x in enumerate((-7, -3.5, 0, 3.5, 7)):
            p.seg(f"bracket{k}", (x, MIRROR_F + 0.03, 1.0), (x, -3.55, 1.0), 0.015, 0.015, ALU, "set", verts=4, paint=metal)
        sign_board(p, "sign", -3.84, neon(SIGN_LINES, PINK))
        panes(p, "dawn", WALL_F + 0.01, pane(((0, (255, 168, 104)), (0.35, (242, 118, 132)), (1, (104, 66, 136))),
                                          (-3.0, 4.2, 0.42, (255, 224, 156)), (70, 34, 62), (226, 214, 208)))
        for s in (-1, 1):
            p.box(f"sidewall{s}", (s * 6.4, -1.5, 2.5), (0.8, 5.0, 5.0), SIDE, "set", paint=side_wall)
            x = s * 5.55
            p.box(f"cab_low{s}", (x, -3.0, 0.45), (0.8, 0.6, 0.9), TOLEX, "set", paint=speaker(x, 0.47, 0.3))
            p.box(f"cab_high{s}", (x, -3.0, 1.25), (0.7, 0.55, 0.7), TOLEX, "set", paint=speaker(x, 1.28, 0.22))
            p.box(f"horn{s}", (x, -3.0, 1.73), (0.5, 0.4, 0.26), TOLEX, "set", paint=speaker(x, 1.73, 0.08))

    def double(p):
        p.box("chase", (0, -3.8, 3.06), (16.2, 0.06, 0.12), BOARD, "set", paint=chase)
        sign_board(p, "double_sign", -3.76, neon((("DOUBLE TIME", 0.32, 0.0, 3.52), ("132 BPM", 0.2, 0.0, 3.17)), CYAN))
        panes(p, "morning", WALL_F + 0.02, pane(((0, (255, 226, 170)), (0.4, (226, 220, 210)), (1, (150, 196, 236))),
                                             (3.0, 6.1, 0.34, (255, 250, 226)), (150, 112, 132), (240, 234, 228)))

    def burnout(p):
        rng = np.random.default_rng(11)
        frames(p, "frame_broken", (104, 104, 112), bent=(2, 6))
        for i in range(8):
            x0, x1 = MIRROR_X[i] + 0.04, MIRROR_X[i + 1] - 0.04
            # Jagged pieces left in the corners of each panel.
            a = rng.uniform(0.4, 1.0)
            p.poly(f"remnant{i}a", [(x0, MIRROR_F, MIRROR_U0), (x0 + a, MIRROR_F, MIRROR_U0), (x0 + a * 0.3, MIRROR_F, MIRROR_U0 + 0.4),
                                    (x0, MIRROR_F, MIRROR_U0 + rng.uniform(0.7, 1.6))], GLASS, "set", (0, 1, 0), paint=broken_glass)
            b = rng.uniform(0.3, 0.9)
            p.poly(f"remnant{i}b", [(x1, MIRROR_F, MIRROR_U1), (x1 - b, MIRROR_F, MIRROR_U1), (x1 - b * 0.4, MIRROR_F, MIRROR_U1 - 0.3),
                                    (x1, MIRROR_F, MIRROR_U1 - rng.uniform(0.5, 1.3))], GLASS, "set", (0, 1, 0), paint=broken_glass)
        for k in range(46):
            near = k < 30
            cx = rng.uniform(-8, 8)
            cf = rng.uniform(-3.8, -2.8) if near else rng.uniform(-1.6, 1.4)
            flat_poly(p, f"glass{k}", shard_pts(rng, cx, cf, rng.uniform(0.06, 0.18)), GLASS, floor_glass)
        panes(p, "night", WALL_F + 0.01, pane(((0, (16, 14, 26)), (1, (6, 6, 12))), None, (2, 2, 4), (40, 38, 46), stars=True))
        burn_u0 = -(13 * 6 * 0.3 / 7 - 0.3 / 7) / 2 + 9 * 6 * 0.3 / 7
        sign_board(p, "dead_sign", -3.84, neon(SIGN_LINES, (255, 60, 90), dead=(92, 66, 84),
                                                lit_lines=(("BURN", 0.3, burn_u0, 3.55, False),)))
        for s in (-1, 1):
            # Black drapes, pleated, 3 m tall from the back wall to fwd = 1.
            n = 20
            for k in range(n):
                f0, f1 = -4 + 5 * k / n, -4 + 5 * (k + 1) / n
                x0, x1 = s * (8.4 + 0.08 * (k % 2)), s * (8.4 + 0.08 * ((k + 1) % 2))
                p.poly(f"drape{s}_{k}", [(x0, f0, 0), (x1, f1, 0), (x1, f1, 3), (x0, f0, 3)], DRAPE, "set", (-s, 0, 0),
                       paint=lambda t: lit(t, lo=0.6, hi=1.2))

    def boombox_parts(p):
        p.box("boombox", (0, 0, 0.15), (0.6, 0.2, 0.3), SILVER, "set", mat=1, paint=boombox)
        for k, sx in enumerate((-0.19, 0.19)):
            p.seg(f"woofer{k}", (sx, 0.1, 0.14), (sx, 0.112, 0.14), 0.095, 0.088, (34, 34, 40), "set", verts=12, mat=1, paint=boombox)
        for s in (-1, 1):
            p.seg(f"handle_post{s}", (s * 0.22, 0, 0.3), (s * 0.22, 0, 0.37), 0.014, 0.014, (190, 192, 200), "set", verts=6, mat=1, paint=metal)
        p.seg("handle", (-0.235, 0, 0.37), (0.235, 0, 0.37), 0.017, 0.017, RUBBER, "set", verts=6, mat=1, paint=metal)

    def shard(p):
        # A long jagged triangle of mirror, point down at the origin.
        pts = [(0, 0), (0.06, 0.35), (0.13, 0.62), (0.2, 1.12), (0.08, 1.2), (-0.03, 1.1), (-0.14, 1.16), (-0.12, 0.7), (-0.05, 0.3)]
        for s in (-1, 1):
            p.poly(f"shard{s}", [(x, s * 0.006, u) for x, u in pts], GLASS, "set", (0, s, 0), mat=1, paint=shard_paint)

    def shatter(p):
        rng = np.random.default_rng(4)
        for k in range(18):
            a, r = rng.uniform(0, 2 * math.pi), 0.55 * math.sqrt(rng.uniform(0, 1))
            flat_poly(p, f"bits{k}", shard_pts(rng, r * math.cos(a), r * math.sin(a), rng.uniform(0.05, 0.14)), GLASS, floor_glass, mat=1, up=0.003)

    def mark(p):
        for k, a in enumerate((math.pi / 4, -math.pi / 4)):
            ca, sa = math.cos(a), math.sin(a)
            pts = [(sx * 0.5 * ca - sw * 0.06 * sa, sx * 0.5 * sa + sw * 0.06 * ca) for sx, sw in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
            flat_poly(p, f"tape{k}", pts, TAPE, tape, mat=1, up=0.003 + 0.001 * k)

    make("set", studio)
    make("seg_warmup", warmup)
    make("seg_double", double)
    make("seg_burnout", burnout)
    make("prop_boombox", boombox_parts, at=(0, -0.3, 0))
    make("fx_shard", shard)
    make("fx_shatter", shatter)
    make("fx_mark", mark)
