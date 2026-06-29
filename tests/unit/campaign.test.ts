import {
  CAMPAIGN,
  CLIFFHANGER,
  CLIFFHANGER_ID,
  campaignLevelOrder,
  chapterForIntro,
  chapterForLevel,
  firstLevelId,
  nextCampaignLevelId,
} from "@sim/story/campaign.ts";
import { describe, expect, it } from "vitest";

/**
 * The CAMPAIGN array is the single source of truth for level order + cutscene chain.
 * These lock its shape so the registry/cutscenes/gameMachine can derive from it, and
 * so appending a chapter (levels 6-10) keeps the cliffhanger at the real end.
 */
describe("campaign (single source of truth)", () => {
  it("is the five live GenAI levels in story order", () => {
    expect(campaignLevelOrder()).toEqual([
      "halward-s-reach",
      "the-whispering-jungle",
      "the-rushing-gorge",
      "the-abandoned-mine",
      "the-crystal-cavern",
    ]);
  });

  it("opens on Halward's Reach", () => {
    expect(firstLevelId()).toBe("halward-s-reach");
  });

  it("chains each level to the next, ending (undefined) at the last chapter", () => {
    expect(nextCampaignLevelId("halward-s-reach")).toBe("the-whispering-jungle");
    expect(nextCampaignLevelId("the-abandoned-mine")).toBe("the-crystal-cavern");
    expect(nextCampaignLevelId("the-crystal-cavern")).toBeUndefined();
  });

  it("gives every chapter an intro cutscene with narration + a scene image", () => {
    for (const ch of CAMPAIGN) {
      expect(ch.introCutscene).toBeTruthy();
      expect(ch.lines.length).toBeGreaterThan(0);
      expect(ch.image).toMatch(/^assets\/cutscenes\//);
    }
  });

  it("has a cliffhanger ending distinct from any chapter intro", () => {
    expect(CLIFFHANGER.id).toBe(CLIFFHANGER_ID);
    expect(CLIFFHANGER.lines.length).toBeGreaterThan(0);
    expect(CAMPAIGN.some((c) => c.introCutscene === CLIFFHANGER_ID)).toBe(false);
  });

  it("resolves chapters by level id and by intro cutscene id", () => {
    expect(chapterForLevel("the-rushing-gorge")?.introCutscene).toBe("gorge");
    expect(chapterForIntro("mine")?.levelId).toBe("the-abandoned-mine");
    expect(chapterForLevel("not-a-level")).toBeUndefined();
    expect(chapterForIntro("cliffhanger")).toBeUndefined();
  });
});
