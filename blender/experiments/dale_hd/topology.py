"""Tunnel check: the genus of a surface patch (holes through it), from its
faces alone: χ = V − E + F, and for c pieces with b boundary loops
genus = (2c − χ − b) / 2. A sculpted region should be 0.

    blender -b --factory-startup -P blender/experiments/dale_hd/topology.py
"""
import sys
from pathlib import Path

import numpy as np


def genus(faces, keep=None):
    faces = [f for i, f in enumerate(faces) if keep is None or keep[i]]
    edges = {}
    for f in faces:
        for a, b in zip(f, f[1:] + f[:1]):
            k = (min(a, b), max(a, b))
            edges[k] = edges.get(k, 0) + 1
    verts = {v for f in faces for v in f}
    chi = len(verts) - len(edges) + len(faces)
    parent = {v: v for v in verts}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for a, b in edges:
        parent[find(a)] = find(b)
    comps = len({find(v) for v in verts})
    bnd = [e for e, n in edges.items() if n == 1]
    bp = {v: v for e in bnd for v in e}

    def bfind(x):
        while bp[x] != x:
            bp[x] = bp[bp[x]]
            x = bp[x]
        return x

    for a, b in bnd:
        bp[bfind(a)] = bfind(b)
    loops = len({bfind(v) for v in bp})
    return (2 * comps - chi - loops) / 2


def region(model, lo, hi, h=0.0006):
    """Genus of the model's surface inside the box (meshed a little bigger, cropped)."""
    from .sdf import mesh
    pad = 3 * h
    v, faces = mesh(model, np.array(lo) - pad, np.array(hi) + pad, h)
    c = np.array([v[list(f)].mean(0) for f in faces])
    keep = np.all((c >= lo) & (c <= hi), axis=1)
    return genus([list(f) for f in faces], keep)


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    from experiments.dale_hd import head

    O = head.ORIGIN
    m = head.skin()
    for name, (lo, hi) in {"nose": ((-0.03, 0.07, -0.045), (0.03, 0.135, 0.03))}.items():
        print("GENUS", name, region(m, O + lo, O + hi))
