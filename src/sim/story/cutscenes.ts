/**
 * Cutscene script — the full-screen 16-bit story beats that split the levels.
 * Each cutscene pairs a painted scene image with narration lines; the cutscene
 * player shows the image and advances through the lines. Pure data (no DOM).
 *
 * Flow: intro → [level] → descent → [level] → ruins → [level] → shrine →
 * catastrophe → escape (ending). Level ids reference the painted levels.
 */

export interface Cutscene {
  readonly id: string;
  /** Base path of the scene image (no extension); the player picks the\n   * aspect variant (-16x9 / -9x16 / -1x1) for the viewport. */
  readonly image: string;
  /** Narration lines shown in sequence over the scene. */
  readonly lines: readonly string[];
  /** The level to play AFTER this cutscene (undefined = ending, no level). */
  readonly nextLevel?: string;
}

import { assetUrl } from "@/assetUrl.ts";

const IMG = assetUrl("assets/cutscenes");

export const CUTSCENES: readonly Cutscene[] = [
  {
    id: "intro",
    image: `${IMG}/cut-01-village`,
    lines: [
      "The village of Halward's Reach has feared the mountain for a hundred years.",
      "Elder Mara says the last seal has cracked. The Shrine of Catastrophe is waking.",
      "Illinois Jim came for the idol's gold. He is starting to wish he hadn't.",
    ],
    nextLevel: "village-approach",
  },
  {
    id: "descent",
    image: `${IMG}/cut-02-descent`,
    lines: [
      "The cave mouth swallows the last of the daylight.",
      "Down Jim goes, rope by rope, into the dark the village will not speak of.",
    ],
    nextLevel: "cave-descent",
  },
  {
    id: "ruins",
    image: `${IMG}/cut-03-ruins`,
    lines: [
      "Older than the village. Older than the kingdom.",
      "Red gems pulse in the walls like a heartbeat. The pots still hold their secrets.",
    ],
    nextLevel: "shrine-approach",
  },
  {
    id: "shrine",
    image: `${IMG}/cut-04-shrine`,
    lines: [
      "The Shrine. The idol burns gold atop the cracked steps.",
      '"Turn back," the Warden warned. "The idol is not treasure. It is a door."',
      "Jim has never once turned back.",
    ],
    nextLevel: "shrine-heart",
  },
  {
    id: "catastrophe",
    image: `${IMG}/cut-05-catastrophe`,
    lines: [
      "The instant his fingers close on the idol, the shrine answers.",
      "Red light. Splitting stone. The catastrophe the name promised.",
      "RUN.",
    ],
    nextLevel: "escape-run",
  },
  {
    id: "escape",
    image: `${IMG}/cut-06-escape`,
    lines: [
      "Dawn. Air. The mountain folding in on itself behind him.",
      "Illinois Jim and the Shrine of Catastrophe — and Jim, somehow, still breathing.",
      "THE END",
    ],
  },
];

/** Look up a cutscene by id. */
export function cutsceneById(id: string): Cutscene | undefined {
  return CUTSCENES.find((c) => c.id === id);
}
