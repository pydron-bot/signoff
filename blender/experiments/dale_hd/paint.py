"""Texel painting for the high-detail Dale: from each texel's position
(fighter space, metres), normal and label, its colour (sRGB 0–1), roughness
and a fine height (metres) for the normal map's micro detail: skin pores,
the wool's weave, combed hair, the tie's silk twill."""
import numpy as np

from .head import EYE, EYE_R, ORIGIN

BASE = {
    "skin": (214, 160, 128), "lip": (186, 112, 104), "mouth": (70, 22, 28), "nostril": (110, 60, 52), "lidrim": (196, 132, 118),
    "brow": (200, 150, 118), "eye": (236, 230, 222), "cornea": (236, 230, 222), "tooth": (228, 220, 198), "gum": (190, 98, 100),
    "hair": (70, 46, 30), "jacket": (176, 136, 90), "lapel": (172, 132, 86), "shirt": (234, 232, 224), "tie": (160, 36, 34),
    "trousers": (84, 64, 50), "shoe": (52, 34, 24), "sole": (28, 22, 18), "button": (44, 34, 28), "square": (112, 160, 210),
    "pin": (196, 28, 36), "plastic": (40, 40, 44), "nail": (226, 178, 164),
}
ROUGH = {
    "skin": 0.55, "lip": 0.4, "mouth": 0.5, "nostril": 0.7, "lidrim": 0.3, "brow": 0.7, "eye": 0.06, "cornea": 0.04, "tooth": 0.22,
    "gum": 0.3, "hair": 0.42, "jacket": 0.88, "lapel": 0.85, "shirt": 0.75, "tie": 0.38, "trousers": 0.82, "shoe": 0.28, "sole": 0.7,
    "button": 0.3, "square": 0.5, "pin": 0.25, "plastic": 0.4, "nail": 0.3,
}


def _hash(i, j, k, seed):
    h = (i * 73856093) ^ (j * 19349663) ^ (k * 83492791) ^ (seed * 2654435761)
    h = (h ^ (h >> 13)) * 1274126177
    return ((h ^ (h >> 16)) & 0xFFFF) / 65535.0


def noise(p, scale, seed=0):
    """Smooth value noise in 0…1 at points p (N, 3), feature size `scale` m."""
    q = p / scale
    i = np.floor(q).astype(np.int64)
    f = q - i
    f = f * f * (3 - 2 * f)
    out = 0.0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (f[:, 0] if dx else 1 - f[:, 0]) * (f[:, 1] if dy else 1 - f[:, 1]) * (f[:, 2] if dz else 1 - f[:, 2])
                out = out + w * _hash(i[:, 0] + dx, i[:, 1] + dy, i[:, 2] + dz, seed)
    return out


def fbm(p, scale, octaves=4, seed=0):
    out, amp, tot = 0.0, 1.0, 0.0
    for o in range(octaves):
        out = out + amp * noise(p, scale / 2 ** o, seed + o)
        tot += amp
        amp *= 0.5
    return out / tot


def ell(x, y, cx, cy, rx, ry):
    """0…1 soft ellipse mask."""
    d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
    return np.clip(1.5 - d, 0, 1) ** 1.5 / 1.5 ** 1.5


def paint(P, N, lab):
    """P, N (n, 3) fighter space; lab (n,) labels → colour (n, 3) sRGB 0–1,
    roughness (n,), height (n,) metres."""
    n = len(P)
    col = np.array([BASE.get(l, (255, 0, 255)) for l in lab], dtype=float) / 255
    rough = np.array([ROUGH.get(l, 0.6) for l in lab], dtype=float)
    hgt = np.zeros(n)
    L = {k: lab == k for k in set(lab.tolist())}
    z = lambda k: L.get(k, np.zeros(n, bool))  # noqa: E731

    def mix(mask, c, a=1.0):
        m = (np.asarray(mask, float) * a)[:, None]
        col[:] = col * (1 - m) + np.array(c, float) / 255 * m

    # The lips are painted from their own outline (head.py's arcs: the
    # grin lifts the corners), with a soft edge, not from the labels: the
    # blend round each lip reaches past its edge.
    hx0, hf0, hu0 = P[:, 0] - ORIGIN[0], P[:, 1] - ORIGIN[1], P[:, 2] - ORIGIN[2]
    t = np.clip(hx0 / 0.0275, -1, 1)
    knots = np.linspace(-1, 1, 7)
    r_top = np.interp(t, knots, [0.0018, 0.0030, 0.0037, 0.0040, 0.0037, 0.0030, 0.0018])
    r_bot = np.interp(t, knots, [0.0020, 0.0036, 0.0046, 0.0050, 0.0046, 0.0036, 0.0020])
    top = -0.0478 + 0.0012 * (1 - t * t) + 0.006 * t * t + r_top * 0.95
    bottom = -0.0628 - 0.006 * (1 - t * t) + 0.006 * t * t - r_bot * 0.95
    mouth_line = -0.0545 - 0.0045 * (1 - t * t) + 0.0045 * t * t
    in_x = np.clip((0.0285 - np.abs(hx0)) / 0.002, 0, 1)
    up_band = np.clip((top - hu0) / 0.001, 0, 1) * (hu0 > mouth_line - 0.001)
    lo_band = np.clip((hu0 - bottom) / 0.001, 0, 1) * (hu0 <= mouth_line + 0.001)
    lipmask = np.where((hf0 > 0.07) & (np.abs(hx0) < 0.032), np.maximum(up_band, lo_band) * in_x, 0.0)
    lab = lab.copy()
    lab[lab == "lip"] = "skin"
    col[:] = np.array([BASE.get(l, (255, 0, 255)) for l in lab], dtype=float) / 255
    rough[:] = np.array([ROUGH.get(l, 0.6) for l in lab], dtype=float)
    L = {k: lab == k for k in set(lab.tolist())}
    # ---- Skin (face, neck, ears, hands).
    sk = z("skin") | z("brow") | z("lidrim") | z("nostril") | z("nail") | z("lip")
    hx, hf, hu = P[:, 0] - ORIGIN[0], P[:, 1] - ORIGIN[1], P[:, 2] - ORIGIN[2]
    face = sk & (P[:, 2] > 1.45)
    mott = fbm(P, 0.02, 4, 3)
    col[sk] *= (0.93 + 0.12 * mott[sk])[:, None]
    # Warmth where the blood is close: cheeks, nose, ears, chin, knuckles.
    flush = np.zeros(n)
    for s in (1, -1):
        flush += ell(hx, hu, s * 0.042, -0.02, 0.026, 0.022) * (hf > 0.03)
        flush += ell(hf, hu, -0.01, 0.0, 0.025, 0.04) * (np.abs(hx) > 0.065)
    flush += ell(hx, hu, 0, -0.018, 0.016, 0.016) * (hf > 0.09)
    flush += ell(hx, hu, 0, -0.098, 0.022, 0.014) * (hf > 0.05) * 0.5
    mix(face & (flush > 0), (200, 112, 100), np.clip(flush, 0, 1) * 0.32)
    # A shaved man's shadow on the jaw and upper lip, under a TV tan.
    beard = ((hu < -0.03 - 0.25 * np.maximum(np.abs(hx) - 0.03, 0)) & (hu > -0.125) & (hf > -0.005)) | \
            ((np.abs(hx) < 0.026) & (hu < -0.036) & (hu > -0.047) & (hf > 0.08))
    beard &= face & (lipmask < 0.3)
    stub = 0.5 + 0.5 * noise(P, 0.0012, 9)
    mix(beard, (120, 104, 98), 0.16 * stub)
    # Eyebrows: short hairs combed outward, darker where dense.
    bmask = np.zeros(n)
    for s in (1, -1):
        t = np.clip((hx * s - 0.014) / 0.040, 0, 1)
        cu = 0.0365 + 0.0045 * np.sin(np.pi * t) + 0.002
        bmask = np.maximum(bmask, np.clip(1 - np.abs(hu - cu) / (0.0055 - 0.0028 * t), 0, 1) * ((hx * s > 0.012) & (hx * s < 0.056)) * (hf > 0.05))
    strands = 0.5 + 0.5 * np.sin((hu * 1.0 + np.abs(hx) * 0.45) / 0.0009)
    mix(face, (52, 34, 22), np.clip(bmask * 1.4 * (0.6 + 0.4 * strands), 0, 1) * 0.95)
    # Lips: a soft edge into the skin; the inner lip darker and wetter.
    lipc = np.array((184, 104, 98)) / 255 * (0.92 + 0.12 * fbm(P, 0.003, 2, 4))[:, None]
    m_ = lipmask * (z("skin") | z("lidrim"))
    col[:] = col * (1 - m_[:, None]) + lipc * m_[:, None]
    rough[:] = rough * (1 - m_) + 0.32 * m_
    # Lid rims pinker; a little darkness round the eyes.
    for s in (1, -1):
        mix(face, (150, 104, 92), 0.18 * ell(hx, hu, s * EYE[0], EYE[2], 0.022, 0.016) * (hf > 0.06))
    # Nails and fingertips.
    mix(z("nail"), (236, 196, 184), 0.6)
    hand = sk & (P[:, 2] < 1.1)
    mix(hand, (196, 120, 106), 0.12 * fbm(P, 0.01, 2, 7)[:, None].ravel())
    # Pores: fine bumps over the skin, softer on the lips.
    hgt[sk] += 0.00006 * (noise(P[sk], 0.0007, 21) - 0.5) + 0.00004 * (noise(P[sk], 0.0016, 22) - 0.5)
    # Forehead lines and crow's feet carry most in the normals; a hint of shade.
    hgt[face] += -0.00008 * bmask[face]

    # ---- Eyes: sclera, iris and pupil by angle from each eye's axis.
    ey = z("eye") | z("cornea")
    for s in (1, -1):
        c = np.array((ORIGIN[0] + s * EYE[0], ORIGIN[1] + EYE[1], ORIGIN[2] + EYE[2]))
        d = P - c
        sel = ey & (np.abs(d[:, 0]) < 0.02)
        r = np.hypot(d[:, 0] - s * 0.0006, d[:, 2])  # gaze a hair inward
        front = d[:, 1] > 0
        iris = sel & front & (r < 0.0059)
        ang = np.arctan2(d[:, 2], d[:, 0])
        fib = 0.5 + 0.5 * np.sin(ang * 46 + 3 * noise(P, 0.002, 30))
        irc = np.stack([0.30 + 0.12 * fib, 0.42 + 0.14 * fib, 0.52 + 0.12 * fib], 1)  # grey-blue
        irc = irc * (0.65 + 0.35 * (r / 0.0059))[:, None]
        col[iris] = irc[iris] ** 1.0
        ring = sel & front & (r > 0.0050) & (r < 0.0062)
        mix(ring, (40, 50, 60), 0.6)
        pup = sel & front & (r < 0.0024)
        col[pup] = 0.03
        # The sclera greys and reddens toward its edges.
        edge = sel & ~iris & ~ring
        mix(edge, (210, 170, 160), np.clip((r - 0.007) / 0.006, 0, 1) * 0.5)
        hgt[iris] -= 0.00004 * fib[iris]
    # ---- Teeth and mouth.
    th = z("tooth")
    mix(th, (220, 205, 170), 0.25 * np.clip((P[:, 2] - ORIGIN[2] + 0.0545) / 0.006, 0, 1))
    # ---- Hair: strands along the comb, with lighter tips and a sheen.
    hr = z("hair")
    flow = (hf * 0.8 + hu * 0.5 + 0.35 * hx)
    s1 = 0.5 + 0.5 * np.sin(flow / 0.00075 + 6 * noise(P, 0.006, 40))
    s2 = noise(P * np.array((1, 1, 1)), 0.0025, 41)
    tone = 0.75 + 0.35 * s1 * s2
    col[hr] *= tone[hr, None]
    mix(hr, (120, 86, 54), 0.25 * fbm(P, 0.03, 2, 42)[:, None].ravel() * hr)
    hgt[hr] += 0.00012 * (s1[hr] - 0.5)

    # ---- The blazer: camel wool with a faint 1980s check.
    wool = z("jacket") | z("lapel")
    side, up = P[:, 0], P[:, 2]
    check = (np.abs(((side + 0.03) % 0.06) - 0.03) < 0.0035) | (np.abs(((up + 0.03) % 0.06) - 0.03) < 0.0035)
    thin = (np.abs(((side) % 0.06) - 0.03) < 0.0012) | (np.abs(((up) % 0.06) - 0.03) < 0.0012)
    mix(wool & check, (138, 100, 62), 0.45)
    mix(wool & thin, (196, 160, 112), 0.35)
    heather = fbm(P, 0.004, 3, 50)
    col[wool] *= (0.9 + 0.18 * heather[wool])[:, None]
    weave = np.sin(side / 0.0007) * np.sin(up / 0.0007)
    hgt[wool] += 0.00006 * weave[wool] + 0.00008 * (noise(P[wool], 0.0015, 51) - 0.5)
    # Lapel edges stitched (pick stitching) a few mm in from the edge would need the edge; skip.
    # ---- Shirt: cotton poplin.
    sh = z("shirt")
    col[sh] *= (0.97 + 0.04 * noise(P[sh], 0.003, 60))[:, None]
    hgt[sh] += 0.00003 * np.sin(up[sh] / 0.0004)
    # ---- Tie: red silk, diagonal gold stripes, a twill sheen.
    ti = z("tie")
    diag = side + up * 0.9
    stripe = np.abs(((diag) % 0.045) - 0.0225) < 0.006
    edge = np.abs(np.abs(((diag) % 0.045) - 0.0225) - 0.006) < 0.0012
    mix(ti & stripe, (214, 172, 76), 1.0)
    mix(ti & edge, (40, 30, 60), 0.8)
    hgt[ti] += 0.00003 * np.sin((side[ti] - up[ti]) / 0.0005)
    # ---- Trousers: brown wool, a pressed crease down the front.
    tr = z("trousers")
    col[tr] *= (0.9 + 0.16 * fbm(P[tr], 0.005, 3, 70))[:, None]
    hgt[tr] += 0.00005 * np.sin(side[tr] / 0.0006 + up[tr] / 0.0006)
    # ---- Shoes: polished leather, creased over the toes; laces and sole.
    so = z("shoe")
    col[so] *= (0.85 + 0.25 * fbm(P[so], 0.01, 3, 80))[:, None]
    rough[so] = 0.22 + 0.2 * noise(P[so], 0.01, 81)
    hgt[so] += 0.00004 * (noise(P[so], 0.0012, 82) - 0.5)
    # ---- Small things.
    pin = z("pin")
    if pin.any():
        from lib.paint import text
        ink = text(P[:, 0] - 0.108, P[:, 2] - 1.395, "CH0", 0.012, 0.0, -0.006) & (P[:, 1] > 0.0)
        mix(pin & ink, (250, 240, 220), 1.0)
    sq = z("square")
    mix(sq & (np.abs(((side + up) % 0.01) - 0.005) < 0.0015), (230, 236, 246), 0.6)

    rough += 0.06 * (noise(P, 0.01, 99) - 0.5)
    return np.clip(col, 0, 1), np.clip(rough, 0.03, 1), hgt
