"""Hands, five fingers and nails, on the rig's hand frame (lib.rig.hand_frame):
t along the hand from the wrist, w across toward the thumb, n out of the
back of the hand. The rig has one bone per finger group (index, the other
three, thumb); the phalanges also name finer bones (index_2.L …) that the
skinning folds back onto the group bone when the rig lacks them."""
import numpy as np

from .rigdata import hand_frame
from .sdf import Model, cone, ellipsoid, sphere

# Knuckle (t, w), lengths of the three phalanges, base and tip radii, and
# the fan angle across the hand (degrees toward the thumb).
FINGERS = {
    "index": ((0.077, 0.0265), (0.044, 0.026, 0.021), 0.0090, 0.0071, 5),
    "middle": ((0.080, 0.0075), (0.048, 0.029, 0.022), 0.0092, 0.0073, 0),
    "ring": ((0.077, -0.0115), (0.045, 0.027, 0.021), 0.0087, 0.0068, -6),
    "pinky": ((0.071, -0.0285), (0.035, 0.021, 0.019), 0.0076, 0.0060, -12),
}
CURL = (8, 12, 8)  # rest flex at each knuckle, degrees toward the palm


def bone_of(finger, s, joint):
    g = "index" if finger == "index" else "fingers"
    return f"{g}.{s}" if joint == 0 else f"{g}_{joint + 1}.{s}"


def build(s):
    wr, a, w, n, L = hand_frame(s)

    def P(t, ww, nn):
        return tuple(wr + a * t + w * ww + n * nn)

    m = Model(f"hand.{s}")
    hd = f"hand.{s}"
    fa = f"forearm.{s}"
    # Wrist into the forearm (it hides in the shirt cuff).
    m.add(cone(P(-0.07, 0, 0), P(0.004, 0, 0.001), 0.024, 0.024, squash=(0.68, 1.0), hint=w), {fa: 0.6, hd: 0.4}, "skin", name="wrist")
    # The palm: a flattened block, thicker at the heel and the thumb's ball.
    m.add(_slab(P(0.042, 0.0, 0.0), a, w, n, (0.040, 0.037, 0.0115), 0.010), hd, "skin", k=0.014, name="palm")
    m.add(ellipsoid(P(0.030, 0.022, -0.010), (0.016, 0.026, 0.012), _rows(a, w, n)), hd, "skin", k=0.012, name="thenar")
    m.add(ellipsoid(P(0.032, -0.024, -0.008), (0.012, 0.030, 0.010), _rows(a, w, n)), hd, "skin", k=0.012, name="hypothenar")
    # Tendons over the back of the hand, and the knuckles.
    for name, ((t0, w0), _, r0, _, _) in FINGERS.items():
        m.add(cone(P(0.012, w0 * 0.4, 0.0105), P(t0 - 0.006, w0, 0.0105), 0.0017, 0.0021), hd, "skin", k=0.008, name="tendon")
        m.add(sphere(P(t0 - 0.002, w0, 0.0045), r0 * 0.95), hd, "skin", k=0.008, name="knuckle")
    for name, ((t0, w0), lens, r0, r1, fan) in FINGERS.items():
        d = np.radians(fan)
        along = a * np.cos(d) + w * np.sin(d)
        pts = [np.array(P(t0, w0, 0.001))]
        dirv = along
        for j, ln in enumerate(lens):
            ang = np.radians(CURL[j])
            dirv = dirv * np.cos(ang) - n * np.sin(ang) if j else (along * np.cos(ang) - n * np.sin(ang))
            pts.append(pts[-1] + dirv * ln)
        radii = [r0, r0 * 0.93 + r1 * 0.07, (r0 + r1) / 2, r1]
        for j in range(3):
            end = pts[j + 1] if j < 2 else pts[3] - dirv * 0.004
            m.add(cone(tuple(pts[j]), tuple(end), radii[j], radii[j + 1] * (0.98 if j < 2 else 0.9), squash=(0.86, 1.0), hint=w),
                  bone_of(name, s, j), "skin", k=0.004, name=f"{name}{j}")
        # The fingertip pad and the nail on the back of the last phalanx.
        tip = pts[3] - dirv * 0.004
        m.add(sphere(tuple(tip), r1 * 0.9), bone_of(name, s, 2), "skin", k=0.003, name="pad")
        nb = (pts[2] + pts[3]) / 2 + dirv * 0.004
        m.add(ellipsoid(tuple(nb + _up(dirv, n) * r1 * 0.72), (r1 * 0.78, r1 * 0.32, 0.0062), _rows(dirv, w, n, order="wna")),
              bone_of(name, s, 2), "nail", k=0.0012, name="nail")
    # The thumb: its metacarpal in the palm, then two phalanges.
    base = np.array(P(0.004, 0.019, -0.004))
    mc = np.array(P(0.036, 0.036, -0.012))
    d1 = a * 0.80 + w * 0.32 - n * 0.30
    d2 = a * 0.86 + w * 0.12 - n * 0.36
    p1 = mc + d1 / np.linalg.norm(d1) * 0.036
    p2 = p1 + d2 / np.linalg.norm(d2) * 0.030
    m.add(cone(tuple(base), tuple(mc), 0.014, 0.0108), {hd: 0.5, f"thumb.{s}": 0.5}, "skin", k=0.012, name="thumb_mc")
    m.add(cone(tuple(mc), tuple(p1), 0.0108, 0.0098, squash=(0.85, 1.0), hint=w), f"thumb.{s}", "skin", k=0.004, name="thumb1")
    m.add(cone(tuple(p1), tuple(p2), 0.0098, 0.0085, squash=(0.85, 1.0), hint=w), f"thumb_2.{s}", "skin", k=0.004, name="thumb2")
    td = (p2 - p1) / np.linalg.norm(p2 - p1)
    tn = _up(td, n * 0.7 + w * 0.3)
    m.add(ellipsoid(tuple(p1 * 0.4 + p2 * 0.6 + tn * 0.006), (0.0068, 0.0028, 0.0075), _rows(td, np.cross(tn, td), tn, order="wna")),
          f"thumb_2.{s}", "nail", k=0.0012, name="thumb_nail")
    return m


def _up(d, n):
    """n made perpendicular to direction d."""
    u = n - d * np.dot(n, d)
    return u / np.linalg.norm(u)


def _rows(a, w, n, order="awn"):
    """A rotation whose local axes are (a, w, n) in the given order, made orthonormal."""
    a = a / np.linalg.norm(a)
    w = w - a * np.dot(w, a)
    w /= np.linalg.norm(w)
    nn = np.cross(a, w)
    if np.dot(nn, n) < 0:
        nn = -nn
    axes = {"a": a, "w": w, "n": nn}
    if order == "wna":
        return np.stack([axes["w"], axes["n"], axes["a"]]).astype(np.float32)
    return np.stack([axes[c] for c in order]).astype(np.float32)


def _slab(c, a, w, n, half, r):
    from .sdf import box
    return box(c, (half[0], half[1], half[2]), r, _rows(a, w, n))


def bounds(s, pad=0.03):
    wr, a, w, n, L = hand_frame(s)
    pts = [wr + a * t + w * ww + n * nn for t in (-0.08, 0.2) for ww in (-0.06, 0.08) for nn in (-0.05, 0.04)]
    pts = np.array(pts)
    return tuple(pts.min(axis=0) - pad), tuple(pts.max(axis=0) + pad)
