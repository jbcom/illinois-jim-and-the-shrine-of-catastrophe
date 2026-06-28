/**
 * Sim world construction + spawning, built on koota.
 *
 * Builds a fresh ECS world from a parsed level: spawns the player, hazards, and
 * collectibles as entities. The tilemap stays a plain grid (queried by the
 * physics system) — only dynamic actors are entities. Pure: no DOM, no rng/clock
 * reads here; systems receive those as arguments.
 */

import {
  Collectible,
  Enemy,
  Facing,
  Gravity,
  MineCart,
  Npc,
  Player,
  Position,
  Pot,
  Score,
  Size,
  Velocity,
} from "@sim/ecs/traits.ts";
import { DEFAULT_TUNING, type PlayerTuning } from "@sim/player/tuning.ts";
import type { NpcSpawn, PotSpawn } from "@sim/world/gameLevel.ts";
import type { Level } from "@sim/world/level.ts";
import { createWorld, type Entity, type World } from "koota";

export interface SimWorld {
  readonly world: World;
  readonly player: Entity;
  /** Run-level score/combo/lives state entity. */
  readonly score: Entity;
  readonly level: Level;
  readonly tuning: PlayerTuning;
}

export function createSimWorld(level: Level, tuning: PlayerTuning = DEFAULT_TUNING): SimWorld {
  const world = createWorld();

  const score = world.spawn(Score({ points: 0, combo: 1, comboTimer: 0, lives: 3 }));

  const player = world.spawn(
    Position({ x: level.spawnX, y: level.spawnY }),
    Velocity({ x: 0, y: 0 }),
    Size({ w: tuning.width, h: tuning.height }),
    Facing({ dir: 1 }),
    Gravity({ scale: 1 }),
    MineCart({ speed: 180, dir: 1, riding: false }),
    // Spawn with a brief invulnerability window so the player isn't instantly
    // re-hit by an enemy sitting on the spawn point after a death + respawn.
    Player({ grounded: false, coyote: 0, buffer: 0, whip: 0, dead: false, invuln: 1.5 }),
  );

  // Collectibles authored on the level (relics) — placed where the level marks
  // them; for now seed a few above the spawn so there's something to grab.
  for (const c of level.collectibles) {
    world.spawn(
      Position({ x: c.x, y: c.y }),
      Size({ w: 10, h: 10 }),
      Collectible({ value: c.value, taken: false }),
    );
  }

  // Breakable pots, when the level authors them (GameLevel).
  for (const p of (level as { pots?: readonly PotSpawn[] }).pots ?? []) {
    world.spawn(
      Position({ x: p.x, y: p.y }),
      Size({ w: 16, h: 16 }),
      Pot({ color: p.color, drop: p.drop, broken: false, breakTimer: 0 }),
    );
  }

  const ts = level.map.tileSize;
  for (const e of level.enemies) {
    // Patrol enemies pace the tile-row they spawn in; chase ignores bounds.
    world.spawn(
      Position({ x: e.x, y: e.y }),
      Velocity({ x: 0, y: 0 }),
      Size({ w: 14, h: 14 }),
      Facing({ dir: 1 }),
      Gravity({ scale: 1 }),
      Enemy({
        kind: e.kind,
        // Levels that author a `visual` (GameLevel) pick the real sprite; older
        // ASCII levels fall back to a sensible default by behaviour.
        visual: (e as { visual?: "goblin" | "skeleton" | "mushroom" | "flyingEye" }).visual ??
          (e.kind === "chase" ? "skeleton" : "goblin"),
        speed: e.kind === "chase" ? 55 : 40,
        minX: e.x - ts * 3,
        maxX: e.x + ts * 4,
        alive: true,
      }),
    );
  }

  // Story NPCs the level authors (GameLevel) — villagers Jim can talk to.
  for (const n of (level as { npcs?: readonly NpcSpawn[] }).npcs ?? []) {
    world.spawn(
      Position({ x: n.x, y: n.y }),
      Size({ w: 18, h: 24 }),
      Facing({ dir: 1 }),
      Npc({ dialogueId: n.dialogueId, range: 36, talked: false }),
    );
  }

  return { world, player, score, level, tuning };
}
