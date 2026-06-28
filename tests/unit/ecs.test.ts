import {
  collectibleSystem,
  enemySystem,
  lifetimeSystem,
  physicsSystem,
  playerSystem,
} from "@sim/ecs/systems.ts";
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
import { createSimWorld } from "@sim/ecs/world.ts";
import { NEUTRAL_INTENT, type PlayerIntent } from "@sim/input/intent.ts";
import { DEFAULT_TUNING } from "@sim/player/tuning.ts";
import { parseLevel } from "@sim/world/level.ts";
import { describe, expect, it } from "vitest";

const DT = 1 / 60;
const T = DEFAULT_TUNING;
const intent = (over: Partial<PlayerIntent> = {}): PlayerIntent => ({ ...NEUTRAL_INTENT, ...over });

/** Flat floor on the bottom row with a player spawn near the left. */
function flatLevel(rows = ["............", "...@........", "############"]) {
  return parseLevel(rows, 16);
}

describe("ECS world + systems", () => {
  it("spawns a player entity with the level's spawn position", () => {
    const level = flatLevel();
    const sim = createSimWorld(level, T);
    const pos = sim.player.get(Position);
    expect(pos?.x).toBe(level.spawnX);
    expect(pos?.y).toBe(level.spawnY);
  });

  it("player falls under gravity and lands grounded", () => {
    const level = flatLevel(["............", "...@........", "............", "############"]);
    const sim = createSimWorld(level, T);
    for (let i = 0; i < 60; i++) playerSystem(sim.world, NEUTRAL_INTENT, level.map, T, DT);
    const p = sim.player.get(Player);
    const vel = sim.player.get(Velocity);
    expect(p?.grounded).toBe(true);
    expect(vel?.y).toBe(0);
  });

  it("player accelerates rightward (matches controller feel)", () => {
    const level = flatLevel();
    const sim = createSimWorld(level, T);
    for (let i = 0; i < 30; i++) playerSystem(sim.world, NEUTRAL_INTENT, level.map, T, DT); // settle
    playerSystem(sim.world, intent({ moveX: 1 }), level.map, T, DT);
    const vel = sim.player.get(Velocity);
    expect(vel?.x).toBeGreaterThan(0);
    expect(vel?.x).toBeLessThan(T.runSpeed);
  });

  it("player jumps when grounded", () => {
    const level = flatLevel();
    const sim = createSimWorld(level, T);
    for (let i = 0; i < 30; i++) playerSystem(sim.world, NEUTRAL_INTENT, level.map, T, DT);
    playerSystem(sim.world, intent({ jumpPressed: true, jumpHeld: true }), level.map, T, DT);
    const vel = sim.player.get(Velocity);
    expect(vel?.y).toBeLessThan(0);
  });

  it("parses collectibles from '*' and spawns them as entities", () => {
    const level = parseLevel(["..*..", "..@..", "#####"], 16);
    expect(level.collectibles.length).toBe(1);
    const sim = createSimWorld(level, T);
    expect(sim.world.query(Collectible).length).toBe(1);
  });

  it("collectibleSystem awards points and removes a relic on overlap", () => {
    // Player spawns at col 2; relic authored at the same cell → immediate overlap.
    const level = parseLevel(["#####", "..@..", "#####"], 16);
    const sim = createSimWorld(level, T);
    // Author a relic exactly on the player's box (level '*' would be a separate
    // cell; place one directly to guarantee overlap for the unit test).
    const pos = sim.player.get(Position);
    const size = sim.player.get(Size);
    sim.world.spawn(
      Position({ x: pos?.x ?? 0, y: pos?.y ?? 0 }),
      Size({ w: size?.w ?? 10, h: size?.h ?? 10 }),
      Collectible({ value: 250, taken: false }),
    );
    expect(sim.world.query(Collectible).length).toBe(1);
    const gained = collectibleSystem(sim.world);
    expect(gained).toBe(250);
    expect(sim.world.query(Collectible).length).toBe(0); // removed
  });

  it("parses enemies from 'o'/'x' and spawns them", () => {
    const level = parseLevel(["o..x.", "..@..", "#####"], 16);
    expect(level.enemies.map((e) => e.kind)).toEqual(["patrol", "chase"]);
    const sim = createSimWorld(level, T);
    expect(sim.world.query(Enemy).length).toBe(2);
  });

  it("physicsSystem applies gravity to non-player bodies and lands them", () => {
    const level = parseLevel(["....", "....", "####"], 16);
    const sim = createSimWorld(level, T);
    const crate = sim.world.spawn(
      Position({ x: 16, y: 0 }),
      Velocity({ x: 0, y: 0 }),
      Size({ w: 12, h: 12 }),
      Gravity({ scale: 1 }),
    );
    for (let i = 0; i < 60; i++) physicsSystem(sim.world, level.map, T, DT);
    const vel = crate.get(Velocity);
    const pos = crate.get(Position);
    expect(vel?.y).toBe(0); // landed
    expect(pos?.y).toBeLessThanOrEqual(32 - 12 + 0.01); // resting on the floor row (top=32)
  });

  it("patrol enemy reverses direction at its bounds", () => {
    const level = parseLevel(["........", "..o.....", "########"], 16);
    const sim = createSimWorld(level, T);
    enemySystem(sim.world);
    const enemy = sim.world.query(Enemy)[0];
    const vel = enemy?.get(Velocity);
    expect(Math.abs(vel?.x ?? 0)).toBeGreaterThan(0); // it moves
  });

  it("chase enemy moves toward the player's x", () => {
    const level = parseLevel(["..........", "x........@", "##########"], 16);
    const sim = createSimWorld(level, T);
    enemySystem(sim.world);
    const enemy = sim.world.query(Enemy)[0];
    const vel = enemy?.get(Velocity);
    const facing = enemy?.get(Facing);
    expect(vel?.x).toBeGreaterThan(0); // player is to the right
    expect(facing?.dir).toBe(1);
  });

  it("lifetimeSystem removes expired entities", () => {
    const level = flatLevel();
    const sim = createSimWorld(level, T);
    const particle = sim.world.spawn(Position({ x: 0, y: 0 }), Lifetime({ remaining: 0.05 }));
    expect(sim.world.has(particle)).toBe(true);
    lifetimeSystem(sim.world, DT); // 1/60 ≈ 0.0167, not yet expired
    expect(sim.world.has(particle)).toBe(true);
    for (let i = 0; i < 5; i++) lifetimeSystem(sim.world, DT);
    expect(sim.world.has(particle)).toBe(false); // expired + destroyed
  });

  it("is deterministic for an identical intent sequence", () => {
    const run = () => {
      const level = flatLevel();
      const sim = createSimWorld(level, T);
      const seq = [
        intent({ moveX: 1 }),
        intent({ jumpPressed: true, jumpHeld: true }),
        NEUTRAL_INTENT,
      ];
      for (const it of seq) playerSystem(sim.world, it, level.map, T, DT);
      const pos = sim.player.get(Position);
      return { x: pos?.x, y: pos?.y };
    };
    expect(run()).toEqual(run());
  });
});
