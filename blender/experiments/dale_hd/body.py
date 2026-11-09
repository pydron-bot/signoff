"""Dale's clothed body, one surface: the camel check blazer (1987 shoulder
pads, wide notched lapels, two buttons, flap pockets, a breast pocket with
a pocket square, the "CH 0" pin and a lapel mic), the shirt and its collar
and cuffs, the widest striped tie on air, pleated brown trousers and
oxfords. Modelled in the rig's rest pose (an A-pose) from its joints."""
import numpy as np

from .rigdata import joints
from .sdf import Model, band, box, cone, ellipsoid, loft, polygon, rot, sphere, surface

# The blazer's body: (height, half-width, depth in front, depth behind).
JACKET = [
    (0.835, 0.198, 0.126, 0.132), (0.90, 0.193, 0.124, 0.128), (0.98, 0.178, 0.118, 0.119), (1.06, 0.164, 0.114, 0.110),
    (1.15, 0.168, 0.118, 0.110), (1.25, 0.180, 0.126, 0.114), (1.34, 0.193, 0.127, 0.117), (1.42, 0.200, 0.116, 0.112),
    (1.47, 0.178, 0.098, 0.100), (1.50, 0.140, 0.080, 0.086),
]
Z0, Z1 = JACKET[0][0], JACKET[-1][0]
TOP_BUTTON = 1.165


def torso_bones(q):
    """Hips below 1.0 m, chest above 1.32, blended through the spine (as
    lib.body's torso)."""
    h = q[:, 2] / 1.0408
    t1 = np.clip((h - 1.0) / 0.16, 0, 1)
    t2 = np.clip((h - 1.16) / 0.16, 0, 1)
    return {"hips": 1 - t1, "spine": t1 * (1 - t2), "chest": t2}


def _loft_z(rows, inset=0.0, n=2.6):
    L = rows[-1][0] - rows[0][0]
    secs = [((z - rows[0][0]) / L, w - inset, df - inset, db - inset, 0.0) for z, w, df, db in rows]
    return loft((0, 0, rows[0][0]), (0, 0, rows[-1][0]), secs, hint=(0, 1, 0), n=n)


def mirror(pts):
    return [(-x, z) for x, z in pts]


def build():
    j = joints()
    m = Model("body")
    jacket = _loft_z(JACKET)

    # ---- The blazer.
    m.add(jacket, torso_bones, "jacket", name="jacket")
    for s, S in ((1, "L"), (-1, "R")):
        sh, el = j[f"upper_arm.{S}"]
        wr = j[f"forearm.{S}"][1]
        sh, el, wr = (np.array(v) for v in (sh, el, wr))
        # The yoke from the collar out over the shoulder, and the pad.
        m.add(cone((s * 0.05, -0.008, 1.50), (s * 0.19, 0.0, 1.478), 0.058, 0.062, squash=(0.62, 1.0), hint=(0, 1, 0)), "chest", "jacket", k=0.04, name="yoke")
        m.add(ellipsoid((s * 0.200, 0.0, 1.468), (0.050, 0.068, 0.042), rot(roll=-s * 12)), {f"shoulder.{S}": 0.6, "chest": 0.4}, "jacket", k=0.05, name="pad")
        # Sleeves: wide at the top (1987), to a cuff above the wrist.
        top = sh + (sh - el) * 0.04
        cuff = el + (wr - el) * 0.9
        m.add(cone(tuple(top), tuple(el), 0.061, 0.051), {f"upper_arm.{S}": 1.0}, "jacket", k=0.02, name="sleeve_up")
        m.add(cone(tuple(el), tuple(cuff), 0.051, 0.046), {f"forearm.{S}": 1.0}, "jacket", k=0.012, name="sleeve_low")
        # Three cuff buttons on the outside of each sleeve.
        out = np.cross(wr - el, (0, 1, 0))
        out = out / np.linalg.norm(out) * s
        for i in range(3):
            c = el + (wr - el) * (0.8 - 0.045 * i) + out * 0.047 + np.array((0, -0.012, 0))
            m.add(sphere(tuple(c), 0.0055), {f"forearm.{S}": 1.0}, "button", name="cuff_button")
    # The opening: a V from the top button up to the collar, cut through
    # the front, the shirt filling it.
    v = [(0.0, TOP_BUTTON - 0.005), (0.072, 1.40), (0.076, 1.47), (0.05, 1.56), (-0.05, 1.56), (-0.076, 1.47), (-0.072, 1.40)]
    m.cut(lambda q: np.maximum(polygon(v)(q), 0.02 - q[:, 1]), k=0.003, name="v_opening")
    shirt = _loft_z([(1.08, 0.150, 0.112, 0.10), (1.25, 0.165, 0.116, 0.10), (1.40, 0.17, 0.104, 0.10), (1.50, 0.12, 0.074, 0.08), (1.58, 0.07, 0.06, 0.06)])
    m.add(shirt, torso_bones, "shirt", k=0.002, name="shirt")
    # The tie: knot under the collar, then the blade, lying on the shirt.
    knot = (0.0, surface(shirt, 0, 1.54) + 0.008, 1.54)
    tie = [(0.017, 1.53), (0.054, 1.17), (0.0, 1.13), (-0.054, 1.17), (-0.017, 1.53)]

    def tie_bones(q):
        t = np.clip((1.36 - q[:, 2]) / 0.1, 0, 1)
        return {"x_tie": 1 - t, "x_tie_end": t}
    m.add(band(shirt, lambda q: np.maximum(polygon(tie)(q), polygon(v)(q) + 0.002), 0.006, front=0.03), tie_bones, "tie", k=0.002, name="tie")
    m.add(ellipsoid(knot, (0.019, 0.008, 0.018), rot(pitch=-12)), "chest", "tie", k=0.003, name="tie_knot")
    # The shirt collar round the neck, its points spread over the tie.
    m.add(loft((0, -0.012, 1.495), (0, -0.002, 1.612), [(0, 0.073, 0.074, 0.070, 0), (1, 0.068, 0.068, 0.066, 0)]), {"chest": 0.6, "neck": 0.4}, "shirt", k=0.004, name="collar")
    m.cut(lambda q: np.maximum(polygon([(0.0, 1.50), (0.03, 1.63), (-0.03, 1.63)])(q), 0.0 - q[:, 1]), k=0.002, name="collar_gap")
    m.add(box(knot, (0.017, 0.007, 0.016), 0.006, rot(pitch=-12)), "chest", "tie", k=0.002, name="tie_knot_front")
    for s in (1, -1):
        pts = [(s * 0.016, 1.565), (s * 0.070, 1.548), (s * 0.052, 1.47), (s * 0.026, 1.50)]
        m.add(band(shirt, polygon(pts), 0.009, front=0.02), "chest", "shirt", k=0.002, name="collar_point")
    # Wide notched lapels on the blazer, and its collar behind the neck.
    for s in (1, -1):
        lapel = [(0.002, TOP_BUTTON - 0.004), (0.074, 1.40), (0.078, 1.452), (0.122, 1.428), (0.168, 1.418), (0.15, 1.35), (0.104, 1.27), (0.05, 1.205)]
        collar = [(0.078, 1.455), (0.122, 1.432), (0.142, 1.475), (0.10, 1.53), (0.07, 1.56), (0.055, 1.545)]
        for name, pts in (("lapel", lapel), ("lapel_collar", collar)):
            pts = pts if s > 0 else mirror(pts)
            m.add(band(jacket, polygon(pts), 0.0075, front=0.01), "chest", "lapel", k=0.0015, name=name)
    collar_back = loft((0, -0.03, 1.47), (0, -0.018, 1.59), [(0, 0.10, 0.06, 0.088, 0), (1, 0.082, 0.05, 0.08, 0)])
    m.add(lambda q: np.maximum(collar_back(q), q[:, 1] + 0.01), "chest", "lapel", k=0.02, name="jacket_collar")
    # Buttons, the breast pocket and square, the flap pockets.
    for z in (TOP_BUTTON, 1.065):
        f = surface(jacket, 0.0, z)
        m.add(ellipsoid((0.0, f + 0.002, z), (0.0115, 0.0045, 0.0115)), torso_bones, "button", name="button")
    m.add(band(jacket, polygon([(0.085, 1.30), (0.165, 1.305), (0.165, 1.318), (0.085, 1.313)]), 0.0035, front=0.02), "chest", "jacket", k=0.001, name="welt")
    m.add(band(jacket, polygon([(0.095, 1.312), (0.150, 1.314), (0.140, 1.352), (0.124, 1.336), (0.112, 1.356), (0.100, 1.33)]), 0.007, front=0.02), "chest", "square", k=0.001, name="pocket_square")
    for s in (1, -1):
        flap = [(0.075, 0.985), (0.205, 0.985), (0.205, 1.04), (0.075, 1.04)]
        m.add(band(jacket, polygon(flap if s > 0 else mirror(flap)), 0.004, front=0.0), torso_bones, "jacket", k=0.001, name="flap")
    # The station pin on his left lapel, the mic clip on his right.
    pz, px = 1.395, 0.108
    pf = surface(jacket, px, pz) + 0.0075
    m.add(cone((px, pf - 0.002, pz), (px, pf + 0.004, pz), 0.0165, 0.0165), "chest", "pin", k=0.0, name="pin")
    mf = surface(jacket, -0.09, 1.385) + 0.0075
    m.add(box((-0.09, mf + 0.007, 1.385), (0.008, 0.007, 0.013), 0.003), "chest", "plastic", name="mic")

    # ---- Trousers: the seat under the blazer, then the legs.
    m.add(_loft_z([(0.79, 0.152, 0.098, 0.110), (0.86, 0.155, 0.100, 0.112), (0.93, 0.14, 0.09, 0.095)]), "hips", "trousers", k=0.012, name="seat")
    for s, S in ((1, "L"), (-1, "R")):
        hip, knee = (np.array(v) for v in j[f"thigh.{S}"])
        ankle = np.array(j[f"shin.{S}"][1])
        hem = ankle + np.array((0, 0.006, 0.03))
        th, sn = f"thigh.{S}", f"shin.{S}"
        m.add(cone(tuple(hip + (0, 0.0, -0.06)), tuple(knee), 0.086, 0.066), th, "trousers", k=0.03, name="thigh")
        m.add(cone(tuple(knee), tuple(hem), 0.068, 0.060), sn, "trousers", k=0.01, name="shin")
        # The break: trousers resting on the shoe.
        m.add(ellipsoid(tuple(hem + (0, 0.012, 0.0)), (0.060, 0.066, 0.022)), sn, "trousers", k=0.012, name="break")
        shoe(m, s, S, ankle)
    return m


def shoe(m, s, S, ankle):
    """An oxford: heel and quarters on the foot bone, the toe box on the toe."""
    x = ankle[0]
    rear = loft((x, -0.078, 0.045), (x, 0.13, 0.045), [
        (0.00, 0.036, 0.048, 0.045, 0.0), (0.20, 0.043, 0.068, 0.045, 0.0), (0.50, 0.046, 0.064, 0.045, 0.0), (0.80, 0.050, 0.045, 0.045, 0.0), (1.0, 0.050, 0.036, 0.045, 0.0),
    ], hint=(0, 0, 1), n=2.4)
    front = loft((x, 0.10, 0.045), (x, 0.222, 0.04), [
        (0.00, 0.050, 0.038, 0.045, 0.0), (0.45, 0.048, 0.030, 0.042, 0.0), (0.80, 0.040, 0.022, 0.040, 0.0), (1.0, 0.024, 0.016, 0.038, 0.0),
    ], hint=(0, 0, 1), n=2.2)
    flat = lambda fn: (lambda q: np.maximum(fn(q), -q[:, 2]))  # noqa: E731  the sole sits on the floor
    m.add(flat(rear), f"foot.{S}", "shoe", k=0.006, name="shoe")
    m.add(flat(front), f"toe.{S}", "shoe", k=0.012, name="toe")
    # Laces over the instep.
    for i in range(4):
        f = 0.045 + 0.016 * i
        z = 0.045 + 0.066 - 0.0075 * i
        m.add(cone((x - 0.013, f, z), (x + 0.013, f, z), 0.0022, 0.0022), f"foot.{S}", "sole", k=0.001, name="lace")
    # The sole and heel: a slightly wider band at the bottom.
    m.add(lambda q, r=rear, fr=front: np.maximum(np.minimum(r(q), fr(q)) - 0.0035, np.maximum(q[:, 2] - 0.014, -q[:, 2])), f"foot.{S}", "sole", k=0.0, name="sole")


def bounds():
    return (-0.62, -0.2, -0.005), (0.62, 0.3, 1.62)
