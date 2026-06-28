import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { assetUrl } from "@/assetUrl.ts";
import { describe, expect, it } from "vitest";

/** Recursively collect .ts/.tsx files under a directory. */
function tsFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) tsFiles(p, out);
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

describe("assetUrl", () => {
  it("prefixes the app base URL and strips a leading slash", () => {
    // BASE_URL is "/" in the test env, so the result is root-relative here; the
    // contract that matters is that the path is normalised and base-prefixed
    // (on the Pages build BASE_URL is the sub-path).
    expect(assetUrl("assets/player/idle.png")).toBe(`${import.meta.env.BASE_URL}assets/player/idle.png`);
    expect(assetUrl("/assets/player/idle.png")).toBe(`${import.meta.env.BASE_URL}assets/player/idle.png`);
  });

  it("never produces a double slash after the base", () => {
    const url = assetUrl("/assets/x.png");
    expect(url).not.toMatch(/(?<!:)\/\/assets/); // no `//assets` (ignoring protocol)
  });

  // Regression guard: a hardcoded "/assets/..." string ignores the app base URL
  // and 404s on GitHub Pages (served from a sub-path). Every asset URL must be
  // built via assetUrl(). This test fails if any source file reintroduces one.
  it("no source file hardcodes a base-ignoring /assets/ literal", () => {
    const offenders: string[] = [];
    for (const file of tsFiles("src")) {
      // assetUrl.ts documents the anti-pattern in a comment; it's the cure, not a culprit.
      if (file.endsWith("assetUrl.ts")) continue;
      const text = readFileSync(file, "utf8");
      // Strip line + block comments so a documented "/assets/" example never trips the guard.
      const code = text.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      // Match a string/template literal beginning with /assets/ (the base-less form).
      if (/["'`]\/assets\//.test(code)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
