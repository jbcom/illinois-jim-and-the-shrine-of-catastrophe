#!/usr/bin/env tsx
/**
 * Pack a directory of transparent PNG frames (from the Blender baker) into ONE
 * horizontal WebP sprite sheet plus a JSON manifest the PixiJS runtime reads.
 *
 * The baker renders square SIZE×SIZE tiles with the character centred; we keep the
 * tile square (uniform frame stride) so the runtime can slice by index trivially.
 * We also compute a shared content bbox across ALL frames so the anchor (feet centre)
 * is stable — the sprite never bobs in screen-space from per-frame trimming.
 *
 *   pnpm tsx scripts/bake/pack-sheet.ts --frames <dir> --out <dir> --name walk \
 *     --fps 24 [--tile 256]
 *
 * Writes:
 *   <out>/<name>.webp   horizontal sheet, frameCount tiles left→right
 *   <out>/<name>.json   { name, frameWidth, frameHeight, frameCount, fps,
 *                         anchorX, anchorY }  (anchor in 0..1 of a tile)
 */
import { readdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

function arg(flag: string, def?: string): string {
  const i = process.argv.indexOf(flag);
  if (i >= 0) {
    const v = process.argv[i + 1];
    if (v !== undefined) return v;
  }
  if (def !== undefined) return def;
  throw new Error(`missing ${flag}`);
}

type Box = { minX: number; minY: number; maxX: number; maxY: number };

/** Expand `box` to include every >16-alpha pixel of the image at `p`. Scans the
 * alpha channel alone (one byte/pixel) so the index is a plain i = y*w + x. */
async function unionOpaqueBox(p: string, box: Box): Promise<void> {
  const { data, info } = await sharp(p)
    .ensureAlpha()
    .extractChannel(3)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  for (let i = 0; i < data.length; i++) {
    if ((data[i] ?? 0) <= 16) continue;
    const x = i % w;
    const y = (i - x) / w;
    if (x < box.minX) box.minX = x;
    if (x > box.maxX) box.maxX = x;
    if (y < box.minY) box.minY = y;
    if (y > box.maxY) box.maxY = y;
  }
}

const FRAMES_DIR = arg("--frames");
const OUT = arg("--out");
const NAME = arg("--name");
const FPS = Number(arg("--fps", "24"));

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  const files = readdirSync(FRAMES_DIR)
    .filter((f) => f.endsWith(".png"))
    .sort();
  if (files.length === 0) throw new Error(`no PNG frames in ${FRAMES_DIR}`);

  const paths = files.map((f) => join(FRAMES_DIR, f));
  const meta0 = await sharp(paths[0]).metadata();
  const tile = meta0.width ?? Number(arg("--tile", "256"));

  // Shared content bbox across all frames (union of opaque pixels) → stable anchor.
  const box = { minX: tile, minY: tile, maxX: 0, maxY: 0 };
  for (const p of paths) await unionOpaqueBox(p, box);
  const { minX, minY, maxX, maxY } = box;
  // Anchor = horizontal centre of content, vertical bottom of content (feet).
  const anchorX = (minX + maxX) / 2 / tile;
  const anchorY = maxY / tile;

  // Composite frames into a horizontal sheet (full square tiles — no trim, so the
  // runtime slices uniformly and the shared anchor stays valid).
  const composites = paths.map((p, i) => ({ input: p, left: i * tile, top: 0 }));
  const sheet = sharp({
    create: {
      width: tile * paths.length,
      height: tile,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(composites);

  const webpPath = join(OUT, `${NAME}.webp`);
  await sheet.webp({ quality: 92, alphaQuality: 100, effort: 5 }).toFile(webpPath);

  const manifest = {
    name: NAME,
    frameWidth: tile,
    frameHeight: tile,
    frameCount: paths.length,
    fps: FPS,
    anchorX: Number(anchorX.toFixed(4)),
    anchorY: Number(anchorY.toFixed(4)),
    contentBox: { minX, minY, maxX, maxY },
  };
  await writeFile(join(OUT, `${NAME}.json`), `${JSON.stringify(manifest, null, 2)}\n`);
  console.warn(
    `packed ${NAME}: ${paths.length} frames → ${webpPath} (tile ${tile}px, anchor ${manifest.anchorX},${manifest.anchorY})`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
