/**
 * Game level — pairs a level's PAINTING (render-side composition) reference with
 * its INVISIBLE COLLISION (a tilemap the physics reads) and its spawns. The
 * painting and the collision are authored separately but designed to match: the
 * collision's solid ground sits under the painted ground, platforms under the
 * painted beams. Pure data; the renderer paints, the sim collides.
 *
 * This is the sim-side half of a "level as a painting": the renderer imports the
 * matching Placement[] painting by the same id.
 */
import { buildLevel } from "@sim/world/levelSpec.ts";
import { CAVE_DESCENT_SPEC } from "@sim/world/specs/caveDescent.ts";
import { ESCAPE_RUN_SPEC } from "@sim/world/specs/escapeRun.ts";
import { SHRINE_APPROACH_SPEC } from "@sim/world/specs/shrineApproach.ts";
import { SHRINE_HEART_SPEC } from "@sim/world/specs/shrineHeart.ts";
import { VILLAGE_APPROACH_SPEC } from "@sim/world/specs/villageApproach.ts";
import type { TileMap } from "@sim/world/tilemap.ts";

export interface GameLevelSpawn {
  readonly x: number;
  readonly y: number;
}
export interface PotSpawn extends GameLevelSpawn {
  readonly color: "gray" | "red" | "white" | "yellow";
  readonly drop: "relic" | "health" | "secret";
}

/** An enemy placed by design: AI `kind` + which real animated `visual` sprite. */
export interface EnemySpawn extends GameLevelSpawn {
  readonly kind: "patrol" | "chase";
  readonly visual: "goblin" | "skeleton" | "mushroom" | "flyingEye";
}

/** A story NPC placed by design; `dialogueId` keys src/sim/story/dialogue.ts. */
export interface NpcSpawn extends GameLevelSpawn {
  readonly dialogueId: string;
}

export interface GameLevel {
  readonly id: string;
  readonly map: TileMap;
  readonly spawnX: number;
  readonly spawnY: number;
  readonly collectibles: readonly (GameLevelSpawn & { value: number })[];
  readonly enemies: readonly EnemySpawn[];
  readonly pots: readonly PotSpawn[];
  /** Story NPCs the player can talk to (empty on levels with none). */
  readonly npcs: readonly NpcSpawn[];
  /** Puzzle switches (lever/plate) the player activates; a Gate references their id. */
  readonly switches?: readonly { x: number; y: number; id: string }[];
  /** Gates that block a world rect until their switch(es) fire. */
  readonly gates?: readonly {
    x: number;
    y: number;
    opensWith: readonly string[];
    x0: number;
    x1: number;
    top: number;
    bottom: number;
  }[];
  /** World-x past which the level is "won" (reaching the relic block). */
  readonly goalX: number;
}

/**
 * "The Descent" — the cave level. DERIVED from CAVE_DESCENT_SPEC, so collision +
 * spawns + goal match the painting built from the same spec.
 */
export const DESCENT: GameLevel = buildLevel(CAVE_DESCENT_SPEC);

/**
 * "The Shrine" — the 3rd-act sanctum approach. DERIVED from SHRINE_APPROACH_SPEC,
 * so collision + spawns + goal match the painting built from the same spec.
 */
export const SHRINE: GameLevel = buildLevel(SHRINE_APPROACH_SPEC);

/**
 * "The Heart of the Shrine" — the 4th level, the climax: Jim reaches the idol and
 * TAKES it (→ the `catastrophe` cutscene). DERIVED from a single LevelSpec
 * (render/levels/shrineHeart.ts), so its collision + spawns + goal all match the
 * painting built from the same spec — no parallel hand-authored geometry.
 */
export const SHRINE_HEART: GameLevel = buildLevel(SHRINE_HEART_SPEC);

/**
 * "The Escape" — the 5th and final level: the collapsing-shrine sprint to the
 * cave mouth (→ the `escape` ending). DERIVED from ESCAPE_RUN_SPEC, so collision +
 * spawns + goal match the painting built from the same spec.
 */
export const ESCAPE_RUN: GameLevel = buildLevel(ESCAPE_RUN_SPEC);

/**
 * "Halward's Reach" — the OPENING overworld level. DERIVED from
 * VILLAGE_APPROACH_SPEC: a continuous road with ROOFTOP overlay platforms (anchored
 * to the house + tent) Jim can jump onto, NPCs + patrol enemies on the road, the
 * lone torch at the trailhead as the goal. Collision + spawns + goal + painting all
 * flow from the one spec.
 */
export const VILLAGE: GameLevel = buildLevel(VILLAGE_APPROACH_SPEC);
