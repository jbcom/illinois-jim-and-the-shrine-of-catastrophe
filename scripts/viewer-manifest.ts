#!/usr/bin/env tsx
/**
 * Build the model viewer's manifest: copy every GLB under raw-assets/models/** into
 * dev/viewer/models/ (so Vite can serve them) and write dev/viewer/models.json the
 * viewer reads. Run after downloading Meshy models:
 *   pnpm tsx scripts/viewer-manifest.ts   (then: pnpm dev → open /dev/viewer/)
 */
import { copyFileSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "raw-assets", "models");
const OUT = join(ROOT, "dev", "viewer", "models");

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (e.endsWith(".glb")) acc.push(p);
  }
  return acc;
}

function main(): void {
  mkdirSync(OUT, { recursive: true });
  let glbs: string[] = [];
  try {
    glbs = walk(SRC);
  } catch {
    console.warn(`No models under ${relative(ROOT, SRC)} yet.`);
  }
  const manifest: { name: string; url: string }[] = [];
  for (const g of glbs.sort()) {
    // Flatten the relative path into a single filename so the URL is simple.
    const rel = relative(SRC, g).replace(/[/\\]/g, "__");
    copyFileSync(g, join(OUT, rel));
    manifest.push({ name: relative(SRC, g).replace(/\.glb$/, ""), url: `./models/${rel}` });
  }
  writeFileSync(join(ROOT, "dev", "viewer", "models.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.warn(`Wrote dev/viewer/models.json (${manifest.length} model(s)). Open /dev/viewer/ in the dev server.`);
}

main();
