"""Bake a rigged GLB's animation clips to transparent sprite frames + a sheet.

Blender bpy production baker for the Illinois Jim pipeline. Loads a rigged/animated
GLB, drops Meshy's reference Icosphere, points a fixed ORTHOGRAPHIC SIDE camera at the
character, renders the active clip's frame range to N transparent PNG frames (real
alpha via film_transparent), then packs them into one horizontal WEBP sprite sheet and
writes a manifest.

The camera ortho scale + center are computed ONCE from a reference clip (so every clip
of a character shares the same pixel scale + ground anchor — frames never jitter in
size between idle/walk/run). Pass --ortho-scale / --center-z to reuse a baked scale.

Run (headless):
  Blender --background --python scripts/bake/bake.py -- \
    --glb raw-assets/models/jim/jim-walk-final.glb \
    --out public/assets/sprites/jim/walk \
    --name walk --frames 16 --size 256 [--ortho-scale 2.4 --center-z 0.9]

Outputs:
  <out>/<name>.webp        horizontal sprite sheet (frames left→right)
  <out>/<name>.json        { name, frameWidth, frameHeight, frameCount, fps,
                             anchorX, anchorY, orthoScale, centerZ }
  <out>/frames/*.png       individual transparent frames (kept for inspection)
"""
import json
import math
import os
import sys

import bpy
import mathutils

# ---- args -------------------------------------------------------------------
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
NAME = arg("--name", "clip")
FRAMES = arg("--frames", 16, int)
SIZE = arg("--size", 256, int)  # rendered tile is SIZE×SIZE
ORTHO_SCALE = arg("--ortho-scale", None, float)
CENTER_Z = arg("--center-z", None, float)
MARGIN = arg("--margin", 1.22, float)  # framing headroom multiplier

assert GLB and OUT, "need --glb and --out"
FRAMES_DIR = os.path.join(OUT, "frames")
os.makedirs(FRAMES_DIR, exist_ok=True)

# ---- import -----------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
scene = bpy.context.scene

# Drop Meshy's reference sphere + any stray non-character meshes.
for o in list(bpy.data.objects):
    if o.type == "MESH" and o.name.lower().startswith("icosphere"):
        bpy.data.objects.remove(o, do_unlink=True)

mesh_objs = [o for o in bpy.data.objects if o.type == "MESH"]
assert mesh_objs, "no character mesh after dropping reference geometry"

# ---- world-space DEFORMED bounds of the character ---------------------------
# bound_box is the rest-pose (un-deformed) box and ignores armature deformation, so
# extreme poses (jump tuck / overhead reach) would clip. Sample the EVALUATED mesh
# vertices instead, across several frames of the clip, for a true worst-case envelope.
def deformed_bounds(frames_to_sample):
    mn = mathutils.Vector((1e9, 1e9, 1e9))
    mx = mathutils.Vector((-1e9, -1e9, -1e9))
    for fn in frames_to_sample:
        scene.frame_set(fn)
        dg = bpy.context.evaluated_depsgraph_get()
        for o in mesh_objs:
            ev = o.evaluated_get(dg)
            me = ev.to_mesh()
            mw = ev.matrix_world
            for v in me.vertices:
                w = mw @ v.co
                for i in range(3):
                    mn[i] = min(mn[i], w[i])
                    mx[i] = max(mx[i], w[i])
            ev.to_mesh_clear()
    return mn, mx


# ---- render settings (set engine first; bounds are clip-relative) -----------
r = scene.render
r.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in {e.identifier for e in type(r).bl_rna.properties["engine"].enum_items} else "BLENDER_EEVEE"
r.resolution_x = SIZE
r.resolution_y = SIZE
r.resolution_percentage = 100
r.film_transparent = True
r.image_settings.file_format = "PNG"
r.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "Standard"  # no filmic tonemap on sprites

# ---- resolve the real clip action + frame range -----------------------------
# glTF export stashes authored clips as NLA strips and leaves a tiny stub action
# active. Pick the strip whose action best matches --name (else the longest strip),
# make it the ACTIVE action so scene.frame_set animates it, and take its range.
CLIP = arg("--name", NAME)
f0, f1 = scene.frame_start, scene.frame_end
for o in bpy.data.objects:
    if o.type != "ARMATURE" or not o.animation_data:
        continue
    ad = o.animation_data
    strips = [s for t in ad.nla_tracks for s in t.strips if s.action]
    if strips:
        named = [s for s in strips if CLIP.lower() in s.action.name.lower()]
        pool = named or strips
        chosen = max(pool, key=lambda s: s.frame_end - s.frame_start)
        ad.action = chosen.action  # promote to active so it evaluates
        for t in ad.nla_tracks:
            t.mute = True
        bpy.context.view_layer.update()  # flush stale NLA pose before frame 0
        fr = chosen.action.frame_range
    elif ad.action:
        fr = ad.action.frame_range
    else:
        fr = (scene.frame_start, scene.frame_end)
    f0, f1 = int(math.floor(fr[0])), int(math.ceil(fr[1]))
    break

# Sample FRAMES across [f0, f1) — drop the last to avoid a duplicate loop frame.
span = max(1, f1 - f0)
frame_nums = [f0 + round(span * i / FRAMES) for i in range(FRAMES)]

# Worst-case deformed envelope across the clip (a coarse sample is enough for scale).
bound_samples = sorted(set(frame_nums)) or [f0]
mn, mx = deformed_bounds(bound_samples)
# Character stands on +Z up (Meshy/glTF Y-up imported as Z-up by Blender's gltf).
center = mathutils.Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, (mn.z + mx.z) / 2))
height = mx.z - mn.z
width = mx.x - mn.x

# Shared scale: caller-provided (cross-clip consistency) or derived from this clip.
ortho_scale = ORTHO_SCALE if ORTHO_SCALE else max(height, width) * MARGIN
center_z = CENTER_Z if CENTER_Z is not None else center.z

# ---- ortho side camera: look along -Y at the character ----------------------
cam_data = bpy.data.cameras.new("BakeCam")
cam_data.type = "ORTHO"
cam_data.ortho_scale = ortho_scale
cam = bpy.data.objects.new("BakeCam", cam_data)
scene.collection.objects.link(cam)
cam.location = mathutils.Vector((center.x, center.y - 12.0, center_z))
cam.rotation_euler = mathutils.Euler((math.radians(90), 0, 0), "XYZ")  # +Y up in frame
scene.camera = cam

# ---- lighting: flat, even (silhouette + albedo read; no harsh shadows) ------
sun = bpy.data.objects.new("Key", bpy.data.lights.new("Key", "SUN"))
sun.data.energy = 3.0
sun.rotation_euler = mathutils.Euler((math.radians(60), 0, math.radians(-30)), "XYZ")
scene.collection.objects.link(sun)
fill = bpy.data.objects.new("Fill", bpy.data.lights.new("Fill", "SUN"))
fill.data.energy = 1.2
fill.rotation_euler = mathutils.Euler((math.radians(70), 0, math.radians(150)), "XYZ")
scene.collection.objects.link(fill)

# ---- render each sampled frame ---------------------------------------------
png_paths = []
for i, fn in enumerate(frame_nums):
    scene.frame_set(fn)
    bpy.context.view_layer.update()
    p = os.path.join(FRAMES_DIR, f"{NAME}_{i:03d}.png")
    r.filepath = p
    bpy.ops.render.render(write_still=True)
    png_paths.append(p)

print(f"BAKE_DONE name={NAME} frames={len(png_paths)} ortho_scale={ortho_scale:.4f} center_z={center_z:.4f}")
# Emit machine-readable line the JS packer reads.
print("BAKE_META " + json.dumps({
    "name": NAME,
    "tile": SIZE,
    "frameCount": len(png_paths),
    "fps": scene.render.fps,
    "orthoScale": round(ortho_scale, 5),
    "centerZ": round(center_z, 5),
    "framesDir": FRAMES_DIR,
    "out": OUT,
}))
