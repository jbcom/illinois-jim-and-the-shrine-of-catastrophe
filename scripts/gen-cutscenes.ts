/**
 * Generate the campaign's cutscene scene art via the Gemini image path (NOT Meshy —
 * no credit blocker). Each cutscene is painted in three aspect crops so it's COMPOSED
 * for the viewport shape (16x9 landscape / 9x16 portrait / 1x1 square), matching
 * src/ui/aspectImage.ts. Writes straight to public/assets/cutscenes/<id>-<aspect>.png.
 *
 * Run: TSX_TSCONFIG_PATH=tsconfig.app.json tsx scripts/gen-cutscenes.ts
 *
 * The scene list mirrors src/sim/story/campaign.ts (5 chapter intros + the cliffhanger).
 * Keep the `id` values in sync with the campaign's introCutscene ids + CLIFFHANGER_ID.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// @ts-expect-error — plain .mjs client, no types
import { geminiGenerateImage, IMAGE_MODEL_PRO, readGeminiKey } from "./genai-client.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "assets", "cutscenes");

const STYLE =
  "16-bit SNES/Genesis-era pixel art, painterly cinematic cutscene splash, rich " +
  "saturated retro palette, dramatic lighting, no text, no UI, no characters unless named.";

interface Scene {
  readonly id: string;
  readonly prompt: string;
}

/** Mirrors campaign.ts: the chapter intros (by introCutscene id) + the cliffhanger. */
const SCENES: readonly Scene[] = [
  {
    id: "cut-intro-village",
    prompt:
      "A windswept clifftop village at dusk perched above a dark sea and a brooding mountain, " +
      "pitched-roof cottages, a lit watchtower, storm clouds gathering over the peak, ominous and lonely.",
  },
  {
    id: "cut-jungle",
    prompt:
      "The mouth of a vast ancient jungle swallowing a narrow trail, colossal gnarled trees and " +
      "hanging vines, deep green shadow, shafts of twilight, something unseen watching from the canopy.",
  },
  {
    id: "cut-gorge",
    prompt:
      "A roaring river gorge at sunset, sheer canyon walls, white-water rapids plunging between rocks, " +
      "mist and spray, a tiny abandoned rope ferry, the only way forward is down through the water.",
  },
  {
    id: "cut-mine",
    prompt:
      "The dark entrance of an abandoned mountain mine, rotting timber scaffolding and rusted rails, " +
      "a derelict ore cart, a single lantern glow swallowed by black tunnels boring into the rock.",
  },
  {
    id: "cut-crystal",
    prompt:
      "A vast underground cavern of glowing blue and violet crystal formations, luminous geodes and " +
      "crystal bridges over a dark void, beautiful and lethal, the crystals seem to hum with light.",
  },
  {
    id: "cut-cliffhanger",
    prompt:
      "Looking down from a crystal ledge into a drowned dark abyss, half-flooded ancient temple ruins " +
      "far below lit by an ominous distant red glow, a sense of vast depth and an unfinished descent.",
  },
];

const ASPECTS: readonly { key: string; ratio: string }[] = [
  { key: "16x9", ratio: "16:9" },
  { key: "9x16", ratio: "9:16" },
  { key: "1x1", ratio: "1:1" },
];

async function main() {
  const key = readGeminiKey();
  if (!key) {
    console.error("GEMINI_API_KEY missing — set it in .env.");
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });
  const genImg = geminiGenerateImage(key);

  for (const scene of SCENES) {
    for (const aspect of ASPECTS) {
      const opts = { aspectRatio: aspect.ratio, imageSize: "2K", model: IMAGE_MODEL_PRO };
      console.warn(`  ${scene.id}-${aspect.key} (${aspect.ratio})…`);
      const bytes = await genImg(`${STYLE} ${scene.prompt}`, opts);
      if (!bytes) {
        console.warn(`    ⚠ no image for ${scene.id}-${aspect.key}`);
        continue;
      }
      writeFileSync(join(OUT, `${scene.id}-${aspect.key}.png`), bytes);
    }
  }
  console.warn(`cutscene art → ${OUT}`);
}

void main();
