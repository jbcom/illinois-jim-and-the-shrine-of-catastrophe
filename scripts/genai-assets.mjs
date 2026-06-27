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

// Hard art-direction guardrails: an ORIGINAL hero — explicitly NOT the
// brown-fedora-and-whip archetype. Distinct silhouette so it can't read as any
// existing franchise. Clean game-sprite format (no scene/background), small,
// chunky, readable at platformer scale.
const STYLE =
  "clean 32x32 pixel-art game sprite, single character centered on a FULLY " +
  "TRANSPARENT background, no scenery, no ground, no frame; chunky readable " +
  "silhouette for a side-scrolling platformer; warm temple palette of obsidian, " +
  "tarnished gold, blood red, and parchment";

// Illinois Jim: a wiry adventurer in a TEAL explorer vest and GOGGLES pushed up
// on a flat cap (NOT a fedora), a glowing relic-lantern at the hip and a grappling
// hook (NOT a bullwhip). Deliberately distinct from any existing pulp hero.
const HERO =
  "Illinois Jim, a wiry young explorer wearing a teal canvas vest, leather " +
  "bracers, a flat newsboy cap with brass goggles pushed up, carrying a glowing " +
  "amber relic-lantern and a coiled grappling hook";

const PROMPTS = [
  { name: "illinois-jim-idle", prompt: `${STYLE}; ${HERO}, standing idle facing right` },
  { name: "illinois-jim-run", prompt: `${STYLE}; ${HERO}, mid-run stride facing right` },
  {
    name: "illinois-jim-jump",
    prompt: `${STYLE}; ${HERO}, leaping with grappling hook raised, facing right`,
  },
  {
    name: "idol-relic",
    prompt: `${STYLE}; a single glowing golden idol relic collectible, faceted gem core`,
  },
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
