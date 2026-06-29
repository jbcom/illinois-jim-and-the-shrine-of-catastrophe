/**
 * Cutscene script — the full-screen 16-bit story beats that bridge the levels.
 * Each cutscene pairs a painted scene image with narration lines; the player shows
 * the image and advances through the lines. Pure data (no DOM).
 *
 * DERIVED from the CAMPAIGN (src/sim/story/campaign.ts), the single source of truth:
 * one intro cutscene per chapter (leading INTO that chapter's level) plus the
 * CLIFFHANGER ending after the final chapter. Adding a level to CAMPAIGN automatically
 * adds its intro cutscene here and pushes the cliffhanger to the new end — no edits.
 *
 * Flow: intro → Halward → jungle → Whispering Jungle → gorge → Rushing Gorge →
 * mine → Abandoned Mine → crystal → Crystal Cavern → cliffhanger (ending).
 */
import { CAMPAIGN, CLIFFHANGER } from "@sim/story/campaign.ts";
import { assetUrl } from "@/assetUrl.ts";

export interface Cutscene {
  readonly id: string;
  /**
   * Resolved URL of the scene image base (no extension); the player picks the
   * aspect variant (-16x9 / -9x16 / -1x1) for the viewport.
   */
  readonly image: string;
  /** Narration lines shown in sequence over the scene. */
  readonly lines: readonly string[];
  /** The level to play AFTER this cutscene (undefined = ending, no level). */
  readonly nextLevel?: string;
}

/** The bridge cutscenes (one per chapter, leading into its level) + the cliffhanger. */
export const CUTSCENES: readonly Cutscene[] = [
  ...CAMPAIGN.map(
    (ch): Cutscene => ({
      id: ch.introCutscene,
      image: assetUrl(ch.image),
      lines: ch.lines,
      nextLevel: ch.levelId,
    }),
  ),
  {
    id: CLIFFHANGER.id,
    image: assetUrl(CLIFFHANGER.image),
    lines: CLIFFHANGER.lines,
    // No nextLevel — the cliffhanger is the ending of the shipped arc.
  },
];

/** Look up a cutscene by id. */
export function cutsceneById(id: string): Cutscene | undefined {
  return CUTSCENES.find((c) => c.id === id);
}
