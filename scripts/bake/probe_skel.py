"""List the armature bone hierarchy to assess retarget compatibility."""
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=argv[0])
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
print(f"PROBE bone_count={len(arm.data.bones)}")
for b in arm.data.bones:
    print(f"PROBE bone {b.name}  parent={b.parent.name if b.parent else None}")
