"""The audience in the dark (docs/BLENDER-TODO.md, step 24 B): bleachers out
past each side wall, the same on every stage, built by lib/stage.py into one
object, `audience`, in the `props` material, with the seat empties the game
sits beaten fighters on.

Stage space (side, fwd, up). Each side: three stepped rows from x = ±8.5
out to ±12, z = −2 to +2, rising away from the floor; a bench on each step;
a rail along the front; a dim EXIT sign on a post at the back.
"""
from lib import paint as P
from lib.texture import bright

X0, X1 = 8.5, 12.0  # the bleachers' front and back, each side
Z0, Z1 = -2.0, 2.0
ROW = 1.1  # each step's depth
RISE = 0.42  # each step's rise, and a bench's height over its step
PLATFORM = 0.12  # the first step's height off the studio floor
SEAT_IN = 0.55  # a bench's middle, back from its step's front edge
SEAT_Z = (-1.3, 0.0, 1.3)  # the front row's seats along each side

STEP = (30, 30, 34)
BENCH = (52, 46, 40)
METAL = (60, 62, 66)
EXIT = (200, 24, 20)
EXIT_INK = (40, 10, 10)


# The exit signs' letters glow, dimly (step 23 C's EMISSION, for every stage).
EMISSION = {r"audience_exit[LR]": bright(1.2, 50, 70)}
# The signs get twice the texel density (lib/stage.py), for the letters.
DENSE = ("audience_exit",)


def seat_height(row):
    return PLATFORM + row * RISE + RISE


def seats():
    """[(name, at (side, fwd, up), yaw in degrees)] for seat_1 … seat_6: the
    front row, three on the left (1–3) then three on the right (4–6). The
    empty's front (Blender −Y, glTF +Z, the way a fighter faces) points at
    the fight."""
    out = []
    for s, yaw in ((-1, 90.0), (1, -90.0)):
        for z in SEAT_Z:
            out.append((f"seat_{len(out) + 1}", (s * (X0 + SEAT_IN), z, seat_height(0)), yaw))
    return out


def _exit(s):
    """A lit red panel with EXIT in dark letters, facing the fight (it reads
    as an exit sign even where the letters blur); dark round the back."""
    def paint(t):
        front = t.n[:, 0] * -s > 0.5
        # Text runs left to right as seen from the fight.
        u = (t.fwd - 1.4) * s
        c = P.put(t.c, ~front, EXIT_INK)
        return P.put(c, front & P.text(u, t.up, "EXIT", 0.21, 0.0, 2.45 - 0.105), EXIT_INK)
    return paint


def build(p):
    for s in (-1, 1):
        n = "L" if s < 0 else "R"
        for r in range(3):
            front = X0 + r * ROW
            top = PLATFORM + r * RISE
            # Each step is a block from its front edge to the back, so the
            # stack reads as risers; the bench stands on it.
            p.box(f"audience_step{n}{r}", (s * (front + X1) / 2, 0, top / 2), (X1 - front, Z1 - Z0, top), STEP, "set", mat=1)
            cx = s * (front + SEAT_IN)
            p.box(f"audience_bench{n}{r}", (cx, 0, top + RISE - 0.025), (0.36, Z1 - Z0 - 0.1, 0.05), BENCH, "set", mat=1)
            for z in (Z0 + 0.2, 0.0, Z1 - 0.2):
                p.box(f"audience_leg{n}{r}{z:+.0f}", (cx, z, top + (RISE - 0.05) / 2), (0.05, 0.05, RISE - 0.05), METAL, "set", mat=1)
        # The rail along the front, at hand height off the first step.
        rx = s * (X0 + 0.08)
        p.seg(f"audience_rail{n}", (rx, Z0, PLATFORM + 0.9), (rx, Z1, PLATFORM + 0.9), 0.025, 0.025, METAL, "set", verts=5, mat=1)
        for z in (Z0, 0.0, Z1):
            p.seg(f"audience_post{n}{z:+.0f}", (rx, z, PLATFORM), (rx, z, PLATFORM + 0.9), 0.02, 0.02, METAL, "set", verts=4, mat=1)
        # The exit sign on a post behind the top row.
        ex = s * (X1 - 0.1)
        p.seg(f"audience_exitpost{n}", (ex, 1.4, 0), (ex, 1.4, 2.28), 0.03, 0.03, METAL, "set", verts=4, mat=1)
        p.box(f"audience_exit{n}", (ex, 1.4, 2.45), (0.06, 0.8, 0.34), EXIT, "set", mat=1, paint=_exit(s))
