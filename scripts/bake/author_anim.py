"""Author real locomotion clips on Jim's rig in Blender, then save a per-clip GLB.

Meshy's free walk/run clips are degenerate (arms locked in a jittering T-pose), so we
drive the named humanoid bones ourselves — full creative control, deterministic.

Rig: 24-bone Mixamo-style humanoid. The mesh is authored facing -Y, so we YAW the rig
270° about Z to face screen-right (+X) — a clean side-scroller profile. Empirically
(isolated single-axis bakes), a limb bone's LOCAL X rotation swings its tip in the
sagittal (forward/back, X-Z) plane the side camera sees — perfect for striding legs.

The upper arms' BIND pose points forward (a Meshy quirk), so before swinging we drop
each arm to hang down by aligning its bind world-direction to -Z via a computed
rotation (no axis guesswork), then add the X-swing on top.

Run: Blender --background --python scripts/bake/author_anim.py -- \
  --glb raw-assets/models/jim/jim-rigged.glb --clip walk --out /tmp/jim-walk-authored.glb

Clips: idle | walk | run | jump.
"""
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
CLIP = arg("--clip", "walk")
OUT = arg("--out")
YAW = math.radians(arg("--yaw", 270.0, float))
assert GLB and OUT

D = math.radians

PARAMS = {
    "idle": dict(frames=48, swing=3.0, bob=0.022, lean=2.0, knee=6.0, elbow=10.0, arm_scale=0.4),
    "walk": dict(frames=24, swing=24.0, bob=0.045, lean=6.0, knee=42.0, elbow=12.0, arm_scale=0.55),
    "run": dict(frames=18, swing=42.0, bob=0.09, lean=20.0, knee=82.0, elbow=58.0, arm_scale=0.8),
    "jump": dict(frames=18, swing=34.0, bob=0.0, lean=10.0, knee=62.0, elbow=44.0, arm_scale=0.7),
    # attack/hurt/death params are read by their own authors; gait fields are kept only
    # for the shared rest-pose setup that runs before the clip branch.
    "attack": dict(frames=16, swing=0.0, bob=0.0, lean=0.0, knee=8.0, elbow=20.0, arm_scale=1.0),
    "hurt": dict(frames=10, swing=0.0, bob=0.0, lean=0.0, knee=10.0, elbow=20.0, arm_scale=1.0),
    "death": dict(frames=20, swing=0.0, bob=0.0, lean=0.0, knee=10.0, elbow=20.0, arm_scale=1.0),
}
P = PARAMS[CLIP]
N = P["frames"]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
scene = bpy.context.scene
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")

for o in list(bpy.data.objects):
    if o.type == "MESH" and o.name.lower().startswith("icosphere"):
        bpy.data.objects.remove(o, do_unlink=True)

if arm.animation_data:
    for t in list(arm.animation_data.nla_tracks):
        arm.animation_data.nla_tracks.remove(t)
    arm.animation_data.action = None

arm.rotation_mode = "XYZ"
arm.rotation_euler = (0, 0, YAW)

bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="POSE")
for pb in arm.pose.bones:
    pb.rotation_mode = "QUATERNION"
    pb.rotation_quaternion = (1, 0, 0, 0)
    pb.location = (0, 0, 0)
bpy.context.view_layer.update()


def bone_world_dir(name):
    """Unit world-space direction the bone points (head→tail) at current pose."""
    pb = arm.pose.bones[name]
    head = arm.matrix_world @ pb.head
    tail = arm.matrix_world @ pb.tail
    return (tail - head).normalized()


def align_quat_local(name, target_world):
    """Local-space quaternion that rotates the bone to point along target_world."""
    pb = arm.pose.bones[name]
    cur = bone_world_dir(name)
    tgt = mathutils.Vector(target_world).normalized()
    q_world = cur.rotation_difference(tgt)  # world-space delta
    # Convert world delta to the bone's local space (parent + rest).
    m = (arm.matrix_world @ pb.matrix).to_3x3()
    m_inv = m.inverted()
    axis_w, ang = q_world.to_axis_angle()
    axis_l = (m_inv @ axis_w).normalized()
    return mathutils.Quaternion(axis_l, ang)


# Drop both upper arms to hang straight down (-Z world) and the forearms to continue
# straight down (so they don't fold into the chest) as the rest offsets.
ARM_REST = {n: align_quat_local(n, (0, 0, -1)) for n in ("LeftArm", "RightArm")}
# Apply the upper-arm rest first so the forearm's current dir is measured hanging down.
for n in ("LeftArm", "RightArm"):
    arm.pose.bones[n].rotation_quaternion = ARM_REST[n]
bpy.context.view_layer.update()
FORE_REST = {n: align_quat_local(n, (0, 0, -1)) for n in ("LeftForeArm", "RightForeArm")}
for n in ("LeftArm", "RightArm"):
    arm.pose.bones[n].rotation_quaternion = (1, 0, 0, 0)
bpy.context.view_layer.update()

scene.frame_start = 1
scene.frame_end = N
scene.render.fps = 24


def key_x(bone, frame, deg, rest=None):
    """Key an X-swing (deg) on top of an optional rest quaternion."""
    pb = arm.pose.bones[bone]
    q = mathutils.Quaternion((1, 0, 0), D(deg))
    pb.rotation_quaternion = (rest @ q) if rest else q
    pb.keyframe_insert("rotation_quaternion", frame=frame)


def key_hip_z(frame, dz):
    pb = arm.pose.bones["Hips"]
    pb.location = (pb.location.x, pb.location.y, dz)
    pb.keyframe_insert("location", index=2, frame=frame)


swing = P["swing"]
arm_swing = swing * P["arm_scale"]
knee, elbow, bob = P["knee"], P["elbow"], P["bob"]


def author_gait():
    """Looping locomotion: thighs/arms counter-swing about local X, knees fold."""
    for i in range(N):
        f = i + 1
        ph = 2 * math.pi * i / N
        s = math.sin(ph)
        key_x("LeftUpLeg", f, +swing * s)
        key_x("RightUpLeg", f, -swing * s)
        bendL = knee * max(0.0, -math.sin(ph - math.pi / 3))
        bendR = knee * max(0.0, -math.sin(ph + math.pi - math.pi / 3))
        key_x("LeftLeg", f, +bendL)
        key_x("RightLeg", f, +bendR)
        key_x("LeftArm", f, -arm_swing * s, rest=ARM_REST["LeftArm"])
        key_x("RightArm", f, +arm_swing * s, rest=ARM_REST["RightArm"])
        key_x("LeftForeArm", f, elbow * (0.5 + 0.5 * math.cos(ph)), rest=FORE_REST["LeftForeArm"])
        key_x("RightForeArm", f, elbow * (0.5 + 0.5 * math.cos(ph + math.pi)), rest=FORE_REST["RightForeArm"])
        key_hip_z(f, bob * abs(math.cos(ph)) - bob * 0.5)
        key_x("Spine", f, -P["lean"] * 0.4)
        key_x("Spine01", f, -P["lean"] * 0.3)


def author_jump():
    """Non-looping jump: anticipation crouch → explosive extension → airborne tuck →
    landing absorb. Keyed at phase poses; symmetric legs, arms throw up then forward."""
    # (phase 0..1, hip dz, thigh deg, knee deg, arm deg from rest, spine lean deg)
    poses = [
        (0.00, 0.00, 0.0, 0.0, 0.0, 0.0),    # stand
        (0.18, -0.18, 36.0, 70.0, -40.0, 14.0),  # deep crouch, arms back
        (0.34, 0.06, -12.0, 8.0, 80.0, -6.0),    # launch: legs extend, arms throw up
        (0.55, 0.00, 28.0, 84.0, 50.0, 8.0),     # airborne tuck: knees up
        (0.78, -0.16, 30.0, 64.0, -10.0, 12.0),  # landing absorb
        (1.00, 0.00, 0.0, 0.0, 0.0, 0.0),    # recover
    ]
    for ph, dz, thigh, kn, armd, lean in poses:
        f = 1 + round(ph * (N - 1))
        key_hip_z(f, dz)
        key_x("LeftUpLeg", f, thigh)
        key_x("RightUpLeg", f, thigh)
        key_x("LeftLeg", f, kn)
        key_x("RightLeg", f, kn)
        key_x("LeftArm", f, armd, rest=ARM_REST["LeftArm"])
        key_x("RightArm", f, armd, rest=ARM_REST["RightArm"])
        key_x("LeftForeArm", f, 14.0, rest=FORE_REST["LeftForeArm"])
        key_x("RightForeArm", f, 14.0, rest=FORE_REST["RightForeArm"])
        key_x("Spine", f, -lean * 0.5)
        key_x("Spine01", f, -lean * 0.3)


def author_attack():
    """Non-looping whip crack: planted stagger stance, right arm winds back/overhead
    then snaps forward as the torso twists into it; left arm counterbalances. Arm
    angles are deg about local X from the hanging rest (positive = forward/up swing)."""
    # (phase, R-arm deg, R-forearm deg, L-arm deg, spine lean deg, front-knee deg)
    poses = [
        (0.00, 0.0, 10.0, 0.0, 0.0, 10.0),     # ready stance
        (0.25, -70.0, 60.0, 20.0, -10.0, 14.0),  # wind up: arm cocks back, elbow bent
        (0.45, -95.0, 75.0, 28.0, -16.0, 16.0),  # peak coil
        (0.62, 120.0, 20.0, -30.0, 18.0, 24.0),   # CRACK: arm whips forward, torso lunges
        (0.80, 70.0, 12.0, -10.0, 10.0, 18.0),    # follow-through
        (1.00, 0.0, 10.0, 0.0, 0.0, 10.0),     # recover to stance
    ]
    # A small planted stagger: left leg forward, right leg back, held all clip.
    for ph, rarm, rfore, larm, lean, fknee in poses:
        f = 1 + round(ph * (N - 1))
        key_x("LeftUpLeg", f, 14.0)
        key_x("RightUpLeg", f, -16.0)
        key_x("LeftLeg", f, fknee)
        key_x("RightLeg", f, 10.0)
        key_x("RightArm", f, rarm, rest=ARM_REST["RightArm"])
        key_x("RightForeArm", f, rfore, rest=FORE_REST["RightForeArm"])
        key_x("LeftArm", f, larm, rest=ARM_REST["LeftArm"])
        key_x("LeftForeArm", f, 18.0, rest=FORE_REST["LeftForeArm"])
        key_x("Spine", f, lean * 0.5)
        key_x("Spine01", f, lean * 0.3)


def author_hurt():
    """Non-looping flinch: a sharp recoil backward (torso + head snap back, arms fly
    up defensively, knees buckle) then a quick settle. Reads as 'took a hit'."""
    # (phase, spine-back deg, arm-up deg, knee deg, hip dz)
    poses = [
        (0.00, 0.0, 0.0, 8.0, 0.0),
        (0.30, 34.0, 60.0, 26.0, -0.06),   # snap back, arms up, buckle
        (0.55, 22.0, 40.0, 18.0, -0.03),
        (1.00, 0.0, 0.0, 8.0, 0.0),        # settle back to stance
    ]
    for ph, back, armup, knee_d, dz in poses:
        f = 1 + round(ph * (N - 1))
        key_hip_z(f, dz)
        key_x("Spine", f, back * 0.6)
        key_x("Spine01", f, back * 0.4)
        key_x("LeftArm", f, armup, rest=ARM_REST["LeftArm"])
        key_x("RightArm", f, armup, rest=ARM_REST["RightArm"])
        key_x("LeftLeg", f, knee_d)
        key_x("RightLeg", f, knee_d)


def author_death():
    """Non-looping death: stagger, knees give out, the body folds and collapses
    forward to the ground, arms going limp. Holds collapsed on the last frame."""
    # (phase, spine-fold deg, thigh deg, knee deg, hip dz, arm deg)
    poses = [
        (0.00, 0.0, 0.0, 8.0, 0.0, 0.0),
        (0.20, -18.0, 10.0, 30.0, -0.05, 30.0),   # stagger, slight back arch
        (0.45, 40.0, 50.0, 80.0, -0.35, -20.0),   # knees give, fold forward + down
        (0.70, 70.0, 75.0, 110.0, -0.62, -40.0),  # collapse to the ground
        (1.00, 78.0, 80.0, 118.0, -0.70, -46.0),  # crumpled, limbs limp (held)
    ]
    for ph, fold, thigh, knee_d, dz, armd in poses:
        f = 1 + round(ph * (N - 1))
        key_hip_z(f, dz)
        key_x("Spine", f, -fold * 0.5)
        key_x("Spine01", f, -fold * 0.3)
        key_x("LeftUpLeg", f, thigh)
        key_x("RightUpLeg", f, thigh)
        key_x("LeftLeg", f, knee_d)
        key_x("RightLeg", f, knee_d)
        key_x("LeftArm", f, armd, rest=ARM_REST["LeftArm"])
        key_x("RightArm", f, armd, rest=ARM_REST["RightArm"])


CLIP_AUTHORS = {
    "jump": author_jump,
    "attack": author_attack,
    "hurt": author_hurt,
    "death": author_death,
}
CLIP_AUTHORS.get(CLIP, author_gait)()

if arm.animation_data and arm.animation_data.action:
    arm.animation_data.action.name = CLIP

bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLB",
    export_animations=True,
    export_frame_range=True,
    use_selection=False,
)
print(f"AUTHORED clip={CLIP} frames={N} yaw={math.degrees(YAW):.0f} -> {OUT}")
