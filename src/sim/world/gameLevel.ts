/**
 * Game level — the sim-side contract for a level: its INVISIBLE COLLISION (a tilemap
 * the physics reads), spawns, puzzle layer, and goal. The matching render-side
 * painting is paired by id in the level registry. Pure data; the renderer paints,
 * the sim collides.
 *
 * The live levels are GenAI-authored and adapted via buildFromLevel → genaiBundle
 * (registry.ts); this module owns the shared SHAPE (the interfaces below), not any
 * particular level's data.
 */
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
  /** Authored patrol half-width in px (ignored for chase). Omitted → engine default. */
  readonly range?: number;
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
  /** Moving platforms that oscillate and carry the player. */
  readonly movingPlatforms?: readonly {
    x: number;
    y: number;
    axis: "horizontal" | "vertical";
    distance: number;
    speed: number;
    width: number;
  }[];
  /** World-x past which the level is "won" (reaching the relic block). */
  readonly goalX: number;
}
