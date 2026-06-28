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
function isBackground(r, g, b, threshold) {
  return r >= threshold && b >= threshold && g <= 255 - threshold;
}

/**
 * Flood-fill transparency inward from every corner over background-colored,
 * connected pixels. Mutates `data` (RGBA) in place. Iterative stack — no
 * recursion blowups on 1024² images.
 */
function clearBackground(data, width, height, threshold) {
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
    if (!isBackground(data[o], data[o + 1], data[o + 2], threshold)) continue;
    data[o + 3] = 0; // clear alpha
    const x = p % width;
    const y = (p / width) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
}

/**
 * Global magenta kill — fully clear any strongly-magenta pixel anywhere, not
 * just corner-connected ones. Catches enclosed background pockets (between legs,
 * under an arm) that the corner flood-fill can't reach. Uses a stricter test
 * than the flood-fill threshold so it never eats the character's own colours.
 */
function killMagenta(data, width, height) {
  for (let p = 0; p < width * height; p++) {
    const o = p * 4;
    if (data[o + 3] === 0) continue;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    // Pure-ish magenta: red & blue high, green low, and the magenta dominance
    // (min(r,b) − g) is large. Character pixels (skin, teal, gold) never qualify.
    if (Math.min(r, b) >= 150 && g <= 110 && Math.min(r, b) - g >= 70) {
      data[o + 3] = 0;
    }
  }
}

/**
 * Despill — kill the magenta fringe on anti-aliased character edges. Only touches
 * genuine fringe (strong magenta dominance) so it desaturates the halo without
 * eating into the character; pulls red/blue down to green and fades alpha by the
 * spill removed.
 */
function despillMagenta(data, width, height) {
  for (let p = 0; p < width * height; p++) {
    const o = p * 4;
    if (data[o + 3] === 0) continue;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const spill = Math.min(r, b) - g;
    if (spill <= 40) continue; // only strong fringe, not bulk character pixels
    data[o] = g;
    data[o + 2] = g;
    data[o + 3] = Math.max(0, data[o + 3] - spill);
  }
}

async function prep(file, outDir, frame, threshold, heightFraction) {
  const src = join(ROOT, "raw-assets", "generated", file);
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  clearBackground(data, info.width, info.height, threshold);
  killMagenta(data, info.width, info.height);
  despillMagenta(data, info.width, info.height);

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
  const threshold = Number(arg("threshold", "200"));
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
