#!/usr/bin/env node
/**
 * Prop prep — turns raw Imagen PROP poses (a single object on a flat magenta
 * field) into clean transparent PNGs TRIMMED TO CONTENT, the BRUSHES a painted
 * level composes (shrineShapes.ts → composition.ts). Unlike prep-sprites.mjs
 * (which square-frames + bottom-anchors a CHARACTER for animation), a prop keeps
 * its native proportions and is trimmed tight so its on-screen size and base are
 * the artwork's own — the level's `on()` helper anchors it by its real height.
 *
 * Pipeline per file:
 *   1. corner flood-fill clearing the sampled magenta backdrop to alpha (same
 *      robust keyed flood as the sprite prep — follows a non-flat backdrop, stops
 *      at the dark-outlined object).
 *   2. despill the magenta fringe on anti-aliased edges.
 *   3. clear the soft drop-shadow ellipse the generator casts BELOW the object
 *      (bottom band, key-leaning pixels) so the prop has no baked shadow.
 *   4. trim to the object bounding box → a tight transparent PNG.
 *
 * Opt-in + offline (no API). Input raw-assets/generated/, output public/assets/.
 *
 * Usage:
 *   node scripts/prep-props.mjs --in shrine- --out public/assets/biomes/shrine [--threshold 120]
 */
import { mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

/** Squared color distance between two RGB triples. */
function dist2(r, g, b, kr, kg, kb) {
  const dr = r - kr;
  const dg = g - kg;
  const db = b - kb;
  return dr * dr + dg * dg + db * db;
}

/** A pixel "leans magenta" when red & blue both clearly exceed green. */
function isMagenta(r, g, b) {
  return r - g > 40 && b - g > 40;
}

/**
 * Pick the backdrop KEY colour. Imagen usually paints a flat magenta field, but
 * sometimes wraps it in a thin parchment/cream BORDER — in which case the corners
 * sample cream, not magenta, and a corner-keyed flood stops at the magenta ring
 * (leaving a pink halo on the prop). So: scan the whole 1-px border; if magenta
 * pixels dominate it, key off their average. Otherwise fall back to the corner
 * average (a genuinely flat non-magenta backdrop).
 */
function pickKey(data, width, height) {
  let mr = 0;
  let mg = 0;
  let mb = 0;
  let mCount = 0;
  const sample = (x, y) => {
    const o = (y * width + x) * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    if (isMagenta(r, g, b)) {
      mr += r;
      mg += g;
      mb += b;
      mCount++;
    }
  };
  for (let x = 0; x < width; x++) {
    sample(x, 0);
    sample(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    sample(0, y);
    sample(width - 1, y);
  }
  const border = 2 * (width + height);
  if (mCount > border * 0.25) {
    return { kr: Math.round(mr / mCount), kg: Math.round(mg / mCount), kb: Math.round(mb / mCount) };
  }
  const corners = [0, (width - 1) * 4, (height - 1) * width * 4, ((height - 1) * width + width - 1) * 4];
  let kr = 0;
  let kg = 0;
  let kb = 0;
  for (const c of corners) {
    kr += data[c];
    kg += data[c + 1];
    kb += data[c + 2];
  }
  return { kr: Math.round(kr / 4), kg: Math.round(kg / 4), kb: Math.round(kb / 4) };
}

/**
 * Flood-fill transparency inward from the corners, clearing any pixel that is
 * background — defined as near the MAGENTA key OR (when present) the corner
 * BORDER colour. Two keys let the flood bridge a thin parchment/cream frame to
 * reach the magenta field behind it, then follow the magenta up to the prop's
 * dark outline. A genuinely flat magenta field has corner≈key, so the second key
 * is harmless. Returns the magenta key for the shadow/despill passes.
 */
function clearBackground(data, width, height, tol) {
  const key = pickKey(data, width, height);
  // The corner colour — a parchment frame, or just the magenta field again.
  const c0 = data[0];
  const c1 = data[1];
  const c2 = data[2];
  const tol2 = tol * tol;
  // A border frame is usually a tight flat colour; key it narrower than the
  // magenta field so the wider magenta tolerance can't eat prop detail.
  const borderTol2 = 60 * 60;
  const isBg = (o) => {
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    return dist2(r, g, b, key.kr, key.kg, key.kb) <= tol2 || dist2(r, g, b, c0, c1, c2) <= borderTol2;
  };

  const seen = new Uint8Array(width * height);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (seen[p]) return;
    seen[p] = 1;
    stack.push(p);
  };
  push(0, 0);
  push(width - 1, 0);
  push(0, height - 1);
  push(width - 1, height - 1);

  while (stack.length) {
    const p = stack.pop();
    const o = p * 4;
    if (!isBg(o)) continue;
    data[o + 3] = 0;
    const x = p % width;
    const y = (p / width) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  return key;
}

/**
 * Despill — desaturate the magenta fringe on anti-aliased object edges. A pixel
 * that still leans toward the key colour (red & blue both above green by a
 * margin) gets red/blue pulled down to green. Only touches genuine fringe.
 */
function despillMagenta(data, width, height) {
  for (let p = 0; p < width * height; p++) {
    const o = p * 4;
    if (data[o + 3] === 0) continue;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const spill = Math.min(r, b) - g;
    if (spill <= 55) continue;
    data[o] = g;
    data[o + 2] = g;
  }
}

/**
 * Edge de-fringe — the anti-aliased ring where the magenta backdrop met the
 * prop's outline leaves opaque pixels that are PART backdrop colour. Despill only
 * fixes strong leans; this clears the rest: any opaque pixel ADJACENT to a now-
 * transparent pixel that still leans magenta (red & blue above green) is erased.
 * Confined to the alpha boundary so it never bites into the prop's solid body,
 * and gated on a magenta lean so it never touches a legitimately reddish edge
 * (e.g. the prop's own blood-red drips sit interior, away from the alpha edge).
 */
function defringeEdges(data, width, height) {
  const toClear = [];
  const transparent = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return true; // image edge = outside
    return data[(y * width + x) * 4 + 3] === 0;
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (data[o + 3] === 0) continue;
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      // Only fringe: leans magenta AND borders transparency.
      if (r - g <= 18 || b - g <= 18) continue;
      if (transparent(x - 1, y) || transparent(x + 1, y) || transparent(x, y - 1) || transparent(x, y + 1)) {
        toClear.push(o);
      }
    }
  }
  for (const o of toClear) data[o + 3] = 0;
}

/**
 * Clear the soft drop-shadow ellipse the generator casts UNDER the prop: in the
 * bottom 26% of the image, any still-opaque pixel that both leans toward the key
 * colour AND is near it at a wide tolerance is removed. A prop's shadow sits
 * below its base, so this band never eats the object body above it.
 */
function clearDropShadow(data, width, height, key) {
  const startY = Math.floor(height * 0.74);
  const tol2 = 170 * 170;
  for (let y = startY; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (data[o + 3] === 0) continue;
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      if (Math.min(r, b) > g && dist2(r, g, b, key.kr, key.kg, key.kb) < tol2) {
        data[o + 3] = 0;
      }
    }
  }
}

async function prep(file, outDir, threshold) {
  const src = join(ROOT, "raw-assets", "generated", file);
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const key = clearBackground(data, info.width, info.height, threshold);
  despillMagenta(data, info.width, info.height);
  // Two erosion passes peel the AA halo ring left where backdrop met the outline.
  defringeEdges(data, info.width, info.height);
  defringeEdges(data, info.width, info.height);
  clearDropShadow(data, info.width, info.height, key);

  // Trim the now-transparent margin to the prop's tight bbox — its native
  // proportions are preserved; the level scales/anchors it by its real height.
  const out = join(outDir, file);
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .trim({ threshold: 1 })
    .toFile(out);
  const meta = await sharp(out).metadata();
  console.warn(`  ${file} → ${out} (${meta.width}×${meta.height})`);
}

async function main() {
  // `--in` is REQUIRED — an empty filter would match every raw PNG (including
  // unrelated cutscene crops), silently processing files you didn't mean to.
  const match = arg("in", "");
  if (!match) {
    console.error("Missing required --in <substr>. Refusing to process ALL raw PNGs.");
    console.error("Usage: node scripts/prep-props.mjs --in shrine- --out public/assets/biomes/shrine");
    process.exit(1);
  }
  const outRel = arg("out", "public/assets/biomes/shrine");
  const threshold = Number(arg("threshold", "120"));
  const outDir = join(ROOT, outRel);
  mkdirSync(outDir, { recursive: true });

  const files = readdirSync(join(ROOT, "raw-assets", "generated"))
    .filter((f) => f.endsWith(".png") && f.includes(match))
    .sort();
  if (!files.length) {
    console.error(`No raw PNGs matching "${match}" in raw-assets/generated/`);
    process.exit(1);
  }
  console.warn(`Prepping ${files.length} prop(s) → ${outRel} (threshold ${threshold})`);
  for (const f of files) await prep(f, outDir, threshold);
  console.warn("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
