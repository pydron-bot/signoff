"""Painting helpers for part paint functions (lib/texture.py): flat, drawn
detail over a part's colour (stripes, checks, stitching, ribbing, wood
grain, lettering), all from texel positions in fighter space. Sizes are in
metres; keep them a few centimetres or more, as fine detail shimmers at
phone size.
"""
import numpy as np

# A 5×7 pixel font for lettering (rows top to bottom, # = ink).
FONT = {
    "A": [" ### ", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
    "B": ["#### ", "#   #", "#   #", "#### ", "#   #", "#   #", "#### "],
    "C": [" ####", "#    ", "#    ", "#    ", "#    ", "#    ", " ####"],
    "D": ["#### ", "#   #", "#   #", "#   #", "#   #", "#   #", "#### "],
    "E": ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#####"],
    "F": ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#    "],
    "H": ["#   #", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
    "I": ["#####", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "#####"],
    "K": ["#   #", "#  # ", "# #  ", "##   ", "# #  ", "#  # ", "#   #"],
    "L": ["#    ", "#    ", "#    ", "#    ", "#    ", "#    ", "#####"],
    "M": ["#   #", "## ##", "# # #", "#   #", "#   #", "#   #", "#   #"],
    "N": ["#   #", "##  #", "# # #", "#  ##", "#   #", "#   #", "#   #"],
    "O": [" ### ", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
    "P": ["#### ", "#   #", "#   #", "#### ", "#    ", "#    ", "#    "],
    "R": ["#### ", "#   #", "#   #", "#### ", "# #  ", "#  # ", "#   #"],
    "S": [" ####", "#    ", "#    ", " ### ", "    #", "    #", "#### "],
    "T": ["#####", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "  #  "],
    "U": ["#   #", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
    "V": ["#   #", "#   #", "#   #", "#   #", "#   #", " # # ", "  #  "],
    "W": ["#   #", "#   #", "#   #", "# # #", "# # #", "## ##", "#   #"],
    "Y": ["#   #", "#   #", " # # ", "  #  ", "  #  ", "  #  ", "  #  "],
    "0": [" ### ", "#   #", "#  ##", "# # #", "##  #", "#   #", " ### "],
    "1": ["  #  ", " ##  ", "  #  ", "  #  ", "  #  ", "  #  ", " ### "],
    "2": [" ### ", "#   #", "    #", "   # ", "  #  ", " #   ", "#####"],
    "3": ["#### ", "    #", "    #", " ### ", "    #", "    #", "#### "],
    "4": ["   # ", "  ## ", " # # ", "#  # ", "#####", "   # ", "   # "],
    "5": ["#####", "#    ", "#### ", "    #", "    #", "#   #", " ### "],
    "6": [" ### ", "#    ", "#    ", "#### ", "#   #", "#   #", " ### "],
    "7": ["#####", "    #", "   # ", "  #  ", " #   ", " #   ", " #   "],
    "8": [" ### ", "#   #", "#   #", " ### ", "#   #", "#   #", " ### "],
    "9": [" ### ", "#   #", "#   #", " ####", "    #", "    #", " ### "],
    "!": ["  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "     ", "  #  "],
    "-": ["     ", "     ", "     ", "#####", "     ", "     ", "     "],
    " ": ["     "] * 7,
}
_GLYPHS = {ch: np.array([[c == "#" for c in row] for row in rows]) for ch, rows in FONT.items()}


def rgb(c):
    return np.array(c, dtype=float)


def put(c, mask, colour, alpha=1.0):
    """Paint `colour` where mask is true (or by mask's weight, 0…1)."""
    m = (mask.astype(float) * alpha)[:, None]
    return c * (1 - m) + rgb(colour) * m


def shade(c, mask, k):
    """Darken (k < 1) or lighten (k > 1) where mask is."""
    m = mask.astype(float)[:, None]
    return c * (1 - m) + np.clip(c * k, 0, 255) * m


def near(c, colour, tol=14):
    """Texels whose flat colour is `colour` (a part painted in several colours)."""
    return np.abs(c - rgb(colour)).max(axis=1) <= tol


def lines(v, period, width, offset=0.0):
    """True on stripes `width` wide every `period` along the values v."""
    return np.mod(v - offset, period) < width


def dashes(v, period, duty=0.55):
    return np.mod(v, period) < period * duty


def ellipse(u, v, cu, cv, ru, rv):
    return ((u - cu) / ru) ** 2 + ((v - cv) / rv) ** 2 <= 1


def text(u, v, string, height, u0, v0, centred=True):
    """Ink mask for `string` in the 5×7 font: u, v are texel coordinates on
    the surface (metres, u to the right, v up); the text's baseline starts at
    (u0, v0) (or is centred on u0), each letter `height` tall."""
    px = height / 7
    adv = 6 * px
    width = len(string) * adv - px
    start = u0 - width / 2 if centred else u0
    col = np.floor((u - start) / px).astype(int)
    row = 6 - np.floor((v - v0) / px).astype(int)
    letter = col // 6
    cx = col % 6
    ink = np.zeros(u.shape, dtype=bool)
    ok = (row >= 0) & (row < 7) & (letter >= 0) & (letter < len(string)) & (cx < 5) & (u >= start)
    for i, ch in enumerate(string):
        g = _GLYPHS.get(ch.upper(), _GLYPHS[" "])
        sel = ok & (letter == i)
        ink[sel] = g[row[sel], cx[sel]]
    return ink


def facing(t, direction, cos=0.3):
    """Texels whose normal faces `direction` (fighter space)."""
    d = np.array(direction, dtype=float)
    d /= np.linalg.norm(d)
    return t.n @ d > cos


def light(t, direction=(0.3, 0.6, 0.75), lo=0.82, hi=1.08):
    """A soft painted light: brighter facing `direction`, darker away (the
    game's lights are flat and fixed, so a little helps the shapes read)."""
    d = np.array(direction, dtype=float)
    d /= np.linalg.norm(d)
    k = lo + (hi - lo) * np.clip((t.n @ d + 1) / 2, 0, 1)
    return np.clip(t.c * k[:, None], 0, 255)


def grain(u, v, period=0.025, wobble=0.012, freq=9.0):
    """Wood grain bands along u, wavering slowly with v."""
    return np.mod(u + wobble * np.sin(v * freq) + 0.4 * wobble * np.sin(v * freq * 2.7 + 1.3), period) < period * 0.3


def angle_around(t, centre_side, centre_fwd):
    """Arc length (m) around a vertical axis, 0 at the front, + to the character's left."""
    a = np.arctan2(t.side - centre_side, t.fwd - centre_fwd)
    r = np.hypot(t.side - centre_side, t.fwd - centre_fwd)
    return a * r
