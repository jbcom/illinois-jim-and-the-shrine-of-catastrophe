#!/usr/bin/env node
/**
 * Generate ORIGINAL Illinois-Jim sprites + branding art via Gemini/Imagen.
 * Output lands in raw-assets/generated/ (gitignored); curate keepers into
 * public/assets/ by hand. Opt-in + cost-bearing — runs only when invoked.
 *
 * Usage:
 *   pnpm assets:gen            # generate the default prompt set
 *   pnpm assets:gen --list     # print prompts without generating
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { geminiGenerateImage, readGeminiKey } from "./genai-client.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "raw-assets", "generated");

const STYLE =
  "16-bit pixel art, transparent background, single centered subject, " +
  "warm torch-lit temple palette (obsidian, tarnished gold, blood red, parchment), " +
  "pulp adventure tone, original character (not Indiana Jones)";

const PROMPTS = [
  {
    name: "illinois-jim-idle",
    prompt: `${STYLE}; the hero Illinois Jim standing idle, fedora, satchel, coiled whip`,
  },
  { name: "illinois-jim-run", prompt: `${STYLE}; Illinois Jim mid-run stride` },
  { name: "illinois-jim-jump", prompt: `${STYLE}; Illinois Jim leaping, whip trailing` },
  { name: "idol-relic", prompt: `${STYLE}; a glowing golden idol relic collectible` },
  {
    name: "title-wordmark",
    prompt:
      "pulp adventure game logo wordmark reading 'ILLINOIS JIM AND THE SHRINE OF CATASTROPHE', carved-stone gold lettering, transparent background",
  },
];

async function main() {
  if (process.argv.includes("--list")) {
    for (const p of PROMPTS) console.warn(`${p.name}: ${p.prompt}`);
    return;
  }
  const key = readGeminiKey();
  if (!key) {
    console.error("GEMINI_API_KEY missing — copy .env.example to .env and set it.");
    process.exit(1);
  }
  const generate = geminiGenerateImage(key);
  mkdirSync(OUT, { recursive: true });
  for (const p of PROMPTS) {
    console.warn(`generating ${p.name}…`);
    const bytes = await generate(p.prompt);
    if (!bytes) {
      console.warn(`  no image returned for ${p.name}`);
      continue;
    }
    writeFileSync(join(OUT, `${p.name}.png`), bytes);
    console.warn(`  wrote raw-assets/generated/${p.name}.png`);
  }
  console.warn("Done. Curate keepers from raw-assets/generated/ into public/assets/.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
