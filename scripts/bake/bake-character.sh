#!/usr/bin/env bash
# Bake a rigged character's locomotion clips to transparent WebP sprite sheets.
#
# For each clip (idle walk run jump): author the animation on the rig in Blender,
# render N transparent side-profile frames, pack them into a WebP sheet + manifest.
# A SHARED ortho scale + ground centre (derived once from the walk clip) is reused for
# every clip so all sheets share one pixel scale and ground anchor — no size jitter
# between idle/walk/run in-game.
#
#   scripts/bake/bake-character.sh <rigged.glb> <out-dir> <name> [frames] [size]
# e.g.
#   scripts/bake/bake-character.sh raw-assets/models/jim/jim-rigged.glb \
#     public/assets/sprites/jim jim 16 256
set -euo pipefail

BL="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
GLB="$1"; OUTDIR="$2"; NAME="$3"; FRAMES="${4:-16}"; SIZE="${5:-256}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Clip set: default is the full actor set; pass a 6th arg (space- or comma-separated)
# to bake a subset/superset, e.g. "idle walk run attack hurt death" for an enemy.
if [ "${6:-}" != "" ]; then
  IFS=', ' read -r -a CLIPS <<< "$6"
else
  CLIPS=(idle walk run jump attack)
fi

LOG="$TMP/blender.log"  # Blender stderr goes here (not /dev/null) so failures are diagnosable.

# Pass 1: derive the shared scale/centre from the clip with the LARGEST deformed
# envelope. Prefer jump (overhead reach + tuck) when present, else fall back to the
# first clip. Every clip then bakes at this scale so the tallest pose never clips and
# no clip jitters in size. Author each clip's GLB once.
SCALE_CLIP="${CLIPS[0]}"
for CLIP in "${CLIPS[@]}"; do [ "$CLIP" = "jump" ] && SCALE_CLIP="jump"; done
echo "→ authoring clips + deriving shared scale (from $SCALE_CLIP)…"
for CLIP in "${CLIPS[@]}"; do
  "$BL" --background --python "$ROOT/scripts/bake/author_anim.py" -- \
    --glb "$GLB" --clip "$CLIP" --out "$TMP/$CLIP.glb" >>"$LOG" 2>&1
done
META=$("$BL" --background --python "$ROOT/scripts/bake/bake.py" -- \
  --glb "$TMP/$SCALE_CLIP.glb" --out "$TMP/scale-probe" --name "$SCALE_CLIP" --frames "$FRAMES" --size "$SIZE" \
  2>>"$LOG" | grep '^BAKE_META ' | sed 's/^BAKE_META //')
if [ -z "$META" ]; then echo "✗ scale derivation failed — see $LOG" >&2; tail -20 "$LOG" >&2; exit 1; fi
SCALE=$(node -e "process.stdout.write(String(JSON.parse(process.argv[1]).orthoScale))" "$META")
CZ=$(node -e "process.stdout.write(String(JSON.parse(process.argv[1]).centerZ))" "$META")
echo "  shared orthoScale=$SCALE centerZ=$CZ"

# Pass 2: bake + pack every clip ONCE at the shared scale.
for CLIP in "${CLIPS[@]}"; do
  echo "→ $CLIP"
  "$BL" --background --python "$ROOT/scripts/bake/bake.py" -- \
    --glb "$TMP/$CLIP.glb" --out "$TMP/bake-$CLIP" --name "$CLIP" \
    --frames "$FRAMES" --size "$SIZE" --ortho-scale "$SCALE" --center-z "$CZ" \
    2>>"$LOG" | grep '^BAKE_DONE'
  (cd "$ROOT" && pnpm exec tsx scripts/bake/pack-sheet.ts \
    --frames "$TMP/bake-$CLIP/frames" --out "$OUTDIR" --name "$CLIP" --fps 24)
done

echo "✔ baked ${#CLIPS[@]} clips → $OUTDIR"
ls -la "$OUTDIR"
