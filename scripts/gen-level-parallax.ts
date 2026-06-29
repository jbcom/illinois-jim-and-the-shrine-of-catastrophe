/**
 * Focused parallax/ground art generator for a GenAI level — generates ONLY the
 * 2D backdrop + ground/overlay layers (the things that legitimately stay Gemini
 * 2D), NOT the props (those are baked 3D via Meshy). Avoids spending image
 * credits on prop reference art the baked pipeline never uses.
 *
 * Run: TSX_TSCONFIG_PATH=tsconfig.app.json tsx scripts/gen-level-parallax.ts --level <id> [--roles parallax,ground,decor]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// @ts-expect-error — plain .mjs client, no types
import { geminiGenerateImage, IMAGE_MODEL_FLASH, IMAGE_MODEL_PRO, readGeminiKey } from "./genai-client.mjs";
import { parseLevel, type Level } from "../src/sim/world/levelSchema.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const STYLE =
  "16-bit SNES/Genesis-era pixel art, painterly parallax, rich saturated retro palette, " +
  "clean readable shapes, no text, no UI.";

function promptFor(level: Level, asset: Level["art"][number]): string {
  if (asset.role === "parallax") {
    return (
      `${STYLE} A wide empty PARALLAX BACKDROP layer for biome ${level.biome}: ${asset.prompt}. ` +
      "A distant, depopulated atmospheric vista filling the whole frame — open sky and far " +
      "scenery only, no characters, no foreground objects, no walkable ground path."
    );
  }
  if (asset.role === "ground") {
    return (
      `${STYLE} A seamless horizontally-tileable GROUND/SURFACE strip for biome ${level.biome}: ` +
      `${asset.prompt}. Fills the frame edge to edge, no characters, no props, top-lit.`
    );
  }
  // decor / overlay (e.g. a waterfall sheet) — a full-frame translucent-looking sheet.
  return (
    `${STYLE} A full-frame atmospheric OVERLAY sheet for biome ${level.biome}: ${asset.prompt}. ` +
    "Centered vertical motion element, dark margins, no characters, no ground, no props."
  );
}

async function main() {
  const key = readGeminiKey();
  if (!key) {
    console.error("GEMINI_API_KEY missing — set it in .env.");
    process.exit(1);
  }
  const idIdx = process.argv.indexOf("--level");
  const levelId = idIdx >= 0 ? process.argv[idIdx + 1] : undefined;
  if (!levelId) {
    console.error("usage: gen-level-parallax --level <level-id> [--roles parallax,ground,decor]");
    process.exit(1);
  }
  const rolesIdx = process.argv.indexOf("--roles");
  const rolesArg = (rolesIdx >= 0 ? process.argv[rolesIdx + 1] : undefined) ?? "parallax,ground,decor";
  const roles = new Set(rolesArg.split(","));

  // biome-only import of the level JSON.
  const raw = await import(`../src/levels/${levelId}.level.json`, { with: { type: "json" } });
  const level = parseLevel(raw.default);

  const genImg = geminiGenerateImage(key);
  const outDir = join(ROOT, "raw-assets", "generated", "levels", level.id);
  mkdirSync(outDir, { recursive: true });

  const targets = level.art.filter((a) => roles.has(a.role));
  console.warn(`level ${level.id}: generating ${targets.length} layer(s) [${[...roles].join(",")}]`);
  for (const asset of targets) {
    const big = asset.role === "parallax";
    const opts = { aspectRatio: asset.aspect, imageSize: big ? "2K" : "1K", model: big ? IMAGE_MODEL_PRO : IMAGE_MODEL_FLASH };
    console.warn(`  ${asset.key} (${asset.role}, ${opts.imageSize})…`);
    const bytes = await genImg(promptFor(level, asset), opts);
    if (!bytes) {
      console.warn(`    ⚠ no image for ${asset.key}`);
      continue;
    }
    writeFileSync(join(outDir, `${asset.key}.png`), bytes);
  }
  console.warn(`raw parallax/ground art → ${outDir}`);
}

void main();
