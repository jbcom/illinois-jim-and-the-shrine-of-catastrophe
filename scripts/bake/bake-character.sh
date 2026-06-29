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

CLIPS=(idle walk run jump)

# Pass 1: author + bake the reference clip (walk) to learn the shared scale/centre.
echo "→ deriving shared scale from walk…"
"$BL" --background --python "$ROOT/scripts/bake/author_anim.py" -- \
  --glb "$GLB" --clip walk --out "$TMP/walk.glb" >/dev/null 2>&1
META=$("$BL" --background --python "$ROOT/scripts/bake/bake.py" -- \
  --glb "$TMP/walk.glb" --out "$TMP/bake-walk" --name walk --frames "$FRAMES" --size "$SIZE" \
  2>/dev/null | grep '^BAKE_META ' | sed 's/^BAKE_META //')
SCALE=$(node -e "process.stdout.write(String(JSON.parse(process.argv[1]).orthoScale))" "$META")
CZ=$(node -e "process.stdout.write(String(JSON.parse(process.argv[1]).centerZ))" "$META")
echo "  shared orthoScale=$SCALE centerZ=$CZ"

# Pass 2: author + bake + pack every clip at the shared scale.
for CLIP in "${CLIPS[@]}"; do
  echo "→ $CLIP"
  "$BL" --background --python "$ROOT/scripts/bake/author_anim.py" -- \
    --glb "$GLB" --clip "$CLIP" --out "$TMP/$CLIP.glb" >/dev/null 2>&1
  "$BL" --background --python "$ROOT/scripts/bake/bake.py" -- \
    --glb "$TMP/$CLIP.glb" --out "$TMP/bake-$CLIP" --name "$CLIP" \
    --frames "$FRAMES" --size "$SIZE" --ortho-scale "$SCALE" --center-z "$CZ" \
    2>/dev/null | grep '^BAKE_DONE'
  (cd "$ROOT" && pnpm exec tsx scripts/bake/pack-sheet.ts \
    --frames "$TMP/bake-$CLIP/frames" --out "$OUTDIR" --name "$CLIP" --fps 24)
done

echo "✔ baked ${#CLIPS[@]} clips → $OUTDIR"
ls -la "$OUTDIR"
