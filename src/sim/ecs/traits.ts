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
  /**
   * Post-hit invulnerability timer (seconds). While > 0 the player can't be hurt
   * again — a brief mercy window after taking damage / respawning so a single
   * enemy contact can't chain-kill across lives (the classic blink-invuln).
   */
  invuln: 0,
});

/**
 * Marks an enemy + its behaviour parameters. `kind` drives AI (patrol/chase);
 * `visual` selects which real animated enemy sprite the renderer draws, chosen
 * per-level by design (goblin/skeleton/mushroom/flyingEye) independently of AI.
 */
export const Enemy = trait({
  kind: "patrol" as "patrol" | "chase",
  visual: "goblin" as "goblin" | "skeleton" | "mushroom" | "flyingEye",
  speed: 40,
  /** Patrol bounds in world x; chase ignores these. */
  minX: 0,
  maxX: 0,
  alive: true,
});

/**
 * A story NPC the player can talk to. `dialogueId` keys into the dialogue script
 * registry (src/sim/story/dialogue.ts); `range` is the interaction radius (px)
 * within which a talk prompt appears. `talked` latches once Jim has spoken to
 * them (so one-shot story beats don't repeat). Pure data — the HUD renders the
 * lines, the render layer draws the composited NPC sprite.
 */
export const Npc = trait({
  dialogueId: "",
  range: 28,
  talked: false,
});

/** A collectible (relic/gem) worth `value` points. */
export const Collectible = trait({ value: 100, taken: false });

/**
 * A breakable pot (classic 16-bit pot-smashing). When the whip/attack hits it,
 * it smashes and spawns its `drop`: a relic (points), health (a life), or a
 * secret (a hidden relic worth more). `color` selects the sprite sheet; `broken`
 * latches once smashed (so the break animation plays once and it can't re-drop).
 */
export const Pot = trait({
  color: "gray" as "gray" | "red" | "white" | "yellow",
  drop: "relic" as "relic" | "health" | "secret",
  broken: false,
  /** Break-animation timer (seconds remaining) once smashed; entity removed at 0. */
  breakTimer: 0,
});

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

/**
 * Mine-cart rider state. When the player boards a cart (on a Rail tile) the cart
 * carries them along the rail at `speed` until the rail ends or they jump off.
 * `dir` is the travel direction along the rail (-1 left, 1 right).
 */
export const MineCart = trait({
  speed: 180,
  dir: 1 as -1 | 1,
  riding: false,
});

/**
 * Cosmetic particle (dust, impact spark, collectible sparkle). Driven by the FX
 * PRNG stream so its randomness never advances the replay-critical sim stream.
 * `color` is a packed 0xRRGGBB int (the renderer fills with it). Particles carry
 * Position + Velocity + Lifetime; this trait adds size + colour + fade.
 */
export const Particle = trait({
  size: 2,
  color: 0xffffff,
  /** Gravity scale for the particle (0 = floaty sparkle, 1 = falling dust). */
  gravity: 0,
});
