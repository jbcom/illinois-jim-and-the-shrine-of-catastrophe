"""Bake a STATIC prop/building GLB (Meshy text-to-3d, no rig) to one transparent WebP.

Props don't animate — import the GLB, drop Meshy's reference Icosphere, point a fixed
ORTHOGRAPHIC SIDE camera at it, and render ONE frame with film_transparent for real
alpha. The orchestrator (pack-prop.ts) trims it and writes a manifest with the GROUND
anchor (horizontal centre, vertical bottom) so the runtime sits the prop on the floor.

Run (headless):
  Blender --background --python scripts/bake/bake-prop.py -- \
    --glb raw-assets/models/props/pitched-house/pitched-house.glb \
    --out <dir>/frame.png --size 512 [--yaw 0]

Emits one PNG at --out and a BAKE_PROP_META json line (size, yaw).
"""
import json
import math
import sys

import bpy
import mathutils

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


def arg(flag, default=None, cast=str):
    if flag not in argv:
        return default
    i = argv.index(flag) + 1
    if i >= len(argv):
        raise SystemExit(f"{flag} given without a value")
    return cast(argv[i])


GLB = arg("--glb")
OUT = arg("--out")
SIZE = arg("--size", 512, int)
YAW = math.radians(arg("--yaw", 0.0, float))
# Pitch (X-axis tilt) stands up a flat-lying prop (a disk/medallion/coin lying in
# the ground plane) so its FACE points at the side camera instead of its thin edge.
PITCH = math.radians(arg("--pitch", 0.0, float))
MARGIN = arg("--margin", 1.08, float)
assert GLB and OUT

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
scene = bpy.context.scene

for o in list(bpy.data.objects):
    if o.type == "MESH" and o.name.lower().startswith("icosphere"):
        bpy.data.objects.remove(o, do_unlink=True)

mesh_objs = [o for o in bpy.data.objects if o.type == "MESH"]
assert mesh_objs, "no prop mesh after dropping reference geometry"

# Optional yaw (Z) + pitch (X) so a chosen face points at the side camera.
root = mesh_objs[0]
if YAW or PITCH:
    for o in mesh_objs:
        o.rotation_mode = "XYZ"
        o.rotation_euler = (o.rotation_euler.x + PITCH, o.rotation_euler.y, o.rotation_euler.z + YAW)
    bpy.context.view_layer.update()

# World-space bounds (props aren't skinned, so object bound_box is exact).
mn = mathutils.Vector((1e9, 1e9, 1e9))
mx = mathutils.Vector((-1e9, -1e9, -1e9))
for o in mesh_objs:
    for c in o.bound_box:
        w = o.matrix_world @ mathutils.Vector(c)
        for i in range(3):
            mn[i] = min(mn[i], w[i])
            mx[i] = max(mx[i], w[i])
center = mathutils.Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, (mn.z + mx.z) / 2))
extent = max(mx.z - mn.z, mx.x - mn.x) * MARGIN

cam_data = bpy.data.cameras.new("PropCam")
cam_data.type = "ORTHO"
cam_data.ortho_scale = extent
cam = bpy.data.objects.new("PropCam", cam_data)
scene.collection.objects.link(cam)
cam.location = mathutils.Vector((center.x, center.y - 14.0, center.z))
cam.rotation_euler = mathutils.Euler((math.radians(90), 0, 0), "XYZ")
scene.camera = cam

for ang, e in (((60, 0, -30), 3.0), ((70, 0, 150), 1.4)):
    light = bpy.data.objects.new("L", bpy.data.lights.new("L", "SUN"))
    light.data.energy = e
    light.rotation_euler = mathutils.Euler([math.radians(a) for a in ang], "XYZ")
    scene.collection.objects.link(light)

r = scene.render
r.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in {e.identifier for e in type(r).bl_rna.properties["engine"].enum_items} else "BLENDER_EEVEE"
r.resolution_x = SIZE
r.resolution_y = SIZE
r.film_transparent = True
r.image_settings.file_format = "PNG"
r.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "Standard"
r.filepath = OUT
bpy.ops.render.render(write_still=True)
print("BAKE_PROP_META " + json.dumps({"size": SIZE, "yaw": math.degrees(YAW), "out": OUT}))
