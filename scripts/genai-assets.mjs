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

// The hero for full key-art — the original in-game Illinois Jim (teal explorer
// vest, brass-goggle cap, amber relic-lantern, coiled grappling hook), so the
// landing illustration matches the sprite the player actually controls. He's
// DEVIL-MAY-CARE: a roguish, swashbuckling pulp adventurer — cocky grin, hat at
// a rakish angle, relaxed confident swagger, the easy charm of a treasure-hunter
// who's already decided the danger is worth it.
const HERO =
  "Illinois Jim, a handsome young hero explorer with a WARM, FRIENDLY, GENUINE " +
  "smile and kind bright eyes — likable and charming, an easygoing adventurer, " +
  "NOT menacing, NOT sinister, NOT a villain, no evil grimace, no bared teeth, " +
  "no scowl; relaxed confident heroic posture, in a teal adventurer's vest, a " +
  "brass-goggle cap worn at a rakish angle, carrying a glowing amber relic-lantern " +
  "and a coiled grappling hook";

const PROMPTS = [
  // Story beats — one full-screen scene per cutscene, in narrative order. Each is
  // multiAspect: rendered 16:9 / 9:16 / 1:1 so the right crop serves every viewport.
  { name: "cut-01-village", multiAspect: true, prompt: `${CUT}; ${JIM} standing at the edge of a windswept clifftop village at dusk, an elder pointing toward a distant mountain shrine, the sea far below` },
  { name: "cut-02-descent", multiAspect: true, prompt: `${CUT}; ${JIM} lowering himself by rope into a vast black cave mouth in the mountainside, torchlight flickering on jagged rock, ominous depth below` },
  { name: "cut-03-ruins", multiAspect: true, prompt: `${CUT}; ${JIM} crossing a crumbling brick-and-stone underground ruin lit by glowing red gems, broken pottery and ancient carvings around him` },
  { name: "cut-04-shrine", multiAspect: true, prompt: `${CUT}; a towering ancient shrine deep underground, a single glowing idol on an altar atop cracked steps, ${JIM} small in the foreground gazing up in awe and dread` },
  { name: "cut-05-catastrophe", multiAspect: true, prompt: `${CUT}; the shrine cracking and erupting with red light as ${JIM} grabs the idol and flees, the cavern collapsing behind him, debris and dust` },
  { name: "cut-06-escape", multiAspect: true, prompt: `${CUT}; ${JIM} bursting out of the cave mouth into dawn light clutching the glowing idol, the mountain crumbling behind him, triumphant and exhausted` },
  // Branding.
  {
    name: "title-wordmark",
    prompt:
      "16-bit pulp adventure game logo wordmark reading 'ILLINOIS JIM AND THE SHRINE OF CATASTROPHE', carved-stone gold lettering with a cracked-relic motif, on a transparent background",
  },
  // Landing-page hero key-art — a full, cinematic 16-bit title illustration of
  // the hero over the overworld, for the dedicated landing scene (NOT the live
  // engine). Wide 16:9 so it fills a landscape title screen.
  {
    name: "landing-hero",
    multiAspect: true,
    prompt:
      `${CUT}; a heroic key-art title illustration of ${HERO}, standing with a confident roguish stance on a ` +
      "clifftop trail at golden dusk, relic-lantern raised, smirking toward a distant dark mountain shrine " +
      "wreathed in red light; a windswept village of pitched-roof houses and tents below, weeping willows and " +
      "pines, dramatic god-rays, wide cinematic 16:9 composition with the hero left-of-centre and the mountain " +
      "far right. NO TEXT, NO WORDS, NO LETTERS, NO LOGO anywhere in the image — illustration only",
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
  // Scene art (cutscenes + landing hero) is generated in THREE aspect ratios so
  // the right crop serves each viewport: 16:9 landscape (locked phones + wide
  // screens), 9:16 portrait (the landing on a held-upright phone), 1:1 square
  // (a safe middle for foldables / tablets in either rotation). Files are
  // suffixed -16x9 / -9x16 / -1x1; the wordmark + any non-scene asset stays 1:1.
  const ASPECTS = { "16:9": "16x9", "9:16": "9x16", "1:1": "1x1" };
  // Append ratio-specific framing so each variant is COMPOSED for its shape (the
  // shared CUT cue is otherwise landscape-biased — "cinematic wide composition").
  const frameFor = (prompt, ratio) => {
    if (ratio === "9:16") return `${prompt}; vertical portrait composition, tall framing, the subject fills the frame top-to-bottom`;
    if (ratio === "1:1") return `${prompt}; square composition, balanced centred framing with safe margins`;
    return `${prompt}; wide cinematic landscape composition`;
  };
  for (const p of prompts) {
    const ratios = p.multiAspect ? Object.entries(ASPECTS) : [["1:1", null]];
    for (const [ratio, suffix] of ratios) {
      const outName = suffix ? `${p.name}-${suffix}` : p.name;
      console.warn(`generating ${outName} (${ratio})…`);
      const bytes = await generate(p.multiAspect ? frameFor(p.prompt, ratio) : p.prompt, ratio);
      if (!bytes) {
        console.warn(`  no image returned for ${outName}`);
        continue;
      }
      writeFileSync(join(OUT, `${outName}.png`), bytes);
      console.warn(`  wrote raw-assets/generated/${outName}.png`);
    }
  }
  console.warn("Done. Curate keepers from raw-assets/generated/ into public/assets/.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
