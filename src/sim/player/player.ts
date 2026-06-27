/**
 * Player controller — pure, deterministic platformer movement.
 *
 * Consumes a PlayerIntent + the tilemap and advances the player one fixed step.
 * Implements the feel that separates a good platformer from a stiff one:
 * acceleration curves, variable jump height, coyote time, and jump buffering.
 *
 * No DOM, no Math.random, no wall-clock — fully replayable from a seed + intents.
 */
import type { PlayerIntent } from "@sim/input/intent.ts";
import { clamp } from "@sim/math/vec2.ts";
import { aabb } from "@sim/physics/aabb.ts";
import { moveAndCollide } from "@sim/physics/collide.ts";
import type { PlayerTuning } from "@sim/player/tuning.ts";
import type { TileMap } from "@sim/world/tilemap.ts";

export type Facing = -1 | 1;

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  facing: Facing;
  /** Seconds of coyote grace remaining (set when leaving ground). */
  coyote: number;
  /** Seconds a buffered jump press is still valid. */
  buffer: number;
  /** Seconds of whip still active (0 = idle). */
  whip: number;
  /** Set true the step a hazard kills the player. */
  dead: boolean;
}

export function createPlayer(x: number, y: number): PlayerState {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    grounded: false,
    facing: 1,
    coyote: 0,
    buffer: 0,
    whip: 0,
    dead: false,
  };
}

/** 1px down-probe so a body resting on the floor reads as grounded. */
function probeGrounded(map: TileMap, t: PlayerTuning, x: number, y: number): boolean {
  const r = moveAndCollide(map, aabb(x, y, t.width, t.height), 0, 0.5);
  return r.grounded;
}

export function stepPlayer(
  state: PlayerState,
  intent: PlayerIntent,
  map: TileMap,
  t: PlayerTuning,
  dt: number,
): PlayerState {
  if (state.dead) return state;

  const s: PlayerState = { ...state };

  // --- Horizontal acceleration toward target run speed ---
  const target = intent.moveX * t.runSpeed;
  const onGround = s.grounded;
  let rate: number;
  if (intent.moveX !== 0) {
    rate = onGround ? t.accel : t.airAccel;
  } else {
    rate = onGround ? t.decel : t.airAccel;
  }
  if (s.vx < target) s.vx = Math.min(s.vx + rate * dt, target);
  else if (s.vx > target) s.vx = Math.max(s.vx - rate * dt, target);

  if (intent.moveX < 0) s.facing = -1;
  else if (intent.moveX > 0) s.facing = 1;

  // --- Timers ---
  s.coyote = Math.max(0, s.coyote - dt);
  s.buffer = Math.max(0, s.buffer - dt);
  s.whip = Math.max(0, s.whip - dt);
  if (intent.jumpPressed) s.buffer = t.jumpBuffer;
  if (intent.whipPressed && s.whip <= 0) s.whip = t.whipDuration;

  // --- Jump (buffered press + coyote grace) ---
  const canJump = s.grounded || s.coyote > 0;
  if (s.buffer > 0 && canJump) {
    s.vy = -t.jumpSpeed;
    s.buffer = 0;
    s.coyote = 0;
    s.grounded = false;
  }

  // --- Gravity + variable jump height ---
  s.vy += t.gravity * dt;
  if (s.vy < 0 && !intent.jumpHeld) {
    // Released early while rising → extra gravity for a shorter hop.
    s.vy += t.gravity * (t.jumpCutMultiplier - 1) * dt;
  }
  s.vy = clamp(s.vy, -t.jumpSpeed * 2, t.maxFall);

  // --- Integrate + resolve ---
  const body = aabb(s.x, s.y, t.width, t.height);
  const res = moveAndCollide(map, body, s.vx * dt, s.vy * dt);
  s.x = res.x;
  s.y = res.y;

  if (res.hitLeft || res.hitRight) s.vx = 0;
  if (res.hitTop && s.vy < 0) s.vy = 0;

  const wasGrounded = s.grounded;
  s.grounded = res.grounded || probeGrounded(map, t, s.x, s.y);
  if (s.grounded) {
    if (s.vy > 0) s.vy = 0;
  } else if (wasGrounded) {
    // Just walked off a ledge — start the coyote window.
    s.coyote = t.coyoteTime;
  }

  if (res.touchedHazard) s.dead = true;

  return s;
}
