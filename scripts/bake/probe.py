"""Headless probe: report animation/action/frame structure of a rigged GLB.
Run: Blender --background --python scripts/bake/probe.py -- <model.glb>
"""
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
path = argv[0]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)

print("PROBE_OBJECTS")
for o in bpy.data.objects:
    print(f"  {o.type:10} {o.name!r}  dims={tuple(round(d, 3) for d in o.dimensions)}")
    ad = o.animation_data
    if ad:
        act = ad.action.name if ad.action else None
        print(f"      anim_data action={act!r} nla_tracks={[t.name for t in ad.nla_tracks]}")
        for t in ad.nla_tracks:
            for s in t.strips:
                print(f"        strip {s.name!r} action={s.action.name if s.action else None!r} "
                      f"range=({round(s.frame_start,1)},{round(s.frame_end,1)})")

print("PROBE_ACTIONS")
for a in bpy.data.actions:
    print(f"  action {a.name!r} range={tuple(round(f,2) for f in a.frame_range)} fcurves={len(a.fcurves)}")

sc = bpy.context.scene
print(f"PROBE_SCENE frame_start={sc.frame_start} frame_end={sc.frame_end} fps={sc.render.fps}")
