"""Secondary motion: a fighter's own x_* bones (a tie, hair, a key ring),
baked as a seeded spring from the bone each hangs from, so every clip gets
it without hand keys (BLENDER-TODO step 16 A).

Each x bone's tail is a particle pulled toward where the tail would be if the
bone were rigid on its parent, with damping: it lags behind the parent's
moves, overshoots and settles. The bone turns to point at the particle,
never more than `max` degrees off its rest direction (so nothing swings out
of the hurtbox checks). A bone with `follow` (a bone and a point on it, in
fighter space at rest) chases that point instead: a string whose far end is
on Mumbles' hand.

A spec: {name, parent, head, tail (fighter space), stiff (0…1, pull per
frame), damp (0…1), max (degrees), follow (optional)}. Parents first; an x
bone may hang from another (a tie in two pieces). Loops run three times
round and keep the last, so they wrap without a jump; other clips start at
rest and ease back to it over their last SETTLE frames, so the next clip
(which starts at rest) doesn't jump either.
"""
import math

import bpy
from mathutils import Matrix, Quaternion, Vector

from .common import fighter

STIFF, DAMP, MAX = 0.2, 0.3, 20.0
SETTLE = 8


def bake(rig, actions, specs, skinned=()):
    """Key every frame of every action's x bones."""
    if not specs:
        return
    # The meshes don't need deforming while we only read bones.
    mods = [m for o in skinned for m in o.modifiers if m.type == "ARMATURE"]
    for m in mods:
        m.show_viewport = False
    try:
        for a in actions:
            _bake(rig, a, specs)
    finally:
        for m in mods:
            m.show_viewport = True


def _bake(rig, action, specs):
    rig.animation_data.action = action
    sc = bpy.context.scene
    f0, f1 = int(action.frame_start), int(action.frame_end)
    loop = action.use_cyclic
    frames = list(range(f0, f1)) if loop else list(range(f0, f1 + 1))
    xs = {sp["name"] for sp in specs}
    reads = {sp["parent"] for sp in specs if sp["parent"] not in xs} | {sp["follow"][0] for sp in specs if sp.get("follow")}
    mats = {}
    for f in frames:
        sc.frame_set(f)
        mats[f] = {b: rig.pose.bones[b].matrix.copy() for b in reads}

    bones = rig.data.bones
    state, out = {}, {sp["name"]: {} for sp in specs}
    passes = 3 if loop else 1
    for n in range(passes):
        for f in frames:
            world = {}
            for sp in specs:
                name, par = sp["name"], sp["parent"]
                P = world[par] if par in world else mats[f][par]
                B0 = P @ bones[par].matrix_local.inverted() @ bones[name].matrix_local
                H = B0.translation.copy()
                length = bones[name].length
                T0 = B0 @ Vector((0, length, 0))
                if sp.get("follow"):
                    fb, at = sp["follow"]
                    target = mats[f][fb] @ bones[fb].matrix_local.inverted() @ fighter(*at)
                else:
                    target = T0
                x, v = state.get(name, (target.copy(), Vector((0, 0, 0))))
                v = v + (target - x) * sp.get("stiff", STIFF) - v * sp.get("damp", DAMP)
                x = x + v
                rest_d = (T0 - H).normalized()
                q = rest_d.rotation_difference((x - H).normalized())
                limit = math.radians(sp.get("max", MAX))
                if q.angle > limit:
                    q = Quaternion(q.axis, limit)
                if not sp.get("follow"):
                    x = H + (q @ rest_d) * length  # the tail stays on the bone
                state[name] = (x, v)
                R0 = B0.to_3x3()
                world[name] = Matrix.Translation(H) @ q.to_matrix().to_4x4() @ Matrix.Translation(-H) @ B0
                if n == passes - 1:
                    local = (R0.inverted() @ q.to_matrix() @ R0).to_quaternion()
                    if not loop and f > f1 - SETTLE:
                        local = Quaternion().slerp(local, (f1 - f) / SETTLE)
                    out[name][f] = local

    for name, keys in out.items():
        pb = rig.pose.bones[name]
        last = None
        for f in frames + ([f1] if loop else []):
            q = keys[f if f in keys else f0].copy()
            if last is not None and last.dot(q) < 0:
                q.negate()
            last = q
            pb.rotation_quaternion = q
            pb.location = (0, 0, 0)
            pb.keyframe_insert("rotation_quaternion", frame=f)
