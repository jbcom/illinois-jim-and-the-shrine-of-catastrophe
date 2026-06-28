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
// Lead HARD with isolation — Imagen bakes scenery into dynamic poses unless the
// very first tokens forbid it. Flat solid magenta keys out cleanly downstream.
const STYLE =
  "isolated single game-sprite asset on a COMPLETELY FLAT SOLID MAGENTA (#FF00FF) " +
  "background, absolutely NO floor, NO wall, NO ground line, NO bricks, NO room, " +
  "NO scenery, NO cast shadow, NO drop shadow, NO vignette, NO frame, NO border; " +
  "one character only, full body, centered, feet at the bottom; clean chunky " +
  "pixel-art for a side-scrolling platformer; the CHARACTER uses a warm temple " +
  "palette of obsidian, tarnished gold, blood red, parchment, and teal";

// Illinois Jim: a wiry adventurer in a TEAL explorer vest and GOGGLES pushed up
// on a flat cap (NOT a fedora), a glowing relic-lantern at the hip and a grappling
// hook (NOT a bullwhip). Deliberately distinct from any existing pulp hero.
const HERO =
  "Illinois Jim, a wiry young explorer wearing a teal canvas vest, leather " +
  "bracers, a flat newsboy cap with brass goggles pushed up, carrying a glowing " +
  "amber relic-lantern and a coiled grappling hook";

const PROMPTS = [
  // Hero — ONE pose per file (transparent), assembled into animations by the
  // renderer's frame-source layer (single-image frames OR strips), never baked
  // into a strip here. Enough poses that idle/run/jump/attack read as motion.
  // Every pose is framed FLOATING / off-ground so Imagen has no excuse to bake a
  // floor — the feet never touch a surface. Bottom-anchored in-engine anyway.
  { name: "illinois-jim-idle-1", prompt: `${STYLE}; ${HERO}, floating in empty space, standing idle pose facing right, arms relaxed, feet hanging with nothing beneath them` },
  { name: "illinois-jim-idle-2", prompt: `${STYLE}; ${HERO}, floating in empty space, idle breathing pose facing right, lantern swaying, feet hanging with nothing beneath them` },
  { name: "illinois-jim-run-1", prompt: `${STYLE}; ${HERO}, suspended mid-air in a running pose facing right, left knee raised high, arms pumping, nothing touching the ground` },
  { name: "illinois-jim-run-2", prompt: `${STYLE}; ${HERO}, suspended mid-air in a running pose facing right, legs scissoring, leaning forward, nothing touching the ground` },
  { name: "illinois-jim-run-3", prompt: `${STYLE}; ${HERO}, suspended mid-air in a running pose facing right, right knee raised high, opposite arm swing, nothing touching the ground` },
  { name: "illinois-jim-run-4", prompt: `${STYLE}; ${HERO}, suspended mid-air in a running pose facing right, back leg extended behind in push-off, nothing touching the ground` },
  { name: "illinois-jim-jump-1", prompt: `${STYLE}; ${HERO}, airborne launching upward, knees bent, facing right, high above any ground` },
  { name: "illinois-jim-jump-2", prompt: `${STYLE}; ${HERO}, airborne at the apex of a jump, legs tucked, grappling hook raised, facing right, high above any ground` },
  { name: "illinois-jim-fall", prompt: `${STYLE}; ${HERO}, airborne falling, arms out for balance, facing right, high above any ground` },
  { name: "illinois-jim-attack-1", prompt: `${STYLE}; ${HERO}, floating in empty space, swinging the coiled grappling hook forward to strike, facing right, wind-up, feet off the ground` },
  { name: "illinois-jim-attack-2", prompt: `${STYLE}; ${HERO}, floating in empty space, grappling hook snapped fully forward at full extension, facing right, follow-through, feet off the ground` },
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
  // `--only <substr>` narrows the run to matching prompt names (e.g. the hero).
  const onlyIdx = process.argv.indexOf("--only");
  const only = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : undefined;
  const prompts = only ? PROMPTS.filter((p) => p.name.includes(only)) : PROMPTS;
  for (const p of prompts) {
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
