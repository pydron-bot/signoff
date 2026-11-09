"""Signed distance fields in numpy, meshed by OpenVDB (bundled with Blender).

Everything is in fighter space (side, fwd, up), metres. A shape is a Prim:
a function from points (N, 3) to distances, a bone it skins to and a label
(which paints it). Shapes combine with smooth unions and cuts; the model
keeps the primitives, so skin weights and labels can be read back at any
point later (the decimated mesh's vertices).
"""
import numpy as np

F = np.float32


def v3(x):
    return np.asarray(x, dtype=F)


def norm(x):
    x = v3(x)
    return x / np.linalg.norm(x)


def frame(axis, hint=(0, 1, 0)):
    """Rows u, v, w: w along `axis`, v as close to `hint` as possible."""
    w = norm(axis)
    h = v3(hint)
    v = h - w * np.dot(h, w)
    if np.linalg.norm(v) < 1e-6:
        v = np.cross(w, (1, 0, 0))
    v = norm(v)
    u = np.cross(v, w)
    return np.stack([u, v, w]).astype(F)


def rot(yaw=0.0, pitch=0.0, roll=0.0):
    """Rows of a local frame turned by degrees: yaw about up, pitch about side, roll about fwd."""
    y, p, r = np.radians([yaw, pitch, roll])
    Rz = np.array([[np.cos(y), -np.sin(y), 0], [np.sin(y), np.cos(y), 0], [0, 0, 1]])
    Rx = np.array([[1, 0, 0], [0, np.cos(p), -np.sin(p)], [0, np.sin(p), np.cos(p)]])
    Ry = np.array([[np.cos(r), 0, np.sin(r)], [0, 1, 0], [-np.sin(r), 0, np.cos(r)]])
    return (Rz @ Rx @ Ry).T.astype(F)


# Primitive distance functions. q: (N, 3) points.

def ellipsoid(c, r, R=None):
    c, r = v3(c), v3(r)

    def f(q):
        p = q - c
        if R is not None:
            p = p @ R.T
        k0 = np.linalg.norm(p / r, axis=1)
        k1 = np.linalg.norm(p / (r * r), axis=1)
        return k0 * (k0 - 1) / np.maximum(k1, 1e-9)
    return f


def sphere(c, r):
    c = v3(c)
    return lambda q: np.linalg.norm(q - c, axis=1) - r


def cone(a, b, ra, rb, squash=None, hint=(0, 1, 0)):
    """A round cone from a (radius ra) to b (radius rb); `squash` (sx, sy)
    flattens its cross-section across (u, v) of frame(b - a)."""
    a, b = v3(a), v3(b)
    if squash is not None:
        R = frame(b - a, hint)
        s = v3((squash[0], squash[1], 1.0))
        L = float(np.linalg.norm(b - a))
        base = cone((0, 0, 0), (0, 0, L), ra, rb)
        m = float(min(squash))

        def g(q):
            p = ((q - a) @ R.T) / s
            return base(p) * m
        return g
    ba = b - a
    l2 = float(np.dot(ba, ba))
    rr = ra - rb
    a2 = l2 - rr * rr
    il2 = 1.0 / l2

    def f(q):
        pa = q - a
        y = pa @ ba
        z = y - l2
        x2 = np.sum((pa * l2 - np.outer(y, ba)) ** 2, axis=1)
        y2 = y * y * l2
        z2 = z * z * l2
        k = np.sign(rr) * rr * rr * x2
        d = (np.sqrt(np.maximum(x2 * a2 * il2, 0)) + y * rr) * il2 - ra
        d = np.where(np.sign(y) * a2 * y2 < k, np.sqrt(x2 + y2) * il2 - ra, d)
        d = np.where(np.sign(z) * a2 * z2 > k, np.sqrt(x2 + z2) * il2 - rb, d)
        return d
    return f


def box(c, half, r=0.0, R=None):
    c, half = v3(c), v3(half)

    def f(q):
        p = q - c
        if R is not None:
            p = p @ R.T
        d = np.abs(p) - (half - r)
        out = np.linalg.norm(np.maximum(d, 0), axis=1)
        return out + np.minimum(d.max(axis=1), 0) - r
    return f


def loft(a, b, sections, hint=(0, 1, 0), n=2.0):
    """A body of revolution's cousin: cross-sections along a → b (t 0…1),
    each (t, half-width, depth in front, depth behind, side offset of
    centre along v); superellipse exponent n (2 round, higher squarer).
    Rounded off at both ends by the first and last sections."""
    a, b = v3(a), v3(b)
    R = frame(b - a, hint)
    L = float(np.linalg.norm(b - a))
    s = _smooth(np.array(sections, dtype=F))
    ts, hw, df, db, off = s[:, 0], s[:, 1], s[:, 2], s[:, 3], s[:, 4]

    def f(q):
        p = (q - a) @ R.T
        t = np.clip(p[:, 2] / L, ts[0], ts[-1])
        w = np.interp(t, ts, hw)
        y = p[:, 1] - np.interp(t, ts, off)
        d = np.where(y > 0, np.interp(t, ts, df), np.interp(t, ts, db))
        k = (np.abs(p[:, 0] / w) ** n + np.abs(y / d) ** n) ** (1 / n)
        side = (k - 1) * np.minimum(w, d)
        along = np.maximum(ts[0] * L - p[:, 2], p[:, 2] - ts[-1] * L)
        return np.minimum(np.maximum(side, along), 0) + np.sqrt(np.maximum(side, 0) ** 2 + np.maximum(along, 0) ** 2)
    return f


def _smooth(s, k=6):
    """Sections resampled along a Catmull-Rom curve (k per span), so a loft
    has no creases at its sections."""
    if len(s) < 3:
        return s
    p = np.vstack([s[0] * 2 - s[1], s, s[-1] * 2 - s[-2]])
    out = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        for t in np.linspace(0, 1, k, endpoint=False):
            out.append(0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t ** 3))
    out.append(s[-1])
    return np.array(out, dtype=F)


def chain(points, radii, squash=None):
    """Round cones through a polyline, one radius per point (a tube)."""
    parts = [cone(points[i], points[i + 1], radii[i], radii[i + 1], squash) for i in range(len(points) - 1)]
    return lambda q: np.min(np.stack([p(q) for p in parts]), axis=0)


def polygon(pts, axes=(0, 2)):
    """A 2D polygon (points in the plane of `axes`), extruded without end
    along the remaining axis."""
    v = np.array(pts, dtype=F)
    i0, i1 = axes

    def f(q):
        x, y = q[:, i0], q[:, i1]
        d = (x - v[0, 0]) ** 2 + (y - v[0, 1]) ** 2
        s = np.ones_like(x)
        n = len(v)
        for i in range(n):
            j = i - 1
            ex, ey = v[j, 0] - v[i, 0], v[j, 1] - v[i, 1]
            wx, wy = x - v[i, 0], y - v[i, 1]
            t = np.clip((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1)
            bx, by = wx - ex * t, wy - ey * t
            d = np.minimum(d, bx * bx + by * by)
            c1 = y >= v[i, 1]
            c2 = y < v[j, 1]
            c3 = ex * wy > ey * wx
            flip = (c1 & c2 & c3) | (~c1 & ~c2 & ~c3)
            s = np.where(flip, -s, s)
        return s * np.sqrt(d)
    return f


def band(base, outline, offset, front=None):
    """A layer `offset` thick over `base`'s surface, inside `outline`
    (a polygon prism), optionally only where fwd > front: lapels, pocket
    flaps, a tie lying on a shirt."""
    def f(q):
        d = np.maximum(base(q) - offset, outline(q))
        if front is not None:
            d = np.maximum(d, front - q[:, 1])
        return d
    return f


def surface(fn, side, up, f0=0.4, f1=-0.1):
    """Where a shape's front surface is at (side, up): fwd by bisection."""
    lo, hi = f1, f0
    for _ in range(40):
        mid = (lo + hi) / 2
        if fn(np.array([[side, mid, up]], dtype=F))[0] > 0:
            hi = mid
        else:
            lo = mid
    return (lo + hi) / 2


# Combining.

def smin(a, b, k):
    if k <= 0:
        return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b + (a - b) * h - k * h * (1 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


class Prim:
    def __init__(self, fn, bone, label, k=0.0, op="add", name=""):
        self.fn, self.bone, self.label, self.k, self.op, self.name = fn, bone, label, k, op, name


class Model:
    """An ordered list of operations: add (smooth union, blend k), cut
    (smooth subtraction), and displace (a function adding to the distance)."""

    def __init__(self, name):
        self.name = name
        self.prims = []
        self.displace = []

    def add(self, fn, bone, label, k=0.0, name=""):
        self.prims.append(Prim(fn, bone, label, k, "add", name))

    def cut(self, fn, k=0.0, name="", label=None):
        self.prims.append(Prim(fn, None, label, k, "cut", name))

    def inter(self, fn, k=0.0, name=""):
        self.prims.append(Prim(fn, None, None, k, "inter", name))

    def eval(self, q):
        d = None
        for p in self.prims:
            x = p.fn(q).astype(F)
            if p.op == "add":
                d = x if d is None else smin(d, x, p.k)
            elif p.op == "cut":
                d = smax(d, -x, p.k)
            else:
                d = smax(d, x, p.k)
        for fn in self.displace:
            d = d + fn(q)
        return d

    def labels(self, q, chunk=400_000, eps=0.0012):
        """Each point's label: whose surface it lies on."""
        adds = [p for p in self.prims if p.op == "add" or (p.op == "cut" and p.label is not None)]
        names = np.array([p.label for p in adds], dtype=object)
        out = np.empty(len(q), dtype=object)
        for i in range(0, len(q), chunk):
            qq = q[i:i + chunk]
            D = np.stack([np.abs(p.fn(qq)) for p in adds])
            # Of the shapes whose surface passes within `eps`, the one added
            # last paints (a later layer lies over an earlier one).
            near = D < eps
            last = len(adds) - 1 - np.argmax(near[::-1], axis=0)
            pick = np.where(near.any(axis=0), last, np.argmin(D, axis=0))
            out[i:i + chunk] = names[pick]
        return out

    def nearest(self, q, tau=0.012):
        """Per point: soft weights over the added primitives (by distance),
        as {bone: weights}, and the label of the nearest one (cuts with a
        label paint their walls)."""
        adds = [p for p in self.prims if p.op == "add" or (p.op == "cut" and p.label is not None)]
        D = np.stack([np.abs(p.fn(q)) if p.op == "cut" else p.fn(q) for p in adds]).astype(np.float64)
        labels = np.array([p.label for p in adds], dtype=object)
        lab = labels[np.argmin(np.abs(D), axis=0)]  # whose surface this is
        bones = {}
        sk = [i for i, p in enumerate(adds) if p.op == "add" and p.bone]
        Ds = D[sk]
        W = np.exp(-(Ds - Ds.min(axis=0)) / tau)
        W /= W.sum(axis=0)
        for row, i in enumerate(sk):
            b = adds[i].bone
            items = b(q).items() if callable(b) else b.items() if isinstance(b, dict) else ((b, 1.0),)
            for name, share in items:
                bones[name] = bones.get(name, 0) + W[row] * share
        return bones, lab


def mesh(model, lo, hi, h, chunk=2_000_000):
    """Sample the model on a grid from lo to hi (voxel h) and mesh its zero
    set: (verts (N, 3) fighter space, faces list of index tuples)."""
    import openvdb

    lo, hi = v3(lo), v3(hi)
    n = np.ceil((hi - lo) / h).astype(int) + 1
    xs = [lo[i] + np.arange(n[i], dtype=F) * h for i in range(3)]
    vol = np.empty(n, dtype=F)
    # Slabs along the first axis, so memory stays bounded.
    per = max(1, chunk // (n[1] * n[2]))
    Y, Z = np.meshgrid(xs[1], xs[2], indexing="ij")
    for i0 in range(0, n[0], per):
        i1 = min(n[0], i0 + per)
        X = np.repeat(xs[0][i0:i1], n[1] * n[2])
        q = np.column_stack([X, np.tile(Y.ravel(), i1 - i0), np.tile(Z.ravel(), i1 - i0)]).astype(F)
        vol[i0:i1] = model.eval(q).reshape(i1 - i0, n[1], n[2])
    g = openvdb.FloatGrid(background=float(3 * h))
    g.copyFromArray(np.clip(vol, -3 * h, 3 * h))
    pts, tris, quads = g.convertToPolygons(isovalue=0.0, adaptivity=0.0)
    verts = pts.astype(np.float64) * h + lo
    faces = [tuple(t) for t in tris] + [tuple(q) for q in quads]
    return verts, faces
