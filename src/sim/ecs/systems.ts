/**
 * ECS systems — pure functions run once per fixed sim step against the koota
 * world. They reuse the existing pure physics (moveAndCollide) and player feel
 * logic, now driven over entities instead of a single hand-held player object.
 *
 * No DOM / Math.random / wall-clock — determinism preserved.
 */

import { Collectible, Facing, Player, Position, Size, Velocity } from "@sim/ecs/traits.ts";
import type { PlayerIntent } from "@sim/input/intent.ts";
import { clamp } from "@sim/math/vec2.ts";
import { aabb, intersects } from "@sim/physics/aabb.ts";
import { moveAndCollide } from "@sim/physics/collide.ts";
import type { PlayerTuning } from "@sim/player/tuning.ts";
import type { TileMap } from "@sim/world/tilemap.ts";
import type { World } from "koota";

/** Horizontal acceleration toward the intended run speed (player only). */
function accelToward(vx: number, target: number, rate: number, dt: number): number {
  if (vx < target) return Math.min(vx + rate * dt, target);
  if (vx > target) return Math.max(vx - rate * dt, target);
  return vx;
}

/**
 * Player movement + physics system. Mirrors the standalone stepPlayer feel
 * (accel curves, coyote, jump buffer, variable height) but reads/writes ECS
 * traits. One player entity is expected.
 */
export function playerSystem(
  world: World,
  intent: PlayerIntent,
  map: TileMap,
  t: PlayerTuning,
  dt: number,
): void {
  world
    .query(Player, Position, Velocity, Size, Facing)
    .updateEach(([p, pos, vel, size, facing]) => {
      if (p.dead) return;

      // Horizontal
      const target = intent.moveX * t.runSpeed;
      const moving = intent.moveX !== 0;
      const rate = p.grounded ? (moving ? t.accel : t.decel) : t.airAccel;
      vel.x = accelToward(vel.x, target, rate, dt);
      if (intent.moveX < 0) facing.dir = -1;
      else if (intent.moveX > 0) facing.dir = 1;

      // Timers
      p.coyote = Math.max(0, p.coyote - dt);
      p.buffer = Math.max(0, p.buffer - dt);
      p.whip = Math.max(0, p.whip - dt);
      if (intent.jumpPressed) p.buffer = t.jumpBuffer;
      if (intent.whipPressed && p.whip <= 0) p.whip = t.whipDuration;

      // Jump (buffered + coyote)
      if (p.buffer > 0 && (p.grounded || p.coyote > 0)) {
        vel.y = -t.jumpSpeed;
        p.buffer = 0;
        p.coyote = 0;
        p.grounded = false;
      }

      // Gravity + variable height
      vel.y += t.gravity * dt;
      if (vel.y < 0 && !intent.jumpHeld) vel.y += t.gravity * (t.jumpCutMultiplier - 1) * dt;
      vel.y = clamp(vel.y, -t.jumpSpeed * 2, t.maxFall);

      // Integrate + resolve
      const res = moveAndCollide(map, aabb(pos.x, pos.y, size.w, size.h), vel.x * dt, vel.y * dt);
      pos.x = res.x;
      pos.y = res.y;
      if (res.hitLeft || res.hitRight) vel.x = 0;
      if (res.hitTop && vel.y < 0) vel.y = 0;

      const wasGrounded = p.grounded;
      const probe = moveAndCollide(map, aabb(pos.x, pos.y, size.w, size.h), 0, 0.5);
      p.grounded = res.grounded || probe.grounded;
      if (p.grounded) {
        if (vel.y > 0) vel.y = 0;
      } else if (wasGrounded) {
        p.coyote = t.coyoteTime;
      }

      if (res.touchedHazard) p.dead = true;
    });
}

/**
 * Collectible pickup system: a relic overlapping the player is taken; returns
 * the total score gained this step so the caller can update the HUD/score.
 */
export function collectibleSystem(world: World): number {
  let gained = 0;
  let playerBox: ReturnType<typeof aabb> | null = null;
  world.query(Player, Position, Size).updateEach(([, pos, size]) => {
    playerBox = aabb(pos.x, pos.y, size.w, size.h);
  });
  if (!playerBox) return 0;

  world.query(Collectible, Position, Size).updateEach(([c, pos, size], entity) => {
    if (c.taken) return;
    if (intersects(playerBox as ReturnType<typeof aabb>, aabb(pos.x, pos.y, size.w, size.h))) {
      c.taken = true;
      gained += c.value;
      entity.destroy();
    }
  });
  return gained;
}
