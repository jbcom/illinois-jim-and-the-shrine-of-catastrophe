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

// GenAI is used ONLY for cutscene scenes + branding — gameplay sprites come from
// real transparent asset packs. (The old isolated-hero sprite prompts were
// retired when the hero became the real classes/adventure pack.)

// Cutscene style — full-screen 16-bit SNES/Genesis-era story art. Unlike the
// gameplay sprites (which come from real transparent packs), cutscenes are
// PAINTED SCENES with backgrounds: this is the one place GenAI art belongs.
const CUT =
  "16-bit SNES-era pixel-art story cutscene illustration, full scene with a " +
  "background, cinematic wide composition, dramatic lighting, limited retro " +
  "palette of obsidian, tarnished gold, blood red, parchment, and teal; the mood " +
  "of an early-90s pulp adventure game";

// The hero as he appears in cutscenes (matches the in-game red-cloaked adventurer).
const JIM = "Illinois Jim, a wiry young adventurer in a dark red hooded cloak and travel boots";

const PROMPTS = [
  // Story beats — one full-screen scene per cutscene, in narrative order.
  { name: "cut-01-village", prompt: `${CUT}; ${JIM} standing at the edge of a windswept clifftop village at dusk, an elder pointing toward a distant mountain shrine, the sea far below` },
  { name: "cut-02-descent", prompt: `${CUT}; ${JIM} lowering himself by rope into a vast black cave mouth in the mountainside, torchlight flickering on jagged rock, ominous depth below` },
  { name: "cut-03-ruins", prompt: `${CUT}; ${JIM} crossing a crumbling brick-and-stone underground ruin lit by glowing red gems, broken pottery and ancient carvings around him` },
  { name: "cut-04-shrine", prompt: `${CUT}; a towering ancient shrine deep underground, a single glowing idol on an altar atop cracked steps, ${JIM} small in the foreground gazing up in awe and dread` },
  { name: "cut-05-catastrophe", prompt: `${CUT}; the shrine cracking and erupting with red light as ${JIM} grabs the idol and flees, the cavern collapsing behind him, debris and dust` },
  { name: "cut-06-escape", prompt: `${CUT}; ${JIM} bursting out of the cave mouth into dawn light clutching the glowing idol, the mountain crumbling behind him, triumphant and exhausted` },
  // Branding.
  {
    name: "title-wordmark",
    prompt:
      "16-bit pulp adventure game logo wordmark reading 'ILLINOIS JIM AND THE SHRINE OF CATASTROPHE', carved-stone gold lettering with a cracked-relic motif, on a transparent background",
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
