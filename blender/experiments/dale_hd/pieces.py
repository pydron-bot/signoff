"""Every piece of the model: its SDF, the box it is meshed in, the voxel
size, and its triangle budget after decimation."""
from . import body, hands, head


# The files that change shapes (the cache ignores painting, building, rendering).
SHAPE_FILES = {"sdf", "head", "hands", "body", "rigdata", "pieces"}


class Piece:
    def __init__(self, name, build, lo, hi, h, budget):
        self.name, self._build, self.lo, self.hi, self.h, self.budget = name, build, lo, hi, h, budget
        self._model = None

    @property
    def model(self):
        if self._model is None:
            self._model = self._build()
        return self._model

    def mesh(self, h=None, cache=None):
        """Mesh it; with `cache` (a folder), reuse the last mesh while no
        source file here has changed since."""
        import hashlib
        from pathlib import Path

        import numpy as np

        from .sdf import mesh
        h = h or self.h
        if cache:
            here = Path(__file__).parent
            shape = [p for p in sorted(here.glob("*.py")) if p.stem in SHAPE_FILES]
            key = hashlib.sha1(b"".join(p.read_bytes() for p in shape) + f"{self.name}{h}".encode()).hexdigest()[:16]
            path = Path(cache) / f"{self.name}-{key}.npz"
            if path.exists():
                z = np.load(path)
                return z["v"], [tuple(f) for f in z["t"]] + [tuple(f) for f in z["q"]]
        v, faces = mesh(self.model, self.lo, self.hi, h)
        if cache:
            Path(cache).mkdir(parents=True, exist_ok=True)
            np.savez(path, v=v, t=np.array([f for f in faces if len(f) == 3]).reshape(-1, 3), q=np.array([f for f in faces if len(f) == 4]).reshape(-1, 4))
        return v, faces


def _hb(lo, hi):
    o = head.ORIGIN
    return tuple(o + lo), tuple(o + hi)


PIECES = {
    "head": Piece("head", head.skin, *_hb((-0.105, -0.125, -0.245), (0.105, 0.135, 0.14)), 0.0012, 4800),
    "eyes": Piece("eyes", head.eyes, *_hb((-0.05, 0.055, -0.01), (0.05, 0.095, 0.03)), 0.0006, 320),
    "teeth": Piece("teeth", head.teeth, *_hb((-0.035, 0.07, -0.075), (0.035, 0.11, -0.04)), 0.0006, 360),
    "hair": Piece("hair", head.hair, *_hb((-0.1, -0.125, -0.09), (0.1, 0.13, 0.155)), 0.0012, 1400),
    "body": Piece("body", body.build, *body.bounds(), 0.0035, 8300),
    "hand.L": Piece("hand.L", lambda: hands.build("L"), *hands.bounds("L"), 0.0009, 1300),
    "hand.R": Piece("hand.R", lambda: hands.build("R"), *hands.bounds("R"), 0.0009, 1300),
}
