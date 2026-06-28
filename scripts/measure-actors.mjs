/**
 * measure-actors.mjs — measure the visible-content height of each actor sprite so
 * src/render/actorScale.ts can scale every actor by content (not frame padding).
 *
 * Reads the alpha bounding box of each canonical standing pose and prints the
 * CONTENT_H table. Run when the player/enemy art changes:
 *   node scripts/measure-actors.mjs
 *
 * Uses sharp (already a dev dep for the asset pipeline). Pure tooling — not shipped.
 */
import sharp from "sharp";

const PUBLIC = new URL("../public/", import.meta.url);

/** Vertical extent (px) of rows that contain any opaque pixel in a raw RGBA buffer. */
function opaqueRowSpan(data, width, height, channels) {
  let top = height;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    const rowHasPixel = rowOpaque(data, y, width, channels);
    if (rowHasPixel) {
      if (y < top) top = y;
      bottom = y;
    }
  }
  return bottom < top ? 0 : bottom - top + 1;
}

/** True if any pixel in row `y` is opaque (alpha > 8). */
function rowOpaque(data, y, width, channels) {
  for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * channels + (channels - 1)] > 8) return true;
  }
  return false;
}

/** Alpha bbox height of (an optionally cropped first frame of) a PNG, in px. */
async function contentHeight(rel, frameW) {
  const path = new URL(`assets/${rel}`, PUBLIC).pathname;
  let img = sharp(path);
  const meta = await img.metadata();
  if (frameW) img = sharp(path).extract({ left: 0, top: 0, width: frameW, height: meta.height });
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return opaqueRowSpan(data, info.width, info.height, info.channels);
}

const player = Math.max(
  await contentHeight("player/illinois-jim-idle-1.png"),
  await contentHeight("player/illinois-jim-idle-2.png"),
  await contentHeight("player/illinois-jim-run-1.png"),
);

const enemies = {
  goblin: await contentHeight("enemies/Goblin/Idle.png", 150),
  skeleton: await contentHeight("enemies/Skeleton/Idle.png", 150),
  mushroom: await contentHeight("enemies/Mushroom/Idle.png", 150),
  flyingEye: await contentHeight("enemies/Flying eye/Flight.png", 150),
};

const lines = ["CONTENT_H = {", `  player: ${player},`];
for (const [k, v] of Object.entries(enemies)) lines.push(`  ${k}: ${v},`);
lines.push("}");
console.warn(lines.join("\n"));
