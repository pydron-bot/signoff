"""Dale Storm, Channel 0's weatherman (1987): blockout model and clips.

A blockout: rigid parts (each bound to one bone) in flat colours, to settle
size, proportion, silhouette and the rig before any detailed modelling.
"""
from lib.common import Parts, export_glb, triangles, vertex_colour_material
from lib.rig import Clip, Pose, build_rig, check_strikes, joints

ID = "dale"
HEIGHT = 1.80

SKIN = (226, 184, 150)
JACKET = (184, 146, 98)  # a camel blazer
LAPEL = (150, 116, 76)
TROUSERS = (92, 72, 58)
SHIRT = (238, 234, 224)
TIE = (186, 52, 42)
HAIR = (78, 52, 34)
SHOES = (44, 32, 26)
TEETH = (252, 250, 244)
DARK = (34, 28, 28)
PLASTIC = (58, 58, 64)
BUTTON = (220, 40, 40)


def lerp(a, b, t):
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def mirror(p):
    return (-p[0], p[1], p[2])


def ring(side, fwd, edge, up):
    """An octagon-ish torso cross-section at height `up`: half-width `side`,
    half-depth `fwd`, with the corners cut back by `edge`."""
    return [(sx * side, sf * (fwd - edge), up) for sx in (-1, 1) for sf in (-1, 1)] + \
        [(sx * (side - edge * 1.4), sf * fwd, up) for sx in (-1, 1) for sf in (-1, 1)]


def build_body(rig):
    j = joints(HEIGHT)
    p = Parts([vertex_colour_material("body"), vertex_colour_material("props", roughness=0.4)])

    # Torso: trousers, the jacket over the hips, abdomen and chest.
    p.hull("pelvis", ring(0.165, 0.10, 0.035, 0.84) + ring(0.17, 0.10, 0.035, 1.02), TROUSERS, "hips")
    p.hull("hem", ring(0.178, 0.112, 0.035, 0.95) + ring(0.172, 0.108, 0.035, 1.08), JACKET, "hips")
    p.hull("belly", ring(0.168, 0.106, 0.035, 1.05) + ring(0.172, 0.108, 0.035, 1.26), JACKET, "spine")
    p.hull("chest", ring(0.172, 0.108, 0.035, 1.23) + ring(0.215, 0.11, 0.04, 1.455), JACKET, "chest")
    p.hull("shirt", [(-0.075, 0.104, 1.455), (0.075, 0.104, 1.455), (0, 0.104, 1.25),
                     (-0.075, 0.116, 1.455), (0.075, 0.116, 1.455), (0, 0.116, 1.25)], SHIRT, "chest")
    # The wide tie, 1987's widest.
    p.hull("tie", [(-0.022, 0.118, 1.445), (0.022, 0.118, 1.445), (-0.048, 0.118, 1.2), (0.048, 0.118, 1.2), (0, 0.118, 1.13),
                   (-0.022, 0.13, 1.445), (0.022, 0.13, 1.445), (-0.048, 0.13, 1.2), (0.048, 0.13, 1.2), (0, 0.13, 1.13)], TIE, "chest")
    for s in (1, -1):
        p.hull(f"lapel{s}", [(s * 0.075, 0.112, 1.455), (s * 0.14, 0.11, 1.42), (s * 0.02, 0.112, 1.25),
                             (s * 0.075, 0.122, 1.455), (s * 0.14, 0.12, 1.42), (s * 0.02, 0.122, 1.25)], LAPEL, "chest")
    p.seg("collar", (0, 0.005, 1.43), (0, 0.008, 1.485), 0.06, 0.056, SHIRT, "chest")
    p.box("mic", (0.1, 0.122, 1.385), (0.016, 0.014, 0.026), DARK, "chest", mat=1)

    # Head: big 1987 hair, a fixed grin.
    p.seg("neck", (0, 0, 1.45), (0, 0.01, 1.57), 0.05, 0.048, SKIN, "neck")
    p.blob("head", (0, 0.015, 1.665), (0.093, 0.105, 0.12), SKIN, "head", subdiv=2)
    p.blob("hair", (0, -0.005, 1.727), (0.102, 0.114, 0.073), HAIR, "head", subdiv=2)
    p.blob("hair_back", (0, -0.035, 1.665), (0.097, 0.08, 0.085), HAIR, "head")
    p.blob("quiff", (0.02, 0.07, 1.765), (0.07, 0.05, 0.034), HAIR, "head")
    for s in (1, -1):
        p.box(f"eye{s}", (s * 0.036, 0.113, 1.688), (0.024, 0.012, 0.015), DARK, "head")
        p.box(f"brow{s}", (s * 0.038, 0.111, 1.712), (0.036, 0.012, 0.009), HAIR, "head")
        p.blob(f"ear{s}", (s * 0.094, 0.0, 1.665), (0.018, 0.03, 0.036), SKIN, "head")
    p.hull("nose", [(-0.012, 0.11, 1.675), (0.012, 0.11, 1.675), (0, 0.11, 1.678),
                    (-0.014, 0.112, 1.645), (0.014, 0.112, 1.645), (0, 0.137, 1.648)], SKIN, "head")
    p.box("grin", (0, 0.11, 1.624), (0.072, 0.016, 0.017), TEETH, "head")

    for s, side in (("L", 1), ("R", -1)):
        sh, el = j[f"upper_arm.{s}"]
        wr = j[f"forearm.{s}"][1]
        ht = j[f"hand.{s}"][1]
        # 1987 shoulder pads.
        p.blob(f"pad.{s}", (side * 0.19, 0, 1.425), (0.078, 0.078, 0.062), JACKET, f"shoulder.{s}")
        p.seg(f"upper_arm.{s}", sh, el, 0.056, 0.048, JACKET, f"upper_arm.{s}")
        p.blob(f"elbow.{s}", el, (0.048, 0.048, 0.048), JACKET, f"forearm.{s}")
        p.seg(f"forearm.{s}", el, lerp(el, wr, 0.86), 0.046, 0.04, JACKET, f"forearm.{s}")
        p.seg(f"cuff.{s}", lerp(el, wr, 0.84), wr, 0.038, 0.036, SHIRT, f"forearm.{s}")
        # A fist: a squarish block along the hand bone.
        p.seg(f"fist.{s}", lerp(wr, ht, -0.05), lerp(wr, ht, 0.62), 0.05, 0.048, SKIN, f"hand.{s}", verts=4, spin=0.785)

        hip, knee = j[f"thigh.{s}"]
        ankle = j[f"shin.{s}"][1]
        p.seg(f"thigh.{s}", lerp(hip, knee, -0.08), knee, 0.08, 0.062, TROUSERS, f"thigh.{s}")
        p.blob(f"knee.{s}", knee, (0.06, 0.06, 0.06), TROUSERS, f"shin.{s}")
        p.seg(f"shin.{s}", knee, lerp(knee, ankle, 0.9), 0.057, 0.054, TROUSERS, f"shin.{s}")
        x = ankle[0]
        p.hull(f"shoe.{s}", [(x + dx, f, u) for dx in (-0.047, 0.047) for f, u in ((-0.065, 0), (-0.065, 0.1), (0.0, 0.115), (0.13, 0), (0.13, 0.072))], SHOES, f"foot.{s}")
        p.hull(f"toecap.{s}", [(x + dx, f, u) for dx in (-0.045, 0.045) for f, u in ((0.128, 0), (0.128, 0.07))]
               + [(x + dx, 0.215, u) for dx in (-0.036, 0.036) for u in (0, 0.042)], SHOES, f"toe.{s}")

    # The forecast clicker, in the right hand.
    wr, ht = j["hand.R"]
    a, b = lerp(wr, ht, 0.1), lerp(wr, ht, 0.95)
    p.seg("clicker", (a[0], a[1] + 0.045, a[2]), (b[0], b[1] + 0.045, b[2]), 0.018, 0.016, PLASTIC, "hand.R", verts=4, mat=1)
    p.blob("clicker_button", (b[0], b[1] + 0.06, b[2] + 0.01), (0.01, 0.01, 0.01), BUTTON, "hand.R", subdiv=1, mat=1)
    return p.join(f"{ID}_body", rig)


# ---------------------------------------------------------------- poses

def stance(bob=0.0, **over):
    """Orthodox fighting stance: left foot and left hand lead, body turned a
    little toward the camera side. `bob` lowers the hips (breathing)."""
    parts = dict(
        hips={"offset": (0, 0.0, -0.07 - bob), "turn": (0, -25, 0)},
        spine=(4, -28, 0),
        chest=(8, -32, 0),
        neck=(0, -15, 0),
        head=(-4, -4, 0),
        shoulder_L=(8, -32, 0),
        shoulder_R=(8, -32, 0),
        foot_L={"pos": (0.12, 0.20, 0.09), "turn": (0, -15, 0)},
        foot_R={"pos": (-0.17, -0.20, 0.09), "turn": (0, -50, 0)},
        toe_L=(0, -15, 0),
        toe_R=(0, -50, 0),
        hand_L={"pos": (0.09, 0.38, 1.28 - bob * 0.6), "aim": (-0.1, 0.45, 0.9), "hint": (0, 1, 0)},
        hand_R={"pos": (-0.06, 0.18, 1.35 - bob * 0.6), "aim": (0.25, 0.4, 0.9), "hint": (0, 1, 0)},
    )
    parts.update(over)
    return Pose(**parts)


def jab(reach):
    """The lead hand out at `reach` (0 = guard, 1 = full extension)."""
    def mix(a, b):
        return lerp(a, b, reach)

    yaw = mix((-32,), (-55,))[0]
    return stance(
        hips={"offset": (0, 0.04 * reach, -0.07), "turn": (0, -25 - 10 * reach, 0)},
        spine=(4, -28 - 14 * reach, 0),
        chest=(8 + 2 * reach, yaw, 0),
        shoulder_L=(8, yaw - 6 * reach, 0),
        shoulder_R=(8, yaw, 0),
        hand_L={"pos": mix((0.09, 0.38, 1.28), (0.03, 0.72, 1.33)), "aim": mix((-0.1, 0.45, 0.9), (0, 1, 0.05)), "hint": mix((0, 1, 0), (0, 0, 1))},
    )


def clips(rig):
    out = []
    idle = Clip(rig, "idle", 60, HEIGHT, loop=True)
    for f, bob in ((1, 0.012), (31, 0.0), (61, 0.012)):
        idle.key(f, stance(bob))
    out.append(idle.finish())

    # s.FP, Clipboard Jab: 18 frames, active 7-8 (x 0.20…0.95, y 1.15…1.45).
    fp = Clip(rig, "s.FP", 18, HEIGHT)
    for f, r in ((1, 0.0), (4, -0.15), (7, 1.0), (8, 1.0), (12, 0.45), (18, 0.0)):
        fp.key(f, jab(r))
    out.append(fp.finish())
    strikes = {"s.FP": [((7, 8), "hand.L", (0.20, 0.95, 1.15, 1.45))]}
    return out, strikes


def build(out_dir, art_dir):
    from lib.common import reset_scene

    reset_scene()
    rig = build_rig(ID, HEIGHT)
    body = build_body(rig)
    actions, strikes = clips(rig)
    problems = []
    for a in actions:
        problems += check_strikes(rig, a, strikes.get(a.name, []))
    rig.animation_data.action = actions[0]

    import bpy

    bpy.context.scene.frame_set(1)
    rig.data.pose_position = "REST"
    bpy.context.view_layer.update()
    top = max((body.matrix_world @ v.co).z for v in body.data.vertices)
    rig.data.pose_position = "POSE"
    print(f"[{ID}] {triangles(body)} triangles, {len(body.data.materials)} materials, rest height {top:.3f} m")
    if problems:
        raise RuntimeError("strikes miss their hitboxes:\n  " + "\n  ".join(problems))

    art_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(art_dir / f"{ID}.blend"), compress=True)
    export_glb(out_dir / "fighters" / f"{ID}.glb", [rig, body])
