#!/usr/bin/env tsx
/**
 * Trim a baked static-prop PNG (from bake-prop.py) to its opaque content and write a
 * transparent WebP + a JSON manifest the runtime uses to place it on the ground.
 *
 *   pnpm tsx scripts/bake/pack-prop.ts --in <frame.png> --out <dir> --name pitched-house
 *
 * Writes:
 *   <out>/<name>.webp   trimmed transparent prop image
 *   <out>/<name>.json   { name, width, height, anchorX, anchorY }
 *                       anchor in 0..1 of the trimmed image (horizontal centre, bottom).
 */
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

async function main(): Promise<void> {
  const IN = arg("--in");
  const OUT = arg("--out");
  const NAME = arg("--name");
  await mkdir(OUT, { recursive: true });

  // Trim fully-transparent borders; sharp.trim() keys on the alpha edges.
  const trimmed = sharp(IN).trim({ threshold: 8 });
  const webpPath = join(OUT, `${NAME}.webp`);
  const info = await trimmed
    .clone()
    .webp({ quality: 90, alphaQuality: 100, effort: 5 })
    .toFile(webpPath);

  if (info.width <= 0 || info.height <= 0) {
    throw new Error(`prop ${NAME}: trimmed to nothing — bake produced no opaque pixels`);
  }

  const manifest = {
    name: NAME,
    width: info.width,
    height: info.height,
    // Ground placement: horizontal centre, vertical bottom (the prop sits on the floor).
    anchorX: 0.5,
    anchorY: 1,
  };
  await writeFile(join(OUT, `${NAME}.json`), `${JSON.stringify(manifest, null, 2)}\n`);
  console.warn(`packed prop ${NAME}: ${info.width}×${info.height} → ${webpPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
