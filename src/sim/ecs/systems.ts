/**
 * ECS systems — pure functions run once per fixed sim step against the koota
 * world. They reuse the existing pure physics (moveAndCollide) and player feel
 * logic, now driven over entities instead of a single hand-held player object.
 *
 * No DOM / Math.random / wall-clock — determinism preserved.
 */

import {
  Collectible,
  Enemy,
  Facing,
  Gravity,
  Lifetime,
  Player,
  Position,
  Size,
  Velocity,
} from "@sim/ecs/traits.ts";
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

/** Mutable refs to a player's traits for one fixed step (keeps system complexity low). */
interface PlayerTraitRefs {
  p: { grounded: boolean; coyote: number; buffer: number; whip: number; dead: boolean };
  pos: { x: number; y: number };
  vel: { x: number; y: number };
  size: { w: number; h: number };
  facing: { dir: -1 | 1 };
}

function applyPlayerHorizontal(
  r: PlayerTraitRefs,
  intent: PlayerIntent,
  t: PlayerTuning,
  dt: number,
) {
  const target = intent.moveX * t.runSpeed;
  const moving = intent.moveX !== 0;
  const rate = r.p.grounded ? (moving ? t.accel : t.decel) : t.airAccel;
  r.vel.x = accelToward(r.vel.x, target, rate, dt);
  if (intent.moveX < 0) r.facing.dir = -1;
  else if (intent.moveX > 0) r.facing.dir = 1;
}

function applyPlayerTimersAndJump(
  r: PlayerTraitRefs,
  intent: PlayerIntent,
  t: PlayerTuning,
  dt: number,
) {
  r.p.coyote = Math.max(0, r.p.coyote - dt);
  r.p.buffer = Math.max(0, r.p.buffer - dt);
  r.p.whip = Math.max(0, r.p.whip - dt);
  if (intent.jumpPressed) r.p.buffer = t.jumpBuffer;
  if (intent.whipPressed && r.p.whip <= 0) r.p.whip = t.whipDuration;

  if (r.p.buffer > 0 && (r.p.grounded || r.p.coyote > 0)) {
    r.vel.y = -t.jumpSpeed;
    r.p.buffer = 0;
    r.p.coyote = 0;
    r.p.grounded = false;
  }

  r.vel.y += t.gravity * dt;
  if (r.vel.y < 0 && !intent.jumpHeld) r.vel.y += t.gravity * (t.jumpCutMultiplier - 1) * dt;
  r.vel.y = clamp(r.vel.y, -t.jumpSpeed * 2, t.maxFall);
}

function resolvePlayerMove(r: PlayerTraitRefs, map: TileMap, t: PlayerTuning, dt: number) {
  const res = moveAndCollide(
    map,
    aabb(r.pos.x, r.pos.y, r.size.w, r.size.h),
    r.vel.x * dt,
    r.vel.y * dt,
  );
  r.pos.x = res.x;
  r.pos.y = res.y;
  if (res.hitLeft || res.hitRight) r.vel.x = 0;
  if (res.hitTop && r.vel.y < 0) r.vel.y = 0;

  const wasGrounded = r.p.grounded;
  const probe = moveAndCollide(map, aabb(r.pos.x, r.pos.y, r.size.w, r.size.h), 0, 0.5);
  r.p.grounded = res.grounded || probe.grounded;
  if (r.p.grounded) {
    if (r.vel.y > 0) r.vel.y = 0;
  } else if (wasGrounded) {
    r.p.coyote = t.coyoteTime;
  }
  if (res.touchedHazard) r.p.dead = true;
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
      const r: PlayerTraitRefs = { p, pos, vel, size, facing };
      applyPlayerHorizontal(r, intent, t, dt);
      applyPlayerTimersAndJump(r, intent, t, dt);
      resolvePlayerMove(r, map, t, dt);
    });
}

/**
 * Collectible pickup system: a relic overlapping the player is taken; returns
 * the total score gained this step so the caller can update the HUD/score.
 */
export function collectibleSystem(world: World): number {
  // Single-player game: the first player entity is the pickup subject. No player
  // (level transition / menu) → nothing to collect.
  const player = world.query(Player, Position, Size)[0];
  if (!player) return 0;
  const pp = player.get(Position);
  const ps = player.get(Size);
  if (!pp || !ps) return 0;
  const playerBox = aabb(pp.x, pp.y, ps.w, ps.h);

  let gained = 0;
  world.query(Collectible, Position, Size).updateEach(([c, pos, size], entity) => {
    if (c.taken) return;
    if (intersects(playerBox, aabb(pos.x, pos.y, size.w, size.h))) {
      c.taken = true;
      gained += c.value;
      entity.destroy();
    }
  });
  return gained;
}

/**
 * Generic gravity + tile-collision integration for non-player dynamic bodies
 * (enemies, knocked-back items). The player has its own richer system; this
 * covers everything else with Gravity + Velocity + Size, applying knockback
 * carried in Velocity and resolving against the tilemap.
 */
export function physicsSystem(world: World, map: TileMap, t: PlayerTuning, dt: number): void {
  world.query(Gravity, Position, Velocity, Size).updateEach(([g, pos, vel, size], entity) => {
    // The player entity is handled by playerSystem — skip it here.
    if (entity.has(Player)) return;

    vel.y += t.gravity * g.scale * dt;
    if (vel.y > t.maxFall) vel.y = t.maxFall;

    const res = moveAndCollide(map, aabb(pos.x, pos.y, size.w, size.h), vel.x * dt, vel.y * dt);
    pos.x = res.x;
    pos.y = res.y;
    if (res.hitLeft || res.hitRight) vel.x = 0;
    if (res.grounded || res.hitTop) vel.y = 0;
  });
}

/**
 * Enemy steering: patrol bounces between minX/maxX; chase moves toward the
 * player on the x axis. Velocity is set here; physicsSystem integrates it.
 * (Yuka steering is layered on top of this in a later step.)
 */
function steerPatrol(
  e: { minX: number; maxX: number; speed: number },
  pos: { x: number },
  vel: { x: number },
  facing: { dir: -1 | 1 },
  width: number,
): void {
  if (pos.x <= e.minX) facing.dir = 1;
  else if (pos.x + width >= e.maxX) facing.dir = -1;
  vel.x = e.speed * facing.dir;
}

function steerChase(
  e: { speed: number },
  pos: { x: number },
  vel: { x: number },
  facing: { dir: -1 | 1 },
  playerX: number | null,
): void {
  if (playerX === null) {
    vel.x = 0; // no player to chase — hold position
    return;
  }
  const dir: -1 | 1 = playerX > pos.x ? 1 : -1;
  facing.dir = dir;
  vel.x = e.speed * dir;
}

export function enemySystem(world: World): void {
  // Chase targets the first player; null when there's no player (so chasers idle
  // instead of marching toward world origin x=0).
  const playerX = world.query(Player, Position)[0]?.get(Position)?.x ?? null;

  world.query(Enemy, Position, Velocity, Facing, Size).updateEach(([e, pos, vel, facing, size]) => {
    if (!e.alive) return;
    if (e.kind === "patrol") steerPatrol(e, pos, vel, facing, size.w);
    else steerChase(e, pos, vel, facing, playerX);
  });
}

/** Decrement lifetimes (particles/fx) and remove expired entities. */
export function lifetimeSystem(world: World, dt: number): void {
  world.query(Lifetime).updateEach(([life], entity) => {
    life.remaining -= dt;
    if (life.remaining <= 0) entity.destroy();
  });
}

export interface CombatResult {
  /** Enemies killed this step (for scoring/sfx/particles). */
  readonly kills: number;
  /** True if an enemy killed the player this step. */
  readonly playerHurt: boolean;
}

/** The player's whip hitbox while active, in the facing direction (or null). */
function whipBox(
  p: { whip: number; dead: boolean },
  pos: { x: number; y: number },
  size: { w: number; h: number },
  facing: { dir: -1 | 1 },
  t: PlayerTuning,
): ReturnType<typeof aabb> | null {
  if (p.whip <= 0) return null;
  const reach = t.whipReach;
  const x = facing.dir > 0 ? pos.x + size.w : pos.x - reach;
  return aabb(x, pos.y, reach, size.h);
}

/**
 * Combat: the player kills an enemy by stomping it (landing on its top while
 * falling) or whipping it (active whip overlaps it). A live enemy touching the
 * player otherwise hurts the player. Returns kills + whether the player was hurt
 * so the caller can update score, spawn particles, and play sfx.
 *
 * Stomp = falling while the player's feet are in the enemy's upper half. Using
 * the enemy's vertical midpoint (rather than a small fixed top margin) keeps the
 * stomp robust at high downward velocity, where a fast faller can sink several
 * pixels into the enemy in a single step before collision resolves.
 */

export function combatSystem(world: World, t: PlayerTuning): CombatResult {
  const player = world.query(Player, Position, Velocity, Size, Facing)[0];
  if (!player) return { kills: 0, playerHurt: false };
  const p = player.get(Player);
  const pos = player.get(Position);
  const vel = player.get(Velocity);
  const size = player.get(Size);
  const facing = player.get(Facing);
  if (!p || !pos || !vel || !size || !facing || p.dead) {
    return { kills: 0, playerHurt: false };
  }

  const playerBox = aabb(pos.x, pos.y, size.w, size.h);
  const whip = whipBox(p, pos, size, facing, t);
  const playerFeet = pos.y + size.h;

  let kills = 0;
  let playerHurt = false;
  let bounce = false;

  // koota get() yields snapshots, so writes go through entity.set(); collect the
  // effects here, then apply once after the query.
  world.query(Enemy, Position, Size).updateEach(([e, epos, esize], entity) => {
    if (!e.alive) return;
    const enemyBox = aabb(epos.x, epos.y, esize.w, esize.h);

    // Whip kill
    if (whip && intersects(whip, enemyBox)) {
      kills++;
      entity.destroy();
      return;
    }

    if (!intersects(playerBox, enemyBox)) return;

    // Stomp: falling with feet in the enemy's upper half (midpoint test is
    // robust to high-velocity sink-in that a fixed top margin would miss).
    if (vel.y > 0 && playerFeet <= epos.y + esize.h / 2) {
      kills++;
      entity.destroy();
      bounce = true;
    } else {
      playerHurt = true;
    }
  });

  if (bounce) player.set(Velocity, { x: vel.x, y: -t.jumpSpeed * 0.6 });
  if (playerHurt) player.set(Player, { ...p, dead: true });
  return { kills, playerHurt };
}
