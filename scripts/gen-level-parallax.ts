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
  "clean readable shapes, SOLID flat color fills with smooth hand-shaded gradients — " +
  "NO halftone dithering, NO stipple, NO checkerboard/dot-screen shading anywhere (paint " +
  "highlights and translucency as solid blended color, the way a hand-pixeled SNES backdrop " +
  "does, never as a dot pattern); foam, mist and water spray are SOLID light shapes, not dithered.";

/**
 * Hard negative constraint appended to EVERY layer prompt. Gemini has a strong
 * habit of painting a faux arcade chrome into level backdrops — a top HUD bar
 * reading "SCORE: 00000  ILLINOIS JIM", a wordmark, a frame border. A passive
 * "no text" in the positive style string was not enough (it shipped that exact
 * bar into the jungle leaves layer), so we name the failure explicitly and put
 * it last, where it carries the most weight.
 */
const NO_CHROME =
  " ABSOLUTELY NO TEXT of any kind: no letters, no words, no numbers, no SCORE counter, " +
  "no HUD bar, no status bar, no title, no wordmark (never the words 'ILLINOIS JIM'), " +
  "no UI, no frame border, no watermark, no logo. Pure scenery art only — every pixel is " +
  "the depicted environment, edge to edge, with nothing overlaid on top of it.";

function promptFor(level: Level, asset: Level["art"][number]): string {
  if (asset.role === "parallax") {
    return (
      `${STYLE} A wide empty PARALLAX BACKDROP layer for biome ${level.biome}: ${asset.prompt}. ` +
      "A distant, depopulated atmospheric vista filling the whole frame — open sky and far " +
      "scenery only, no characters, no foreground objects, no walkable ground path." +
      NO_CHROME
    );
  }
  if (asset.role === "ground") {
    return (
      `${STYLE} A seamless horizontally-tileable GROUND/SURFACE strip for biome ${level.biome}: ` +
      `${asset.prompt}. Fills the frame edge to edge, no characters, no props, top-lit.` +
      NO_CHROME
    );
  }
  // decor / overlay (e.g. a waterfall sheet) — a full-frame translucent-looking sheet.
  return (
    `${STYLE} A full-frame atmospheric OVERLAY sheet for biome ${level.biome}: ${asset.prompt}. ` +
    "Centered vertical motion element, dark margins, no characters, no ground, no props." +
    NO_CHROME
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
  // `--only <key[,key2]>` regenerates just the named asset(s) — e.g. re-roll a
  // single defective layer without spending credits re-rolling its clean siblings.
  const onlyIdx = process.argv.indexOf("--only");
  const only = onlyIdx >= 0 ? new Set((process.argv[onlyIdx + 1] ?? "").split(",")) : undefined;

  // biome-only import of the level JSON.
  const raw = await import(`../src/levels/${levelId}.level.json`, { with: { type: "json" } });
  const level = parseLevel(raw.default);

  const genImg = geminiGenerateImage(key);
  const outDir = join(ROOT, "raw-assets", "generated", "levels", level.id);
  mkdirSync(outDir, { recursive: true });

  const targets = level.art.filter((a) => roles.has(a.role) && (!only || only.has(a.key)));
  const scope = only ? `only [${[...only].join(",")}]` : `[${[...roles].join(",")}]`;
  console.warn(`level ${level.id}: generating ${targets.length} layer(s) ${scope}`);
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
