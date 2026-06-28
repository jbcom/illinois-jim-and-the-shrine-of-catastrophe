/**
 * ECS systems — pure functions run once per fixed sim step against the koota
 * world. They reuse the existing pure physics (moveAndCollide) and player feel
 * logic, now driven over entities instead of a single hand-held player object.
 *
 * No DOM / Math.random / wall-clock — determinism preserved.
 */

import type { Rng } from "@engine/rng.ts";
import { applySteering, arrive } from "@sim/ai/steering.ts";
import {
  Collectible,
  Enemy,
  Facing,
  Gravity,
  Lifetime,
  MineCart,
  Npc,
  Particle,
  Player,
  Position,
  Pot,
  Score,
  Size,
  Velocity,
} from "@sim/ecs/traits.ts";
import type { PlayerIntent } from "@sim/input/intent.ts";
import { approach, clamp } from "@sim/math/vec2.ts";
import { aabb, intersects } from "@sim/physics/aabb.ts";
import { moveAndCollide } from "@sim/physics/collide.ts";
import type { PlayerTuning } from "@sim/player/tuning.ts";
import { TileKind, type TileMap, tileAtWorld } from "@sim/world/tilemap.ts";
import type { Entity, World } from "koota";

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

  // Kill-plane: falling into a pit kills the player. The tilemap is a CLOSED
  // world — tileAt() returns Solid out of bounds — so a body that falls past the
  // last row snaps flush to the map's bottom edge and reads as "grounded" on a
  // phantom floor, sitting there forever instead of dying. Detect that: feet at
  // (or below) the map's bottom edge while the in-bounds cell beneath them is
  // NOT solid means Jim is only held up by the closed-world floor → he fell. Die.
  const feet = r.pos.y + r.size.h;
  if (feet >= map.height * map.tileSize - 1) r.p.dead = true;
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
    .query(Player, Position, Velocity, Size, Facing, MineCart)
    .updateEach(([p, pos, vel, size, facing, cart]) => {
      if (p.dead) return;
      const r: PlayerTraitRefs = { p, pos, vel, size, facing };
      // While riding a mine-cart, the cart owns horizontal velocity — don't let
      // the run-accel decelerate it. Jump/gravity still apply.
      if (!cart.riding) applyPlayerHorizontal(r, intent, t, dt);
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

  // Collect first (mutating the query), then award through the combo system so
  // chained pickups stack the multiplier.
  const values: number[] = [];
  world.query(Collectible, Position, Size).updateEach(([c, pos, size], entity) => {
    if (c.taken) return;
    if (intersects(playerBox, aabb(pos.x, pos.y, size.w, size.h))) {
      c.taken = true;
      values.push(c.value);
      entity.destroy();
    }
  });
  let gained = 0;
  for (const v of values) gained += award(world, v);
  return gained;
}

/** The NPC nearest to the player and within its talk range, if any. */
export interface TalkTarget {
  readonly entity: Entity;
  readonly dialogueId: string;
}

/**
 * Find the nearest story NPC within talk range of the player. Pure read — the
 * HUD uses the result to show a "talk" prompt and, on interact, open the
 * dialogue. Returns null when no NPC is in range (or there's no player).
 */
export function npcInteractionSystem(world: World): TalkTarget | null {
  const player = world.query(Player, Position, Size)[0];
  if (!player) return null;
  const pp = player.get(Position);
  const ps = player.get(Size);
  if (!pp || !ps) return null;
  const cx = pp.x + ps.w / 2;
  const cy = pp.y + ps.h / 2;

  let best: TalkTarget | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  world.query(Npc, Position, Size).readEach(([npc, pos, size], entity) => {
    const nx = pos.x + size.w / 2;
    const ny = pos.y + size.h / 2;
    const dist = Math.hypot(nx - cx, ny - cy);
    if (dist <= npc.range && dist < bestDist) {
      bestDist = dist;
      best = { entity, dialogueId: npc.dialogueId };
    }
  });
  return best;
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
 * Enemy steering: patrol bounces between minX/maxX; chase uses arrive-style
 * steering (Yuka model, src/sim/ai/steering.ts) toward the player on the x axis.
 * Velocity is set here; physicsSystem integrates it against the tilemap.
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

/**
 * Chase uses arrive-style steering on the x-axis (Yuka model): accelerate toward
 * the player and decelerate when close, so the chaser settles rather than
 * jittering on top of the target. Enemies are ground-bound (y is gravity), so we
 * steer in 1D and project the 2D force onto x.
 */
function steerChase(
  e: { speed: number; accel: number },
  pos: { x: number; y: number },
  vel: { x: number; y: number },
  facing: { dir: -1 | 1 },
  player: { x: number; y: number } | null,
  dt: number,
): void {
  if (player === null) {
    // Decelerate to a stop when there's no target.
    vel.x = approach(vel.x, 0, e.accel * dt);
    return;
  }
  const force = arrive(
    { x: pos.x, y: 0 },
    { x: vel.x, y: 0 },
    { x: player.x, y: 0 },
    e.speed,
    e.accel,
  );
  const steered = applySteering({ x: vel.x, y: 0 }, force, dt, e.speed);
  vel.x = steered.x;
  if (Math.abs(vel.x) > 1) facing.dir = vel.x > 0 ? 1 : -1;
}

export function enemySystem(world: World, dt: number): void {
  // Chase targets the first player; null when there's no player (so chasers idle
  // instead of marching toward world origin x=0).
  const playerPos = world.query(Player, Position)[0]?.get(Position) ?? null;
  const player = playerPos ? { x: playerPos.x, y: playerPos.y } : null;

  world.query(Enemy, Position, Velocity, Facing, Size).updateEach(([e, pos, vel, facing, size]) => {
    if (!e.alive) return;
    if (e.kind === "patrol") steerPatrol(e, pos, vel, facing, size.w);
    else steerChase({ speed: e.speed, accel: 600 }, pos, vel, facing, player, dt);
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

/** Seconds the smash animation plays before the pot entity is removed. */
export const POT_BREAK_TIME = 0.4;
/** Points a relic dropped from a pot is worth; a "secret" relic is worth more. */
export const POT_RELIC_VALUE = 50;
export const POT_SECRET_VALUE = 250;

export interface PotResult {
  /** Pots smashed this step. */
  readonly smashed: number;
  /** Lives gained from "health" drops this step. */
  readonly healthDrops: number;
}

/**
 * Breakable pots. An active whip overlapping an intact pot smashes it: the pot
 * latches `broken`, starts its break-animation timer, and spawns its drop —
 * a relic (Collectible worth POT_RELIC_VALUE), a secret (a higher-value relic),
 * or health (a +1 life applied to Score here). Broken pots count down and are
 * removed when the animation finishes. Pure: returns counts for sfx/particles.
 */
export function potSystem(world: World, t: PlayerTuning, dt: number): PotResult {
  let smashed = 0;
  let healthDrops = 0;

  const player = world.query(Player, Position, Size, Facing)[0];
  const whip = player ? playerWhipBox(player, t) : null;

  // Pass 1 (read-only): decide which pots smash + age broken ones. Collect
  // mutations so spawning drops mid-iteration can't perturb the query.
  const drops: Array<{ x: number; y: number; drop: "relic" | "health" | "secret" }> = [];
  const toBreak: Entity[] = [];
  const toExpire: Entity[] = [];
  world.query(Pot, Position, Size).updateEach(([pot, pos, size], entity) => {
    if (pot.broken) {
      const remaining = pot.breakTimer - dt;
      if (remaining <= 0) toExpire.push(entity);
      else entity.set(Pot, { ...pot, breakTimer: remaining });
      return;
    }
    if (!whip || !intersects(whip, aabb(pos.x, pos.y, size.w, size.h))) return;
    toBreak.push(entity);
    smashed++;
    drops.push({ x: pos.x + size.w / 2, y: pos.y + size.h / 2, drop: pot.drop });
  });

  for (const e of toExpire) e.destroy();
  for (const e of toBreak) {
    const pot = e.get(Pot);
    if (pot) e.set(Pot, { ...pot, broken: true, breakTimer: POT_BREAK_TIME });
  }

  for (const d of drops) {
    if (d.drop === "health") {
      healthDrops += addLife(world);
    } else {
      const value = d.drop === "secret" ? POT_SECRET_VALUE : POT_RELIC_VALUE;
      world.spawn(Position({ x: d.x - 5, y: d.y - 5 }), Size({ w: 10, h: 10 }), Collectible({ value, taken: false }));
    }
  }
  return { smashed, healthDrops };
}

/** Grant the player one life via the Score entity. Returns 1 if applied. */
function addLife(world: World): number {
  const e = world.query(Score)[0];
  if (!e) return 0;
  const s = e.get(Score);
  if (!s) return 0;
  e.set(Score, { ...s, lives: s.lives + 1 });
  return 1;
}

/** The whip hitbox for a player entity (snapshot-safe wrapper around whipBox). */
function playerWhipBox(player: Entity, t: PlayerTuning): ReturnType<typeof aabb> | null {
  const p = player.get(Player);
  const pos = player.get(Position);
  const size = player.get(Size);
  const facing = player.get(Facing);
  if (!p || !pos || !size || !facing) return null;
  return whipBox(p, pos, size, facing, t);
}

/** How long (seconds) a combo stays alive after the last scoring event. */
export const COMBO_WINDOW = 2.5;
/** Combo multiplier ceiling. */
export const MAX_COMBO = 8;

/**
 * Award `basePoints` to the run score, scaled by the current combo multiplier,
 * and refresh/raise the combo. Returns the points actually added (base × combo).
 * Chained pickups/kills within COMBO_WINDOW stack the multiplier.
 */
export function award(world: World, basePoints: number): number {
  const e = world.query(Score)[0];
  if (!e) return 0;
  const s = e.get(Score);
  if (!s) return 0;
  const added = basePoints * s.combo;
  e.set(Score, {
    ...s,
    points: s.points + added,
    combo: Math.min(MAX_COMBO, s.combo + 1),
    comboTimer: COMBO_WINDOW,
  });
  return added;
}

/** Decay the combo timer; reset the multiplier to 1 when it lapses. */
export function scoreSystem(world: World, dt: number): void {
  world.query(Score).updateEach(([s]) => {
    if (s.comboTimer > 0) {
      s.comboTimer -= dt;
      if (s.comboTimer <= 0) {
        s.comboTimer = 0;
        s.combo = 1;
      }
    }
  });
}

/** Is there a Rail tile under this body's feet? */
function onRail(
  map: TileMap,
  pos: { x: number; y: number },
  size: { w: number; h: number },
): boolean {
  const feetY = pos.y + size.h + 1;
  const left = tileAtWorld(map, pos.x + 2, feetY);
  const right = tileAtWorld(map, pos.x + size.w - 2, feetY);
  return left === TileKind.Rail || right === TileKind.Rail;
}

/**
 * Mine-cart system (the iconic hook): when the player (with a MineCart trait) is
 * grounded on a Rail tile, they ride at cart speed in the rail direction,
 * accelerating the run. Pressing jump dismounts. The cart carries the player's
 * horizontal velocity; playerSystem still resolves collisions, so rail gaps and
 * walls behave naturally. Returns whether the player is currently riding.
 */
export function mineCartSystem(world: World, intent: PlayerIntent, map: TileMap): boolean {
  const e = world.query(Player, MineCart, Position, Velocity, Size, Facing)[0];
  if (!e) return false;
  const p = e.get(Player);
  const cart = e.get(MineCart);
  const pos = e.get(Position);
  const vel = e.get(Velocity);
  const size = e.get(Size);
  const facing = e.get(Facing);
  if (!p || !cart || !pos || !vel || !size || !facing) return false;

  const railed = p.grounded && onRail(map, pos, size);

  if (railed && !intent.jumpPressed) {
    const dir = facing.dir; // ride the way the player faces
    e.set(MineCart, { ...cart, riding: true, dir });
    e.set(Velocity, { x: cart.speed * dir, y: vel.y });
    return true;
  }

  if (cart.riding) e.set(MineCart, { ...cart, riding: false });
  return false;
}

export interface BurstOptions {
  readonly count: number;
  readonly color: number;
  readonly speed: number;
  readonly size?: number;
  readonly gravity?: number;
  readonly lifetime?: number;
}

/**
 * Spawn a cosmetic particle burst at (x,y). Uses the FX rng stream so it never
 * advances the sim stream — cosmetic variety can't desync a gameplay replay.
 * Each particle gets a random direction + speed jitter, a Lifetime, and motion
 * the particleSystem integrates.
 */
export function spawnBurst(world: World, fx: Rng, x: number, y: number, o: BurstOptions): void {
  const size = o.size ?? 2;
  const gravity = o.gravity ?? 0;
  const lifetime = o.lifetime ?? 0.5;
  for (let i = 0; i < o.count; i++) {
    const angle = fx.range(0, Math.PI * 2);
    const speed = o.speed * fx.range(0.4, 1);
    world.spawn(
      Position({ x, y }),
      Velocity({ x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }),
      Particle({ size, color: o.color, gravity }),
      Lifetime({ remaining: lifetime * fx.range(0.7, 1) }),
    );
  }
}

/** Integrate particle motion (velocity + optional gravity). Lifetime is handled
 * by lifetimeSystem, which removes expired particles. */
export function particleSystem(world: World, dt: number, gravityAccel: number): void {
  world.query(Particle, Position, Velocity).updateEach(([part, pos, vel]) => {
    if (part.gravity !== 0) vel.y += gravityAccel * part.gravity * dt;
    pos.x += vel.x * dt;
    pos.y += vel.y * dt;
  });
}
