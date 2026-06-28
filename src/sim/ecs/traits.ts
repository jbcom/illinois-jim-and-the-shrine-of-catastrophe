/**
 * ECS traits (components) for the deterministic sim, built on koota.
 *
 * Traits hold plain data so the world serializes cleanly for replays. Systems
 * (see ./systems.ts) run inside the fixed-timestep loop and read/write these.
 * Nothing here touches the DOM, Math.random, or wall-clock — the sim stays pure.
 */
import { trait } from "koota";

/** World-space top-left position (px). */
export const Position = trait({ x: 0, y: 0 });

/** Velocity (px/s). */
export const Velocity = trait({ x: 0, y: 0 });

/** Axis-aligned collision box size (px). */
export const Size = trait({ w: 12, h: 16 });

/** Horizontal facing: -1 left, 1 right. */
export const Facing = trait({ dir: 1 as -1 | 1 });

/** Marks the player entity + carries its control timers. */
export const Player = trait({
  grounded: false,
  coyote: 0,
  buffer: 0,
  whip: 0,
  dead: false,
});

/** Marks an enemy + its behaviour parameters. */
export const Enemy = trait({
  kind: "patrol" as "patrol" | "chase",
  speed: 40,
  /** Patrol bounds in world x; chase ignores these. */
  minX: 0,
  maxX: 0,
  alive: true,
});

/** A collectible (relic/gem) worth `value` points. */
export const Collectible = trait({ value: 100, taken: false });

/** Subject to gravity + tile collision in the physics system. */
export const Gravity = trait({ scale: 1 });

/** A hazard volume that kills the player on contact. */
export const Hazard = trait();

/** Lifetime in seconds; entity is removed when it reaches 0 (particles, fx). */
export const Lifetime = trait({ remaining: 0 });

/**
 * Run-level score state (one entity per run). `combo` multiplies points while
 * `comboTimer` is positive; each scoring event refreshes the timer and bumps the
 * combo, so chained pickups/kills are worth more. `lives` tracks the player.
 */
export const Score = trait({
  points: 0,
  combo: 1,
  comboTimer: 0,
  lives: 3,
});
