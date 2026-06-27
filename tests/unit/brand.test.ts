import { describe, expect, it } from "vitest";
import { BRAND, TITLE, TITLE_SHORT, TYPE } from "@/brand.ts";

describe("brand identity", () => {
  it("every colour is a valid #rrggbb hex", () => {
    for (const [name, value] of Object.entries(BRAND)) {
      expect(value, name).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("exposes the expected palette roles", () => {
    expect(Object.keys(BRAND)).toEqual([
      "obsidian",
      "stone",
      "sandstone",
      "idolGold",
      "relicGold",
      "bloodRed",
      "parchment",
      "jungle",
      "steel",
    ]);
  });

  it("provides display, hud, and numeric type stacks", () => {
    expect(TYPE.display).toContain("serif");
    expect(TYPE.hud).toContain("sans-serif");
    expect(TYPE.numeric).toContain("monospace");
  });

  it("uses the original title (not the source franchise)", () => {
    expect(TITLE).toBe("Illinois Jim and the Shrine of Catastrophe");
    expect(TITLE_SHORT).toBe("Illinois Jim");
    expect(TITLE.toLowerCase()).not.toContain("indiana");
  });
});
