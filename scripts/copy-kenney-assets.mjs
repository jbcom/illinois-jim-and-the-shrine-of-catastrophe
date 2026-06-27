#!/usr/bin/env node
/**
 * Copy selected CC0 Kenney 2DLowPoly packs from the local asset library into
 * `public/assets/` (tracked) and emit a manifest. Kenney assets are CC0 (free
 * for commercial use), so unlike itch/Gemini downloads these ARE committed.
 *
 * Source library is the NAS mount; if it's absent (CI), the script no-ops with
 * a warning so the build never depends on the mount being present — the already
 * committed `public/assets/` is what ships.
 *
 * Usage: node scripts/copy-kenney-assets.mjs
 */
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");
const LIB = "/Volumes/home/assets/2DLowPoly";
const OUT = join(REPO, "public", "assets", "kenney");

/** Packs to pull, with the specific files the game uses. */
const SELECTION = [
  {
    pack: "Pixel Platformer",
    files: [
      "Tilemap/tilemap_packed.png",
      "Tilemap/tilemap-characters_packed.png",
      "Tilemap/tilemap-backgrounds_packed.png",
      "License.txt",
    ],
    dest: "platformer",
  },
];

function main() {
  if (!existsSync(LIB)) {
    console.warn(
      `[copy-kenney] asset library not mounted at ${LIB} — skipping (using committed assets).`,
    );
    return;
  }

  const manifest = { generatedFrom: LIB, license: "CC0 (Kenney, www.kenney.nl)", packs: [] };

  for (const entry of SELECTION) {
    const srcRoot = join(LIB, entry.pack);
    if (!existsSync(srcRoot)) {
      console.warn(`[copy-kenney] missing pack: ${entry.pack}`);
      continue;
    }
    const copied = [];
    for (const rel of entry.files) {
      const src = join(srcRoot, rel);
      if (!existsSync(src)) {
        console.warn(`[copy-kenney] missing file: ${entry.pack}/${rel}`);
        continue;
      }
      const out = join(OUT, entry.dest, rel.split("/").pop());
      mkdirSync(dirname(out), { recursive: true });
      cpSync(src, out);
      copied.push(`kenney/${entry.dest}/${rel.split("/").pop()}`);
    }
    manifest.packs.push({ pack: entry.pack, credit: "Kenney", files: copied });
  }

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.warn(
    `[copy-kenney] copied ${manifest.packs.reduce((n, p) => n + p.files.length, 0)} files → ${OUT}`,
  );
}

main();
