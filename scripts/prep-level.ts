#!/usr/bin/env tsx
/**
 * Isolate a generated level's art per each asset's `isolation` mode, curating
 * raw-assets/generated/levels/<id>/ → public/assets/levels/<id>/. Run after
 * genai-level.ts: `pnpm tsx scripts/prep-level.ts --level 1`.
 *
 * - transparent → magenta corner-flood to alpha + despill + edge-defringe + tight
 *   trim (the prop pipeline, generalised from prep-props.mjs).
 * - tileable / scene → kept as the painted image (the parallax/ground layer), just
 *   copied through (already a backdrop / seamless strip).
 *
 * Reads the level JSON for the per-asset isolation mode, so the design drives the
 * processing — nothing is isolated uninformed.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { parseLevel } from "../src/sim/world/levelSchema.ts";
import { LEVEL_BRIEFS } from "./levelBriefs.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function briefIdFor(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function main() {
  const idx = process.argv.indexOf("--level");
  const order = idx >= 0 ? Number(process.argv[idx + 1]) : 1;
  const brief = LEVEL_BRIEFS.find((b) => b.order === order);
  if (!brief) {
    console.error(`No brief for level ${order}.`);
    process.exit(1);
  }
  const id = briefIdFor(brief.title);
  const level = parseLevel(JSON.parse(readFileSync(join(ROOT, "src", "levels", `${id}.level.json`), "utf8")));

  const rawDir = join(ROOT, "raw-assets", "generated", "levels", id);
  const outDir = join(ROOT, "public", "assets", "levels", id);
  mkdirSync(outDir, { recursive: true });

  // Output WEBP (alpha-preserving, far smaller than PNG at full quality) — this is
  // a MOBILE game; keep FULL resolution for high-DPR devices, shrink the FORMAT not
  // the pixels. Lossy q82 for opaque backdrops, near-lossless for alpha sprites so
  // edges stay crisp.
  let before = 0;
  let after = 0;
  for (const asset of level.art) {
    const src = join(rawDir, `${asset.key}.png`);
    const dst = join(outDir, `${asset.key}.webp`);
    try {
      const srcMeta = await sharp(src).metadata();
      let img = sharp(src);
      if (asset.isolation === "transparent") {
        // Native-transparent sprite — trim the empty alpha margin, near-lossless webp.
        img = img.trim({ threshold: 1 }).webp({ nearLossless: true, quality: 90 });
      } else {
        // scene / tileable backdrop — opaque, lossy webp is plenty.
        img = img.webp({ quality: 82 });
      }
      await img.toFile(dst);
      const m = await sharp(dst).metadata();
      before += srcMeta.size ?? 0;
      after += m.size ?? 0;
      console.warn(`  ${asset.key} (${asset.isolation}) → ${m.width}×${m.height} webp`);
    } catch (e) {
      console.warn(`  ⚠ ${asset.key}: ${(e as Error).message}`);
    }
  }
  const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
  console.warn(`Done. Curated → public/assets/levels/${id}/ (${mb(before)}MB png → ${mb(after)}MB webp)`);

  // Flag any halftone dither Gemini baked into the curated scene layers (parallax /
  // ground / overlays). Gemini fakes translucency with a dot-screen that reads as ugly
  // checkerboard speckle in-game; check-dither.py catches it deterministically (visual
  // audits false-negatived faint top-edge bands). Non-fatal — just surfaces the layer
  // to re-roll with the no-dither prompt in gen-level-parallax.
  const check = spawnSync("python3", [join(ROOT, "scripts", "check-dither.py"), join(outDir, "*.webp")], {
    encoding: "utf8",
  });
  if (check.stdout?.includes("DITHER")) {
    console.warn("\n⚠ Halftone dither detected in a curated layer — re-roll it with gen-level-parallax --only <key>:");
    console.warn(check.stdout);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
