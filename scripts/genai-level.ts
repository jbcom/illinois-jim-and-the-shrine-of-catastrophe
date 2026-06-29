#!/usr/bin/env tsx
/**
 * GENAI LEVEL PIPELINE — Gemini crafts a whole level (art + layout) from the Zod
 * contract + a level brief. Run with: `pnpm tsx scripts/genai-level.ts --level 1`.
 *
 * Steps per level:
 *   1. Build the system prompt from the Level JSON-schema (z.toJSONSchema, so every
 *      .describe() reaches the model) + the governing thesis + the level brief.
 *   2. Ask Gemini (text) for the Level JSON; parse + validate with the Zod schema.
 *      On ZodError / danglingArtRefs / brokenGates / entitiesBeforeGoal failure,
 *      feed the error back and retry (up to N times) so the model fixes its output.
 *   3. Write the validated Level to src/levels/<id>.level.json.
 *   4. Generate every art asset (Imagen) → isolate (transparent via magenta flood,
 *      scene/tileable kept) → public/assets/levels/<id>/<key>.png.
 *
 * Opt-in + cost-bearing (Imagen + Gemini). Needs GEMINI_API_KEY (.env).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  brokenGates,
  danglingArtRefs,
  type Level,
  LevelSchema,
  parseLevel,
} from "../src/sim/world/levelSchema.ts";
import { entitiesBeforeGoal } from "../src/sim/world/buildFromLevel.ts";
import { LEVEL_BRIEFS } from "./levelBriefs.ts";
import { geminiGenerateImage, geminiGenerateText, readGeminiKey } from "./genai-client.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const STYLE =
  "16-bit SNES/Genesis pixel-art, limited retro palette of obsidian, tarnished gold, " +
  "blood red, parchment, and teal, dramatic lighting, the mood of an early-90s pulp " +
  "adventure. The hero (referenced in NPC/character art) is Illinois Jim — a warm, " +
  "devil-may-care young explorer in a teal vest and brass-goggle cap.";

const THESIS =
  "THE GOVERNING THESIS: this is an OLD-SCHOOL game — COMMITMENT + PROBLEM-SOLVING + " +
  "earned progress, never quick disposable mobile. BRUTAL with speedrun integrity: " +
  "no exploitable skips; the intended path is genuinely required (gates/keys/puzzles " +
  "can't be bypassed); the goal triggers only on TRUE completion. Levels are LONG and " +
  "you THINK in them: use the problem-solving layer (switches, gates, keys, moving " +
  "platforms, secrets, sparse checkpoints). Build UP from the ground with platforms " +
  "anchored to real objects (their art keys) — nothing floats. Place enemies/pots/" +
  "collectibles/npcs by surface-relative anchors; everything before the goal.";

function buildSystemPrompt(): string {
  const jsonSchema = JSON.stringify(z.toJSONSchema(LevelSchema), null, 2);
  return [
    "You are a master 16-bit level designer. You output ONE level as a single JSON " +
      "object that STRICTLY conforms to the following JSON Schema (every field, every " +
      "constraint). Output ONLY the JSON — no prose, no markdown fences.",
    THESIS,
    `STYLE for all art prompts: ${STYLE}`,
    "ART RULES: for isolation 'transparent', the prompt must describe ONE object on a " +
      "FLAT SOLID MAGENTA (#FF00FF) edge-to-edge background, no border. For 'scene' " +
      "(parallax) describe a full painted backdrop layer. Give EVERY referenced art a " +
      "manifest entry; every entity/placement/parallax/anchorArt key must exist.",
    "LAYOUT RULES: surfaces are laid left-to-right from x=0. The goal is on the LAST " +
      "walkable surface; every entity anchors to an EARLIER position. Raised surfaces " +
      "name their anchorArt. Use several problem-solving elements (the thesis).",
    "DENSITY + PACING (critical — avoid long empty flats): NO single ground surface " +
      "longer than ~600px; a long stretch must be BROKEN into raised platforms, gaps, " +
      "and hazards so the player is constantly DOING something. The raised/gap/rail " +
      "surfaces + obstacles should be the MAJORITY of the level's length, not flat " +
      "ground between sparse rooftops. Build a CONTINUOUS vertical+horizontal route: " +
      "rooftops/ledges that connect (jump from one to the next), stacked tiers, " +
      "branching high/low paths. A 7-min level is ~3000-4500px of DENSE content, not " +
      "10000px of mostly-empty ground. Pace difficulty up across the level.",
    "THE JSON SCHEMA:",
    jsonSchema,
  ].join("\n\n");
}

function buildUserPrompt(brief: (typeof LEVEL_BRIEFS)[number]): string {
  return [
    `Design level ${brief.order}: "${brief.title}".`,
    `biome: ${brief.biome}`,
    `types (blend): ${brief.types.join(", ")}`,
    `targetMinutes: ${brief.targetMinutes}`,
    `STORY BEAT: ${brief.beat}`,
    `CONTENT DIRECTION: ${brief.content}`,
    `SETPIECE: ${brief.setpiece}`,
    `ART TO GENERATE (at minimum): ${brief.art}`,
    "Emit the complete Level JSON now.",
  ].join("\n");
}

/** Validate raw model text into a Level; returns {level} or {error} for the retry. */
function validate(text: string): { level: Level } | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(stripFences(text));
  } catch (e) {
    return { error: `Output was not valid JSON: ${(e as Error).message}` };
  }
  let level: Level;
  try {
    level = parseLevel(raw);
  } catch (e) {
    if (e instanceof z.ZodError) return { error: `Schema validation failed:\n${z.prettifyError(e)}` };
    return { error: `Validation failed: ${(e as Error).message}` };
  }
  const dangling = danglingArtRefs(level);
  if (dangling.length) return { error: `These art keys are referenced but missing from the manifest: ${dangling.join(", ")}` };
  const gates = brokenGates(level);
  if (gates.length) return { error: `Broken gates (soft-locks): ${gates.join("; ")}` };
  if (!entitiesBeforeGoal(level)) return { error: "Some entity/spawn sits at or past the goal (unreachable / early win-skip). Move them before the goal." };
  return { level };
}

function stripFences(t: string): string {
  return t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

async function generateLevelJson(brief: (typeof LEVEL_BRIEFS)[number], key: string): Promise<Level> {
  const gen = geminiGenerateText(key);
  const system = buildSystemPrompt();
  let user = buildUserPrompt(brief);
  for (let attempt = 1; attempt <= 4; attempt++) {
    console.warn(`  level ${brief.order} — Gemini attempt ${attempt}…`);
    const text = await gen(system, user);
    const res = validate(text);
    if ("level" in res) {
      console.warn(`  ✓ valid Level JSON (${res.level.art.length} art assets, ${res.level.surfaces.length} surfaces)`);
      return res.level;
    }
    console.warn(`  ✗ ${res.error.split("\n")[0]}`);
    user = `${buildUserPrompt(brief)}\n\nYour previous output FAILED validation:\n${res.error}\n\nFix it and emit the corrected complete Level JSON.`;
  }
  throw new Error(`level ${brief.order}: Gemini failed to produce a valid Level after 4 attempts`);
}

/**
 * Compose the FINAL Imagen prompt for one asset, INFORMED by the whole level so no
 * image is generated uninformed (end-to-end coherence): the shared STYLE, the
 * level's biome + story beat, the asset's role + intended world height, and — for
 * isolation modes — the exact backdrop rule. The design (Gemini) thus drives the
 * art (Imagen): every image knows its level, its neighbours, and its job.
 */
function composeArtPrompt(level: Level, asset: Level["art"][number]): string {
  const ctx =
    `${STYLE} This image is for the level "${level.title}" (biome: ${level.biome}). ` +
    `Story beat: ${level.story.beat} It is the ${asset.role} "${asset.key}".`;
  const backdrop =
    asset.isolation === "transparent"
      ? " Render ONE object ONLY, centered on a FLAT SOLID MAGENTA (#FF00FF) background filling the entire frame edge to edge — no border, no scenery, no ground, no shadow."
      : asset.isolation === "tileable"
        ? " Render a horizontally SEAMLESS, edge-to-edge tileable strip (left and right edges must match for repetition)."
        : " Render a full painted background layer for this biome, edge to edge.";
  return `${ctx} ${asset.prompt}.${backdrop}`;
}

async function generateArt(level: Level, key: string): Promise<void> {
  const genImg = geminiGenerateImage(key);
  const rawDir = join(ROOT, "raw-assets", "generated", "levels", level.id);
  mkdirSync(rawDir, { recursive: true });
  for (const asset of level.art) {
    console.warn(`  art ${asset.key} (${asset.role}, ${asset.isolation}, ${asset.aspect}, h=${asset.worldHeight})…`);
    const bytes = await genImg(composeArtPrompt(level, asset), asset.aspect);
    if (!bytes) {
      console.warn(`    ⚠ no image for ${asset.key}`);
      continue;
    }
    writeFileSync(join(rawDir, `${asset.key}.png`), bytes);
  }
  console.warn(`  raw art → raw-assets/generated/levels/${level.id}/ (isolate next, informed by each asset's isolation mode)`);
}

async function main() {
  const key = readGeminiKey();
  if (!key) {
    console.error("GEMINI_API_KEY missing — set it in .env.");
    process.exit(1);
  }
  const idx = process.argv.indexOf("--level");
  const order = idx >= 0 ? Number(process.argv[idx + 1]) : 1;
  const brief = LEVEL_BRIEFS.find((b) => b.order === order);
  if (!brief) {
    console.error(`No brief for level ${order} (have 1-${LEVEL_BRIEFS.length}).`);
    process.exit(1);
  }
  const jsonOnly = process.argv.includes("--json-only");

  console.warn(`Generating level ${order}: ${brief.title}`);
  const level = await generateLevelJson(brief, key);

  const outDir = join(ROOT, "src", "levels");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `${level.id}.level.json`);
  writeFileSync(outPath, `${JSON.stringify(level, null, 2)}\n`);
  console.warn(`  wrote ${outPath}`);

  if (!jsonOnly) await generateArt(level, key);
  console.warn("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
