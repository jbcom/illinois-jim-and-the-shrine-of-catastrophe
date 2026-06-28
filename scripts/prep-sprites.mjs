#!/usr/bin/env node
/**
 * Sprite prep — turns raw Imagen poses (a character on a near-solid light field,
 * sometimes with a baked floor/shadow) into clean, uniformly-framed transparent
 * PNGs the renderer can use as single-image frames.
 *
 * Pipeline per file:
 *   1. flood-fill from the four corners, clearing every pixel that is "light
 *      background" (high luminance, low saturation) and connected to a corner —
 *      this erases the backdrop but never the dark-outlined character, and won't
 *      punch holes in light interior pixels that aren't corner-connected.
 *   2. trim to the content bounding box.
 *   3. scale to fit and center on a fixed square frame (consistent anchor across
 *      poses, so the animation doesn't jitter).
 *
 * Opt-in + offline (no API). Input raw-assets/generated/, output public/assets/.
 *
 * Usage:
 *   node scripts/prep-sprites.mjs --in <glob-substr> --out <dir> [--frame 96] [--threshold 200]
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

/**
 * Is pixel (r,g,b) a background pixel? Default keys the flat magenta (#FF00FF)
 * the generator paints behind sprites: high red+blue, low green. `--threshold`
 * widens the tolerance for anti-aliased edges.
 */
/** Squared color distance between two RGB triples. */
function dist2(r, g, b, kr, kg, kb) {
  const dr = r - kr;
  const dg = g - kg;
  const db = b - kb;
  return dr * dr + dg * dg + db * db;
}

/**
 * Flood-fill transparency inward from the corners over pixels within `tol` color
 * distance of the SAMPLED corner ("key") color. Imagen's magenta backdrop is not
 * a pure flat colour (it varies pink→magenta and casts a faint drop-shadow), so a
 * fixed RGB test fails — keying off the actual corner colour with a generous
 * tolerance follows the backdrop everywhere yet stops at the dark-outlined
 * character. `tol` is a distance threshold (in squared RGB units).
 */
function clearBackground(data, width, height, tol) {
  // Average the four corners to get the key colour (robust to one noisy corner).
  const corners = [0, (width - 1) * 4, (height - 1) * width * 4, ((height - 1) * width + width - 1) * 4];
  let kr = 0;
  let kg = 0;
  let kb = 0;
  for (const c of corners) {
    kr += data[c];
    kg += data[c + 1];
    kb += data[c + 2];
  }
  kr = Math.round(kr / 4);
  kg = Math.round(kg / 4);
  kb = Math.round(kb / 4);
  const tol2 = tol * tol;

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
    if (dist2(data[o], data[o + 1], data[o + 2], kr, kg, kb) > tol2) continue;
    data[o + 3] = 0; // clear alpha
    const x = p % width;
    const y = (p / width) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  return { kr, kg, kb };
}

/**
 * Despill — desaturate the magenta fringe left on anti-aliased character edges.
 * A pixel that still leans toward the key colour (red & blue both above green by
 * a margin) gets red/blue pulled down to green. Only touches genuine fringe so it
 * never flattens the character's own teal/gold/skin tones.
 */
function despillMagenta(data, width, height) {
  for (let p = 0; p < width * height; p++) {
    const o = p * 4;
    if (data[o + 3] === 0) continue;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const spill = Math.min(r, b) - g;
    if (spill <= 55) continue; // only strong magenta fringe
    data[o] = g;
    data[o + 2] = g;
  }
}

/**
 * Clear a faint magenta drop-shadow under the feet: in the bottom 22% of the
 * image, any still-opaque pixel within a wider tolerance of the key colour (a
 * desaturated shadow tint) is removed. Confined to the bottom band so it can't
 * touch the character body, and only matches key-leaning pixels so real feet stay.
 */
function clearFootShadow(data, width, height, key) {
  const startY = Math.floor(height * 0.78);
  const tol2 = 150 * 150;
  for (let y = startY; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (data[o + 3] === 0) continue;
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      // Shadow = leans magenta (r,b > g) AND near the key colour at wide tolerance.
      if (Math.min(r, b) > g && dist2(r, g, b, key.kr, key.kg, key.kb) < tol2) {
        data[o + 3] = 0;
      }
    }
  }
}

async function prep(file, outDir, frame, threshold, heightFraction) {
  const src = join(ROOT, "raw-assets", "generated", file);
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const key = clearBackground(data, info.width, info.height, threshold);
  despillMagenta(data, info.width, info.height);
  // Imagen sometimes paints a faint magenta DROP-SHADOW touching the feet, which
  // the corner flood can't reach (it's connected to the character). Clear any
  // bottom-region pixel that still leans toward the key colour — a shadow ellipse
  // sits below the feet so this never eats the character body above it.
  clearFootShadow(data, info.width, info.height, key);

  // Trim the now-transparent margin to the character bbox.
  const trimmed = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .trim({ threshold: 1 })
    .toBuffer({ resolveWithObject: true });

  // Scale every pose so its character HEIGHT is a fixed fraction of the frame,
  // then bottom-anchor (feet on the frame floor). This keeps on-screen scale
  // and footing consistent across poses regardless of how zoomed the raw gen
  // was, so the walk cycle doesn't pulse or hover.
  let targetH = Math.round(frame * heightFraction);
  let scale = targetH / trimmed.info.height;
  let w = Math.max(1, Math.round(trimmed.info.width * scale));
  // Clamp wide (leaning/attack) poses so they never overflow the frame width.
  const maxW = Math.round(frame * 0.96);
  if (w > maxW) {
    scale *= maxW / w;
    w = maxW;
    targetH = Math.max(1, Math.round(trimmed.info.height * scale));
  }
  const scaled = await sharp(trimmed.data)
    .resize(w, targetH)
    .png()
    .toBuffer();

  const left = Math.round((frame - w) / 2);
  const top = frame - targetH - Math.round(frame * 0.04); // small floor margin
  const out = join(outDir, file);
  await sharp({
    create: { width: frame, height: frame, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: scaled, left, top: Math.max(0, top) }])
    .png()
    .toFile(out);
  console.warn(`  ${file} → ${out} (h=${targetH}, w=${w})`);
}

async function main() {
  const match = arg("in", "");
  const outRel = arg("out", "public/assets/player");
  const frame = Number(arg("frame", "96"));
  // Color-distance tolerance to the sampled corner (key) colour, in RGB units.
  const threshold = Number(arg("threshold", "100"));
  const heightFraction = Number(arg("height", "0.86"));
  const outDir = join(ROOT, outRel);
  mkdirSync(outDir, { recursive: true });

  const files = readdirSync(join(ROOT, "raw-assets", "generated"))
    .filter((f) => f.endsWith(".png") && f.includes(match))
    .sort();
  if (!files.length) {
    console.error(`No raw PNGs matching "${match}" in raw-assets/generated/`);
    process.exit(1);
  }
  console.warn(`Prepping ${files.length} sprite(s) → ${outRel} (frame ${frame}, threshold ${threshold})`);
  for (const f of files) await prep(f, outDir, frame, threshold, heightFraction);
  console.warn("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
