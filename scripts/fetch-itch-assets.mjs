#!/usr/bin/env node
/**
 * Download owned itch.io packs into raw-assets/itch/ (gitignored). Opt-in;
 * reads ITCH_API_KEY from env or .env. Curate keepers into public/assets/ by
 * hand (with a credit/license note) — raw downloads never get committed.
 *
 * Fill ALLOW_LIST with the exact titles of packs you own + want, then run.
 * Mirrors the proven pattern from the shared dev pipeline (martian-trails).
 *
 * Usage:
 *   pnpm assets:itch          # list owned library, download allow-listed packs
 *   pnpm assets:itch --list   # just print your owned library (no downloads)
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "raw-assets", "itch");
const API = "https://api.itch.io";

// Exact pack titles to download. Populate from `--list` output.
const ALLOW_LIST = new Set([
  // e.g. "Pixel Adventure 1", "Temple Pack", ...
]);

function readKey() {
  if (process.env.ITCH_API_KEY) return process.env.ITCH_API_KEY;
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return undefined;
  // Capture only a key-shaped token (no whitespace/newlines) and trim it.
  return readFileSync(envPath, "utf8")
    .match(/ITCH_API_KEY=([A-Za-z0-9._-]+)/)?.[1]
    ?.trim();
}

async function fetchOwnedKeys(key) {
  const res = await fetch(`${API}/profile/owned-keys`, {
    headers: { Authorization: key },
  });
  if (!res.ok) throw new Error(`itch owned-keys ${res.status}`);
  const data = await res.json();
  return data.owned_keys ?? [];
}

async function main() {
  const key = readKey();
  if (!key) {
    console.error("ITCH_API_KEY missing — copy .env.example to .env and set it.");
    process.exit(1);
  }
  const owned = await fetchOwnedKeys(key);
  if (process.argv.includes("--list")) {
    for (const k of owned) console.warn(`${k.game?.title ?? "?"}  (game ${k.game?.id})`);
    console.warn(`\n${owned.length} owned items. Add titles to ALLOW_LIST to download.`);
    return;
  }

  mkdirSync(OUT, { recursive: true });
  const wanted = owned.filter((k) => ALLOW_LIST.has(k.game?.title));
  if (wanted.length === 0) {
    console.warn(
      "ALLOW_LIST is empty or matched nothing. Run with --list, then populate ALLOW_LIST.",
    );
    return;
  }
  // Per-pack upload listing + download is environment-specific (itch upload IDs);
  // populate ALLOW_LIST and extend here when wiring real downloads.
  console.warn(
    `${wanted.length} pack(s) matched — extend this script to fetch their uploads into ${OUT}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
