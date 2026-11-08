"""Shapes for effect meshes (fx_*): ribbons along a path and jagged bolts.
Points are in fighter space (side, fwd, up), at the effect's origin."""
import math


def ribbon(p, name, path, width, colour, thick=0.02, paint=None, across=(1, 0, 0)):
    """A flat ribbon along `path` (points), `width(i)` wide (a number or a
    function of the point's index), lying across `across` (a direction, or a
    function of the index), as one faceted piece per span."""
    n = len(path)
    for i in range(n - 1):
        pts = []
        for j in (i, i + 1):
            w = width(j) if callable(width) else width
            a = across(j) if callable(across) else across
            for s in (-1, 1):
                for t in (-1, 1):
                    pts.append(tuple(path[j][k] + s * a[k] * w / 2 + t * thick / 2 * _normal(path, j, a)[k] for k in range(3)))
        p.hull(f"{name}{i}", pts, colour, "fx", mat=1, paint=paint)


def _normal(path, j, a):
    i0, i1 = max(0, j - 1), min(len(path) - 1, j + 1)
    d = [path[i1][k] - path[i0][k] for k in range(3)]
    n = (d[1] * a[2] - d[2] * a[1], d[2] * a[0] - d[0] * a[2], d[0] * a[1] - d[1] * a[0])
    m = math.sqrt(sum(c * c for c in n)) or 1
    return tuple(c / m for c in n)


def bolt(p, name, start, direction, length, colour, rng, segments=5, width=0.03, paint=None):
    """A jagged lightning bolt from `start`, roughly along `direction`."""
    pts = [start]
    m = math.sqrt(sum(c * c for c in direction))
    d = [c / m for c in direction]
    for i in range(segments):
        step = length / segments
        jag = [rng.uniform(-0.45, 0.45) * step for _ in range(3)]
        prev = pts[-1]
        pts.append(tuple(prev[k] + d[k] * step + jag[k] for k in range(3)))
    for i, (a, b) in enumerate(zip(pts, pts[1:])):
        w = width * (1 - i / (segments + 1))
        q = [tuple(c + o for c, o in zip(pt, off)) for pt in (a, b) for off in ((w, 0, 0), (-w, 0, 0), (0, w, 0), (0, -w, 0), (0, 0, w * 0.6))]
        p.hull(f"{name}{i}", q, colour, "fx", mat=1, paint=paint)
