"""Dale's head: skull, face, ears and neck as one skin surface, plus the
eyes and teeth as their own pieces. Numbers are head-local (side, fwd, up)
metres from the point between the ear canals; adult male proportions (a
24.5 cm head), then Dale: a strong square chin, high cheekbones pushed up by
a fixed grin, eyebrows permanently raised."""
import numpy as np

from .sdf import Model, chain, cone, ellipsoid, rot, sphere

# The point between the ear canals, in fighter space (the rig's jaw hinge
# sits just below and in front of it).
ORIGIN = np.array((0.0, -0.004, 1.722))
EYE = (0.0318, 0.0735, 0.0105)  # eyeball centre (left; the right mirrors)
EYE_R = 0.0119


def H(x, f, u):
    return (x + ORIGIN[0], f + ORIGIN[1], u + ORIGIN[2])


def Hr(*r):
    return r


def both(fn):
    """Call fn(s) for s = +1 (left) and −1 (right)."""
    for s in (1, -1):
        fn(s)


def skin():
    m = Model("head")
    J = {"jaw": 1.0}
    HJ = {"head": 0.5, "jaw": 0.5}

    # The cranium, and a slightly flatter forehead in front.
    m.add(ellipsoid(H(0, -0.010, 0.040), (0.0770, 0.0985, 0.0905)), "head", "skin", name="cranium")
    m.add(ellipsoid(H(0, 0.040, 0.058), (0.064, 0.050, 0.062)), "head", "skin", k=0.02, name="forehead")
    # Temples a little hollow, the occiput rounding down into the neck.
    m.add(ellipsoid(H(0, -0.062, -0.012), (0.058, 0.052, 0.062)), "head", "skin", k=0.03, name="occiput")
    # The brow ridge and glabella.
    both(lambda s: m.add(cone(H(s * 0.050, 0.066, 0.030), H(s * 0.014, 0.081, 0.032), 0.0080, 0.0092), "head", "skin", k=0.014, name="brow"))
    m.add(sphere(H(0, 0.082, 0.030), 0.0105), "head", "skin", k=0.012, name="glabella")
    # Cheekbones (zygomatic arch running back to the ear) and the cheeks,
    # round and lifted by the grin.
    both(lambda s: m.add(ellipsoid(H(s * 0.046, 0.048, -0.001), (0.013, 0.018, 0.010), rot(yaw=-s * 30)), "head", "skin", k=0.022, name="zygoma"))
    both(lambda s: m.add(cone(H(s * 0.054, 0.036, -0.002), H(s * 0.060, 0.000, 0.002), 0.0040, 0.0035), "head", "skin", k=0.024, name="arch"))
    both(lambda s: m.add(ellipsoid(H(s * 0.035, 0.064, -0.024), (0.020, 0.019, 0.020)), "head", "skin", k=0.02, name="cheek"))
    # The maxilla and lower face mass, and the jaw: gonion to a square chin.
    m.add(ellipsoid(H(0, 0.050, -0.042), (0.040, 0.040, 0.036)), "head", "skin", k=0.02, name="maxilla")
    both(lambda s: m.add(cone(H(s * 0.047, -0.006, -0.012), H(s * 0.047, 0.000, -0.069), 0.012, 0.011), HJ, "skin", k=0.02, name="ramus"))
    both(lambda s: m.add(cone(H(s * 0.047, 0.000, -0.069), H(s * 0.020, 0.074, -0.100), 0.011, 0.011), J, "skin", k=0.02, name="jawline"))
    m.add(ellipsoid(H(0, 0.076, -0.092), (0.029, 0.019, 0.019)), J, "skin", k=0.014, name="chin")
    both(lambda s: m.add(sphere(H(s * 0.012, 0.083, -0.095), 0.010), J, "skin", k=0.01, name="chin_corner"))
    m.add(ellipsoid(H(0, 0.040, -0.075), (0.044, 0.042, 0.030)), J, "skin", k=0.02, name="lower_face")
    m.add(ellipsoid(H(0, 0.028, -0.098), (0.040, 0.040, 0.020)), J, "skin", k=0.02, name="under_jaw")

    # The nose: bridge, tip, wings, columella; nostrils cut.
    m.add(cone(H(0, 0.090, 0.020), H(0, 0.115, -0.014), 0.0072, 0.0082, squash=(0.8, 1.0)), "head", "skin", k=0.008, name="bridge")
    m.add(sphere(H(0, 0.1145, -0.019), 0.0108), "head", "skin", k=0.006, name="tip")
    both(lambda s: m.add(ellipsoid(H(s * 0.0110, 0.0995, -0.0262), (0.0072, 0.0098, 0.0068)), "head", "skin", k=0.007, name="ala"))
    m.add(cone(H(0, 0.111, -0.026), H(0, 0.101, -0.0335), 0.0042, 0.0036), "head", "skin", k=0.004, name="columella")
    # The nose's base, filling between the wings and back to the face (without
    # it the bridge, tip and wings leave a tunnel behind the tip).
    m.add(ellipsoid(H(0, 0.097, -0.024), (0.013, 0.015, 0.011)), "head", "skin", k=0.006, name="nose_base")
    both(lambda s: m.cut(ellipsoid(H(s * 0.0072, 0.1035, -0.0322), (0.0040, 0.0060, 0.0024), rot(yaw=s * 20)), k=0.0015, name="nostril", label="nostril"))
    # Creases of the ala and the nasolabial folds the grin carves.
    both(lambda s: m.cut(cone(H(s * 0.0195, 0.098, -0.022), H(s * 0.0185, 0.099, -0.032), 0.0012, 0.0012), k=0.002, name="ala_crease"))
    both(lambda s: m.cut(chain([H(s * 0.024, 0.093, -0.026), H(s * 0.029, 0.0895, -0.040), H(s * 0.033, 0.083, -0.056), H(s * 0.034, 0.076, -0.068)],
                               [0.0006, 0.0013, 0.0013, 0.0006]), k=0.004, name="nasolabial"))

    # The grin: lips stretched wide, corners up, upper teeth showing.
    def arc(y0, sag, f0, n=7, w=0.0275, lift=0.006):
        pts = []
        for i in range(n):
            t = -1 + 2 * i / (n - 1)
            x = t * w
            pts.append(H(x, f0 - 0.017 * t * t, y0 - sag * (1 - t * t) + lift * t * t))
        return pts

    m.add(chain(arc(-0.0475, -0.0015, 0.0985), [0.0024, 0.0034, 0.0040, 0.0043, 0.0040, 0.0034, 0.0024]), "head", "lip", k=0.004, name="lip_top")
    m.add(chain(arc(-0.0640, 0.0065, 0.0935), [0.0026, 0.0042, 0.0053, 0.0057, 0.0053, 0.0042, 0.0026]), J, "lip", k=0.004, name="lip_bottom")
    # The skin of the upper lip, from the nose's base to the lip.
    m.add(ellipsoid(H(0, 0.087, -0.040), (0.021, 0.011, 0.011)), "head", "skin", k=0.008, name="upper_lip_skin")
    # The philtrum's two ridges, and the dip under the lower lip.
    both(lambda s: m.add(cone(H(s * 0.0042, 0.0985, -0.0355), H(s * 0.0050, 0.0995, -0.0435), 0.0018, 0.0021), "head", "skin", k=0.004, name="philtrum"))
    m.cut(ellipsoid(H(0, 0.0975, -0.0765), (0.016, 0.004, 0.0032)), k=0.005, name="labiomental")
    # The mouth opening, and the cavity behind it.
    m.cut(chain(arc(-0.0545, 0.0045, 0.0965, w=0.0262, lift=0.0045), [0.0012, 0.0036, 0.0048, 0.0052, 0.0048, 0.0036, 0.0012]), k=0.0015, name="mouth", label="mouth")
    m.cut(ellipsoid(H(0, 0.067, -0.056), (0.025, 0.026, 0.012)), k=0.002, name="cavity", label="mouth")

    # Eyes: lids wrap a ball a little bigger than the eye, an almond cut
    # opens them; brows sit high (Dale's raised brows) over a lid crease.
    for s in (1, -1):
        c = H(s * EYE[0], EYE[1], EYE[2])
        m.add(sphere(c, EYE_R + 0.0021), "head", "skin", k=0.006, name="lids")
        m.cut(ellipsoid(H(s * 0.0322, 0.0855, 0.0108), (0.0148, 0.012, 0.0058), rot(roll=-s * 4)), k=0.0012, name="fissure", label="lidrim")
        m.cut(chain([H(s * 0.020, 0.0855, 0.0215), H(s * 0.033, 0.0835, 0.0245), H(s * 0.045, 0.076, 0.020)], [0.0011, 0.0014, 0.0009]), k=0.003, name="lid_crease")
        # Lower lid bag pushed up by the grin.
        m.add(cone(H(s * 0.024, 0.0835, 0.0005), H(s * 0.043, 0.0775, 0.0035), 0.0026, 0.0022), "head", "skin", k=0.004, name="lower_lid")
        m.add(cone(H(s * 0.016, 0.0855, 0.0355), H(s * 0.051, 0.0740, 0.0385), 0.0042, 0.0030), "head", "brow", k=0.008, name="brow_hair")
    # Forehead lines from the raised brows.
    for i in range(3):
        m.cut(cone(H(-0.034, 0.0, 0.050 + 0.0105 * i), H(0.034, 0.0, 0.050 + 0.0105 * i), 0.0009, 0.0009), k=0.002, name="forehead_line")
        # (a horizontal cylinder through the head; only its front grazes the skin)
        last = m.prims[-1]
        last.fn = _front_only(last.fn, 0.075 - 0.003 * i)

    # Ears.
    for s in (1, -1):
        ear(m, s)

    # The neck, down into the collar; the Adam's apple and the
    # sternocleidomastoids.
    from .sdf import loft
    m.add(loft(H(0, -0.024, -0.235), H(0, -0.012, -0.045),
               [(0.0, 0.068, 0.060, 0.062, 0.0), (0.45, 0.060, 0.054, 0.058, 0.0), (1.0, 0.056, 0.050, 0.056, 0.0)]),
          _neck_bones, "skin", k=0.03, name="neck")
    m.add(ellipsoid(H(0, 0.030, -0.165), (0.0075, 0.006, 0.012)), "neck", "skin", k=0.016, name="adams_apple")
    both(lambda s: m.add(cone(H(s * 0.052, -0.022, -0.050), H(s * 0.014, 0.046, -0.225), 0.012, 0.010, squash=(1.0, 0.7)), "neck", "skin", k=0.018, name="scm"))
    return m


def _neck_bones(q):
    """The neck's foot rides the chest (inside the collar), its top the head."""
    t = np.clip((q[:, 2] - 1.52) / 0.06, 0, 1)
    u = np.clip((q[:, 2] - 1.63) / 0.04, 0, 1)
    return {"chest": 1 - t, "neck": t * (1 - u), "head": t * u}


def _front_only(fn, f_min):
    def g(q):
        d = fn(q)
        return np.where(q[:, 1] > ORIGIN[1] + f_min, d, 1.0)
    return g


def ear(m, s):
    R = rot(yaw=-s * 18)
    c = H(s * 0.0760, -0.010, 0.002)
    # The outer ear: a thin shell, its rim (helix) a tube round the back and
    # top, the lobe, and the bowl (concha) cut in.
    m.add(ellipsoid(c, (0.0075, 0.0165, 0.0305), R), "head", "skin", k=0.006, name="ear")
    rim = []
    for a in np.radians(np.linspace(-80, 200, 9)):
        rim.append(np.array(c) + R.T @ np.array((s * 0.0045, 0.0145 * np.cos(a) - 0.002, 0.028 * np.sin(a) + 0.002)) * np.array((1, 1, 1)))
    m.add(chain([tuple(p) for p in rim], [0.0022, 0.0030, 0.0032, 0.0032, 0.0030, 0.0028, 0.0026, 0.0024, 0.0022]), "head", "skin", k=0.002, name="helix")
    m.add(ellipsoid(np.array(c) + (s * 0.002, 0.002, -0.026), (0.006, 0.0085, 0.0085)), "head", "skin", k=0.004, name="lobe")
    m.cut(ellipsoid(np.array(c) + (s * 0.0085, 0.003, -0.004), (0.0055, 0.0085, 0.011), R), k=0.003, name="concha", label="skin")
    m.cut(ellipsoid(np.array(c) + (s * 0.0080, -0.001, 0.0125), (0.0035, 0.0085, 0.0075), R), k=0.002, name="scapha", label="skin")
    # The tragus in front of the bowl.
    m.add(sphere(np.array(c) + (s * 0.004, 0.0125, -0.006), 0.0038), "head", "skin", k=0.003, name="tragus")


def eyes():
    """The eyeballs with a corneal bulge (painted with an iris later)."""
    m = Model("eyes")
    for s in (1, -1):
        c = np.array(H(s * EYE[0], EYE[1], EYE[2]))
        m.add(sphere(c, EYE_R), "head", "eye", name="eyeball")
        m.add(sphere(c + (0, 0.0062, 0.0), 0.0077), "head", "cornea", k=0.002, name="cornea")
    return m


def teeth():
    """The upper teeth (and a little of the lower) in an arch behind the
    lips, the gum line above them."""
    m = Model("teeth")
    n = 12
    for i in range(n):
        t = -1 + 2 * (i + 0.5) / n
        x = t * 0.0255
        f = 0.0915 - 0.020 * t * t
        w = (0.0042 if abs(t) < 0.2 else 0.0036 if abs(t) < 0.55 else 0.0034)
        a = -np.degrees(np.arctan2(2 * 0.020 * t, 0.0255)) * 0.9
        c = H(x, f, -0.0545 + 0.006 * t * t)
        from .sdf import box
        m.add(box(c, (w, 0.0032, 0.0052), 0.0016, rot(yaw=a)), "head", "tooth", k=0.0006, name="tooth")
        cl = H(x * 0.92, f - 0.002, -0.0635 + 0.006 * t * t)
        m.add(box(cl, (w * 0.82, 0.0028, 0.0040), 0.0014, rot(yaw=a)), "jaw", "tooth", k=0.0006, name="tooth_low")
    g = [H(x, 0.0895 - 0.020 * (x / 0.0255) ** 2, -0.0487 + 0.006 * (x / 0.0255) ** 2) for x in np.linspace(-0.027, 0.027, 7)]
    m.add(chain(g, [0.0030] * 7), "head", "gum", k=0.0015, name="gum")
    return m


def hair():
    """Helmet hair: a shell over the skull above the hairline, parted on his
    left and swept to his right, a quiff rolling forward off the parting,
    short sideburns; combed grooves cut along the sweep."""
    m = Model("hair")
    skull = ellipsoid(H(0, -0.010, 0.040), (0.0770, 0.0985, 0.0905))
    top = ellipsoid(H(0, -0.008, 0.046), (0.0790, 0.1010, 0.0935))

    def hairline(q):
        # Positive below the hairline (so the shell is cut there).
        x, f, u = q[:, 0] - ORIGIN[0], q[:, 1] - ORIGIN[1], q[:, 2] - ORIGIN[2]
        ax = np.abs(x)
        front = 0.083 - 0.55 * np.maximum(ax - 0.025, 0)          # forehead, receding at the temples
        side = 0.030 + 0.25 * np.maximum(f - 0.03, 0)              # over the ears
        line = np.where(f > 0.045, np.maximum(front, side), side)
        burn = (f > 0.0) & (f < 0.022) & (ax > 0.062)              # sideburns
        line = np.where(burn, -0.012, line)
        # Behind the ears it drops to the nape.
        nape = -0.072 + 1.2 * np.maximum(ax - 0.045, 0)
        line = np.where(f < -0.02, np.minimum(line, np.maximum(nape, side - 5.0 * (-0.02 - f))), line)
        return line - u

    m.add(lambda q: top(q) - 0.010, "head", "hair", name="hair")
    m.add(ellipsoid(H(0, -0.064, -0.010), (0.066, 0.060, 0.068)), "head", "hair", k=0.02, name="hair_back")
    m.add(ellipsoid(H(-0.006, 0.050, 0.112), (0.062, 0.056, 0.028), rot(roll=-6)), {"head": 0.4, "x_quiff": 0.6}, "hair", k=0.025, name="quiff")
    m.add(ellipsoid(H(0.020, 0.084, 0.100), (0.048, 0.024, 0.020), rot(roll=-14, pitch=10)), {"head": 0.2, "x_quiff": 0.8}, "hair", k=0.018, name="quiff_roll")
    m.inter(lambda q: hairline(q), k=0.009, name="hairline")
    # Keep the ears clear.
    for s in (1, -1):
        m.cut(ellipsoid(H(s * 0.080, -0.010, 0.0), (0.03, 0.026, 0.040)), k=0.006, name="ear_clear")
    # The parting on his left, and the skin under it.
    m.cut(cone(H(0.034, 0.095, 0.105), H(0.040, -0.04, 0.12), 0.0016, 0.0012), k=0.002, name="part")

    def comb(q):
        # Grooves along the sweep: away from the part toward his right and back.
        x, f, u = q[:, 0] - ORIGIN[0], q[:, 1] - ORIGIN[1], q[:, 2] - ORIGIN[2]
        phase = (f * 0.8 + u * 0.5 + 0.35 * x) / 0.0042
        return 0.00045 * np.sin(phase * 2 * np.pi) + 0.0002 * np.sin(phase * 5.3)
    m.displace.append(comb)
    return m
