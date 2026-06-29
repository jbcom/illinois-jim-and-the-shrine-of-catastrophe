# Character bake pipeline — 3D rigged GLB → transparent WebP sprite sheets

The game runtime is 2D (PixiJS). Characters are authored in 3D (Meshy → rigged GLB,
local-only masters under `raw-assets/models/**`, gitignored) and **baked** here to
transparent WebP sprite sheets that the 2D engine renders. 3D is a production tool, not
the runtime — see `.agent-state/directive.md` and the `pivot-3d-glb-on-parallax` memory.

## Why bake (not run 3D in-game)

The Gemini image API is JPEG-only (no alpha), so 2D-generated character sprites can't be
cut out cleanly. Blender renders the rigged GLB from a fixed orthographic side camera
with `film_transparent`, giving a real alpha channel — perfect transparent frames that
drop straight onto the parallax in the existing 2D engine.

## Pipeline

```
raw-assets/models/<char>/<char>-rigged.glb   (Meshy rig, local master, gitignored)
        │  author_anim.py   ── pose a real walk/run/idle/jump cycle on the rig
        ▼
   <char>-<clip>.glb        (one authored action, rig yawed to face screen-right)
        │  bake.py          ── ortho side cam + film_transparent, step the clip
        ▼
   frames/<clip>_NNN.png    (square transparent tiles)
        │  pack-sheet.ts    ── union-bbox anchor, composite to one horizontal sheet
        ▼
 public/assets/sprites/<char>/<clip>.webp + <clip>.json   (shipped)
```

`bake-character.sh` runs all of it for the four locomotion clips, deriving ONE shared
ortho scale + ground centre from the walk clip so every sheet shares a pixel scale and
feet anchor (no size jitter between idle/walk/run in-game).

## Run

```sh
pnpm bake:jim          # idle, walk, run, jump → public/assets/sprites/jim/
# or, any rigged character:
scripts/bake/bake-character.sh <rigged.glb> <out-dir> <name> [frames] [size]
```

Requires Blender (`/Applications/Blender.app`, override with `$BLENDER`).

## Key facts (learned, baked into the scripts)

- Meshy's **free walk/run clips are degenerate** (arms locked in a jittering T-pose) —
  we author the cycles ourselves on the rig instead.
- The mesh is authored facing **-Y**; we **yaw the rig 270°** so it faces screen-right.
- After that yaw, a limb bone's **local-X** rotation swings it in the sagittal (stride)
  plane the side camera sees. Upper arms' bind pose points forward, so we compute a
  rotation to hang them down (-Z) before swinging.
- glTF export stashes the authored clip as an **NLA strip** and leaves a stub action
  active; `bake.py` promotes the real strip's action to active before stepping frames.
- Manifest anchor = horizontal centre + vertical bottom (feet) of the union of opaque
  pixels across all frames → stable ground contact.

## Files

| File | Role |
|------|------|
| `author_anim.py` | Pose a clip (idle/walk/run/jump) on the rig, export a per-clip GLB |
| `bake.py` | Ortho side-camera transparent frame render of one clip |
| `pack-sheet.ts` | Frames → one WebP sheet + JSON manifest (shared feet anchor) |
| `bake-character.sh` | Orchestrate all clips at one shared scale |
| `probe.py` | Inspect any GLB's objects / actions / NLA / bounds |
| `probe_skel.py` | List an armature's bone hierarchy (retarget compatibility) |
