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
  # Split on commas and/or whitespace, dropping any empty tokens (so "a, b" is clean).
  read -r -a CLIPS <<< "$(printf '%s' "$6" | tr ',' ' ')"
else
  CLIPS=(idle walk run jump attack)
fi

LOG="$TMP/blender.log"  # Blender stderr goes here (not /dev/null) so failures are diagnosable.

# Pass 1: author every clip, then derive ONE shared scale/centre from the UNION of all
# clips' deformed envelopes — so whatever pose is biggest (a death collapse, a jump
# reach) sets the scale and NOTHING clips, regardless of which clip it lives in.
echo "→ authoring clips + measuring envelopes…"
BOUNDS_JSON="["
for CLIP in "${CLIPS[@]}"; do
  "$BL" --background --python "$ROOT/scripts/bake/author_anim.py" -- \
    --glb "$GLB" --clip "$CLIP" --out "$TMP/$CLIP.glb" >>"$LOG" 2>&1
  B=$("$BL" --background --python "$ROOT/scripts/bake/bake.py" -- \
    --glb "$TMP/$CLIP.glb" --out "$TMP/measure" --name "$CLIP" --frames "$FRAMES" --size "$SIZE" --measure \
    2>>"$LOG" | grep '^BAKE_BOUNDS ' | sed 's/^BAKE_BOUNDS //')
  if [ -z "$B" ]; then echo "✗ measure failed for $CLIP — see $LOG" >&2; tail -20 "$LOG" >&2; exit 1; fi
  BOUNDS_JSON="$BOUNDS_JSON$B,"
done
BOUNDS_JSON="${BOUNDS_JSON%,}]"
# Union the envelopes → scale = max(height,width)*margin, centre = mid of the union Z.
SC_CZ=$(node -e '
  const bs = JSON.parse(process.argv[1]);
  const minZ = Math.min(...bs.map(b=>b.minZ)), maxZ = Math.max(...bs.map(b=>b.maxZ));
  const minX = Math.min(...bs.map(b=>b.minX)), maxX = Math.max(...bs.map(b=>b.maxX));
  const scale = Math.max(maxZ-minZ, maxX-minX) * 1.22;
  console.log(scale.toFixed(5) + " " + ((minZ+maxZ)/2).toFixed(5));
' "$BOUNDS_JSON")
SCALE="${SC_CZ%% *}"; CZ="${SC_CZ##* }"
echo "  shared orthoScale=$SCALE centerZ=$CZ (union of ${#CLIPS[@]} clips)"

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
