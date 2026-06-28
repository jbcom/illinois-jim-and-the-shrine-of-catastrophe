import { CUTSCENES, cutsceneById } from "@sim/story/cutscenes.ts";
import { describe, expect, it } from "vitest";

describe("cutscene script", () => {
  it("has a beat for each story stage in order, ending with the finale", () => {
    expect(CUTSCENES[0]?.id).toBe("intro");
    expect(CUTSCENES.at(-1)?.id).toBe("escape");
    // Only the final cutscene has no nextLevel (it's the ending).
    const withoutNext = CUTSCENES.filter((c) => !c.nextLevel);
    expect(withoutNext).toHaveLength(1);
    expect(withoutNext[0]?.id).toBe("escape");
  });

  it("every cutscene has a base image path and at least one line", () => {
    for (const c of CUTSCENES) {
      // `image` is a BASE path (no extension); the player appends the aspect
      // variant (-16x9 / -9x16 / -1x1).png for the viewport.
      expect(c.image).toMatch(/^\/assets\/cutscenes\/[^.]+$/);
      expect(c.lines.length).toBeGreaterThan(0);
      for (const l of c.lines) expect(l.length).toBeGreaterThan(0);
    }
  });

  it("resolves cutscenes by id and returns undefined for unknown", () => {
    expect(cutsceneById("shrine")?.image).toContain("cut-04-shrine");
    expect(cutsceneById("nope")).toBeUndefined();
  });

  it("each nextLevel is a non-empty level id", () => {
    for (const c of CUTSCENES) {
      if (c.nextLevel !== undefined) expect(c.nextLevel.length).toBeGreaterThan(0);
    }
  });
});
