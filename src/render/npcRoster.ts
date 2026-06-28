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

/**
 * Each storyline NPC, dressed HEAD-TO-TOE through the full paper-doll stack
 * (skin → underwear → legs → socks → feet → torso → hair → hand) so every
 * villager reads as a distinct, fully-clothed person — not a half-dressed
 * placeholder. The factory paints in NPC_SLOTS order regardless of key order.
 */
export const NPC_ROSTER: Record<string, NpcSpec> = {
  // Elder Mara — the village elder. Fair-skinned, purple corset over a base
  // layer, long socks + boots, long grey-styled hair. Fully robed, dignified.
  "elder-mara": {
    skin: "Female Skin2.png",
    underwear: "Female Clothing/Purple Panties and Bra.png",
    socks: "Female Clothing/Purple Socks.png",
    feet: "Female Clothing/Boots.png",
    torso: "Female Clothing/Purple Corset v2.png",
    hair: "Female Hair/Female Hair3.png",
  },
  // Watchman Pell — the village GUARD. Weathered, full uniform, boots, and he
  // HOLDS A SWORD (hand slot) — the watch on duty.
  "watchman-pell": {
    skin: "Male Skin3.png",
    underwear: "Male Clothing/Underwear.png",
    legs: "Male Clothing/Blue Pants.png",
    feet: "Male Clothing/Boots.png",
    torso: "Male Clothing/Blue Shirt v2.png",
    hair: "Male Hair/Male Hair1.png",
    hand: "Male Hand/Male Sword.png",
  },
  // Ferryman Cole — weathered boatman. Tanned, green shirt + orange work pants,
  // worn shoes, short hair. A working man, fully kitted.
  "ferryman-cole": {
    skin: "Male Skin4.png",
    underwear: "Male Clothing/Orange Underwear.png",
    legs: "Male Clothing/Orange Pants.png",
    feet: "Male Clothing/Shoes.png",
    torso: "Male Clothing/Green Shirt v2.png",
    hair: "Male Hair/Male Hair2.png",
  },
  // The Warden — the gaunt shrine-keeper. Pale, dark purple shirt + plain pants,
  // boots, long hair. Severe and complete.
  "shrine-warden": {
    skin: "Male Skin1.png",
    underwear: "Male Clothing/Purple Underwear.png",
    legs: "Male Clothing/Pants.png",
    feet: "Male Clothing/Boots.png",
    torso: "Male Clothing/Purple Shirt v2.png",
    hair: "Male Hair/Male Hair4.png",
  },
};

/** A plain villager — the fallback, still fully dressed (skin→torso→hair+feet). */
const DEFAULT_NPC: NpcSpec = {
  skin: "Male Skin3.png",
  underwear: "Male Clothing/Underwear.png",
  legs: "Male Clothing/Pants.png",
  feet: "Male Clothing/Shoes.png",
  torso: "Male Clothing/Shirt.png",
  hair: "Male Hair/Male Hair5.png",
};

/** Resolve an NPC's paper-doll spec by dialogueId (a sane default if unknown). */
export function npcSpecFor(dialogueId: string): NpcSpec {
  return NPC_ROSTER[dialogueId] ?? DEFAULT_NPC;
}
