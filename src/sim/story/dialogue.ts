/**
 * Dialogue script registry (pure data, no DOM).
 *
 * The story is told largely through the people Jim meets on his way to the Shrine
 * of Catastrophe. Each NPC's `Npc.dialogueId` keys into this registry; the HUD
 * renders the lines. Dialogue is a list of `Line`s (speaker + text); a `DialogueScript`
 * can branch on story progress later, but the base shape is a linear beat.
 */

export interface Line {
  /** Who speaks ("" = narrator). */
  readonly speaker: string;
  readonly text: string;
}

export interface DialogueScript {
  readonly id: string;
  /** Display name shown in the talk prompt. */
  readonly name: string;
  readonly lines: readonly Line[];
}

/**
 * Story dialogue — the overworld→cave→shrine arc opening. Townsfolk warn Jim,
 * point the way, and seed the legend of the Shrine of Catastrophe.
 */
export const DIALOGUE: Record<string, DialogueScript> = {
  "elder-mara": {
    id: "elder-mara",
    name: "Elder Mara",
    lines: [
      { speaker: "Elder Mara", text: "Illinois Jim. You came after all." },
      { speaker: "Elder Mara", text: "The Shrine of Catastrophe woke when the last seal cracked." },
      { speaker: "Elder Mara", text: "Follow the old road past the statues, down into the caves. Mind the dark." },
      { speaker: "Jim", text: "Same shrine that swallowed the last expedition. Wonderful." },
    ],
  },
  "ferryman-cole": {
    id: "ferryman-cole",
    name: "Cole",
    lines: [
      { speaker: "Cole", text: "Boat's the only way across the gorge. I'll take you — for a relic." },
      { speaker: "Cole", text: "Smash the old pots in the ruins. The relics inside still glow." },
      { speaker: "Jim", text: "Grave-robbing as a toll. Charming village you've got." },
    ],
  },
  "watchman-pell": {
    id: "watchman-pell",
    name: "Watchman Pell",
    lines: [
      { speaker: "Watchman Pell", text: "Things crawl up from the cave mouth at night. Goblins. Worse." },
      { speaker: "Watchman Pell", text: "Your whip won't be enough at the bottom. Take what the pots give you." },
    ],
  },
  "shrine-warden": {
    id: "shrine-warden",
    name: "The Warden",
    lines: [
      { speaker: "The Warden", text: "Turn back, treasure-hunter. The idol is not treasure." },
      { speaker: "The Warden", text: "It is a door. And you are about to knock." },
    ],
  },
};

/** Look up a dialogue script by id (undefined if unknown). */
export function dialogueById(id: string): DialogueScript | undefined {
  return DIALOGUE[id];
}
