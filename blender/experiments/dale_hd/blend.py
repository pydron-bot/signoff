"""SDF meshes into Blender objects, with flat label colours for previews."""
import bpy
import numpy as np

# Preview / albedo base colours per label (sRGB 0–255).
COLOURS = {
    "skin": (222, 172, 140), "lip": (196, 120, 110), "mouth": (90, 28, 34), "nostril": (120, 70, 60), "lidrim": (200, 140, 125),
    "brow": (80, 56, 38), "eye": (240, 236, 228), "cornea": (240, 236, 228), "tooth": (250, 250, 246), "gum": (200, 110, 110),
    "hair": (78, 52, 34), "jacket": (184, 146, 98), "lapel": (178, 140, 92), "shirt": (238, 234, 224), "tie": (186, 52, 42),
    "trousers": (92, 72, 58), "shoe": (44, 32, 26), "sole": (30, 24, 20), "button": (40, 32, 28), "square": (120, 170, 220),
    "pin": (200, 30, 40), "plastic": (58, 58, 64), "red": (220, 40, 40), "nail": (232, 190, 170), "lining": (120, 90, 60),
}


def to_object(name, verts, faces, model=None):
    """A mesh object in Blender space from fighter-space verts; with a model,
    a `Col` colour attribute from each vertex's nearest label."""
    me = bpy.data.meshes.new(name)
    v = np.asarray(verts, dtype=np.float64).copy()
    v[:, 1] *= -1  # fighter fwd → Blender −Y
    me.from_pydata(v.tolist(), [], faces)
    me.validate()
    # Face winding from OpenVDB faces inward for our sign convention: flip.
    me.flip_normals()
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    for p in me.polygons:
        p.use_smooth = True
    if model is not None:
        _, lab = model.nearest(np.asarray(verts, dtype=np.float32))
        col = np.array([COLOURS.get(l, (255, 0, 255)) for l in lab], dtype=np.float32) / 255.0
        lin = np.where(col <= 0.04045, col / 12.92, ((col + 0.055) / 1.055) ** 2.4)
        attr = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
        rgba = np.concatenate([lin, np.ones((len(lin), 1), np.float32)], axis=1)
        attr.data.foreach_set("color", rgba.ravel())
    return obj
