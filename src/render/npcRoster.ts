/**
 * NPC roster — maps each story NPC (by dialogueId) to a distinct paper-doll spec
 * for the factory (src/render/npc.ts). The factory composites the chosen layer
 * sheets into one animated NPC sprite, so a handful of part choices gives each
 * villager a unique, transparent, animated look. Pure data + a lookup.
 *
 * Layer files are pack-root-relative paths into classes/npcs (skin lives in its
 * own "Character skin colors/" folder; the factory adds that prefix for `skin`).
 */
import type { NpcSpec } from "@render/npc.ts";

/** Each storyline NPC, dressed distinctly so the village reads as real people. */
export const NPC_ROSTER: Record<string, NpcSpec> = {
  // Elder Mara — robed village elder (female, muted corset + long hair).
  "elder-mara": {
    skin: "Female Skin2.png",
    legs: "Female Clothing/Green Socks.png",
    torso: "Female Clothing/Corset.png",
    hair: "Female Hair/Female Hair3.png",
  },
  // Watchman Pell — a guard (male, blue shirt + boots + short hair).
  "watchman-pell": {
    skin: "Male Skin3.png",
    legs: "Male Clothing/Blue Pants.png",
    feet: "Male Clothing/Boots.png",
    torso: "Male Clothing/Blue Shirt v2.png",
    hair: "Male Hair/Male Hair1.png",
  },
  // Ferryman Cole — weathered boatman (male, green shirt + orange pants).
  "ferryman-cole": {
    skin: "Male Skin4.png",
    legs: "Male Clothing/Orange Pants.png",
    feet: "Male Clothing/Boots.png",
    torso: "Male Clothing/Green Shirt v2.png",
    hair: "Male Hair/Male Hair2.png",
  },
  // The Warden — pale shrine-keeper (male, dark, gaunt).
  "shrine-warden": {
    skin: "Male Skin1.png",
    legs: "Male Clothing/Pants.png",
    torso: "Male Clothing/orange Shirt v2.png",
    hair: "Male Hair/Male Hair4.png",
  },
};

/** A plain villager — the fallback when a dialogueId has no roster entry. */
const DEFAULT_NPC: NpcSpec = {
  skin: "Male Skin3.png",
  legs: "Male Clothing/Pants.png",
  torso: "Male Clothing/Blue Shirt v2.png",
  hair: "Male Hair/Male Hair1.png",
};

/** Resolve an NPC's paper-doll spec by dialogueId (a sane default if unknown). */
export function npcSpecFor(dialogueId: string): NpcSpec {
  return NPC_ROSTER[dialogueId] ?? DEFAULT_NPC;
}
