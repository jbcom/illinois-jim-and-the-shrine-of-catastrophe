import { CAMPAIGN, CLIFFHANGER_ID, campaignLevelOrder } from "@sim/story/campaign.ts";
import { CUTSCENES, cutsceneById } from "@sim/story/cutscenes.ts";
import { describe, expect, it } from "vitest";

/**
 * Cutscenes are DERIVED from the CAMPAIGN: one intro per chapter + the cliffhanger.
 * These lock that derivation so the chain can't drift from the level order.
 */
describe("cutscene script (derived from the campaign)", () => {
  it("opens on the first chapter's intro and ends on the cliffhanger", () => {
    expect(CUTSCENES[0]?.id).toBe(CAMPAIGN[0]?.introCutscene);
    expect(CUTSCENES.at(-1)?.id).toBe(CLIFFHANGER_ID);
    // Only the cliffhanger has no nextLevel (it's the ending of the shipped arc).
    const withoutNext = CUTSCENES.filter((c) => !c.nextLevel);
    expect(withoutNext).toHaveLength(1);
    expect(withoutNext[0]?.id).toBe(CLIFFHANGER_ID);
  });

  it("has exactly one intro cutscene per campaign chapter, in order", () => {
    const introIds = CUTSCENES.filter((c) => c.nextLevel).map((c) => c.id);
    expect(introIds).toEqual(CAMPAIGN.map((ch) => ch.introCutscene));
  });

  it("every intro cutscene's nextLevel is a real campaign level, in order", () => {
    const order = campaignLevelOrder();
    const chained = CUTSCENES.filter((c) => c.nextLevel).map((c) => c.nextLevel);
    expect(chained).toEqual(order);
    // No legacy shape-stamp level ids leak in.
    for (const c of CUTSCENES) {
      if (c.nextLevel) {
        expect(c.nextLevel).not.toMatch(/village-approach|cave-descent|shrine-approach|shrine-heart|escape-run/);
      }
    }
  });

  it("every cutscene has a resolved image path and at least one line", () => {
    for (const c of CUTSCENES) {
      // `image` is a resolved BASE path (no extension); the player appends the aspect
      // variant (-16x9 / -9x16 / -1x1).webp for the viewport.
      expect(c.image).toMatch(/\/assets\/cutscenes\/[^.]+$/);
      expect(c.lines.length).toBeGreaterThan(0);
      for (const l of c.lines) expect(l.length).toBeGreaterThan(0);
    }
  });

  it("resolves cutscenes by id and returns undefined for unknown", () => {
    expect(cutsceneById("crystal")?.image).toContain("cut-crystal");
    expect(cutsceneById("nope")).toBeUndefined();
  });
});
