import { createRngPair } from "@engine/rng.ts";
import {
  award,
  COMBO_WINDOW,
  collectibleSystem,
  combatSystem,
  enemySystem,
  lifetimeSystem,
  MAX_COMBO,
  mineCartSystem,
  particleSystem,
  physicsSystem,
  playerSystem,
  scoreSystem,
  spawnBurst,
} from "@sim/ecs/systems.ts";
import {
  Collectible,
  Enemy,
  Facing,
  Gravity,
  Lifetime,
  MineCart,
  Particle,
  Player,
  Position,
  Score,
  Size,
  Velocity,
} from "@sim/ecs/traits.ts";
import { createSimWorld as createSimWorldRaw } from "@sim/ecs/world.ts";
import { NEUTRAL_INTENT, type PlayerIntent } from "@sim/input/intent.ts";
import { DEFAULT_TUNING } from "@sim/player/tuning.ts";
import { parseLevel } from "@sim/world/level.ts";
import { afterEach, describe, expect, it } from "vitest";

const DT = 1 / 60;
const T = DEFAULT_TUNING;
const intent = (over: Partial<PlayerIntent> = {}): PlayerIntent => ({ ...NEUTRAL_INTENT, ...over });

// koota caps live worlds at 16; track + destroy each test's worlds so the suite
// doesn't exhaust the pool.
const liveWorlds: ReturnType<typeof createSimWorldRaw>[] = [];
function createSimWorld(...args: Parameters<typeof createSimWorldRaw>) {
  const sim = createSimWorldRaw(...args);
  liveWorlds.push(sim);
  return sim;
}
afterEach(() => {
  for (const sim of liveWorlds.splice(0)) sim.world.destroy();
});

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

  it("kills the player when they fall past the level's bottom (kill-plane)", () => {
    // A pit: spawn over empty space with NO floor anywhere, so the player falls
    // straight through. Without a kill-plane they'd fall forever (or sit at the
    // lowest solid tile); the kill-plane marks them dead once past the bottom.
    const level = flatLevel(["...@........", "............", "............"]);
    const sim = createSimWorld(level, T);
    let dead = false;
    for (let i = 0; i < 240 && !dead; i++) {
      playerSystem(sim.world, NEUTRAL_INTENT, level.map, T, DT);
      dead = sim.player.get(Player)?.dead ?? false;
    }
    expect(dead).toBe(true);
  });

  it("does NOT kill the player standing on solid ground", () => {
    const level = flatLevel(["............", "...@........", "############"]);
    const sim = createSimWorld(level, T);
    for (let i = 0; i < 240; i++) playerSystem(sim.world, NEUTRAL_INTENT, level.map, T, DT);
    expect(sim.player.get(Player)?.dead).toBe(false);
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

  it("honors an authored patrol range (wide patrol reads as designed, not ±3-4 tiles)", () => {
    const level = parseLevel(["o....", "..@..", "#####"], 16);
    const e0 = level.enemies[0];
    // A GameLevel-authored enemy carries `range` (patrol half-width in px); inject it.
    const authored = { ...e0, range: 200 } as typeof e0 & { range: number };
    const sim = createSimWorld({ ...level, enemies: [authored] }, T);
    const enemy = sim.world.query(Enemy)[0]?.get(Enemy);
    expect(enemy).toBeDefined();
    // Bounds are spawnX ± range (200), far wider than the ±3-4 tile (48-64px) default.
    expect(enemy?.maxX - enemy?.minX).toBe(400);
    expect(enemy?.maxX - e0.x).toBe(200);
  });

  it("falls back to the ±3-4 tile default when no range is authored", () => {
    const level = parseLevel(["o....", "..@..", "#####"], 16);
    const sim = createSimWorld(level, T);
    const enemy = sim.world.query(Enemy)[0]?.get(Enemy);
    // Default span = 3 tiles left + 4 tiles right = 7 × 16px.
    expect(enemy?.maxX - enemy?.minX).toBe(7 * 16);
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
    enemySystem(sim.world, DT);
    const enemy = sim.world.query(Enemy)[0];
    const vel = enemy?.get(Velocity);
    expect(Math.abs(vel?.x ?? 0)).toBeGreaterThan(0); // it moves
  });

  it("chase enemy moves toward the player's x", () => {
    const level = parseLevel(["..........", "x........@", "##########"], 16);
    const sim = createSimWorld(level, T);
    enemySystem(sim.world, DT);
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

  it("combat: stomping an enemy from above kills it and bounces the player", () => {
    const level = parseLevel(["......", "..@...", "######"], 16);
    const sim = createSimWorld(level, T);
    const pp = sim.player.get(Position);
    // Enemy overlapping the player's feet (2px up) so the boxes intersect and
    // the stomp margin applies; player falling.
    sim.world.spawn(
      Position({ x: pp?.x ?? 0, y: (pp?.y ?? 0) + (sim.player.get(Size)?.h ?? 16) - 2 }),
      Velocity({ x: 0, y: 0 }),
      Size({ w: 14, h: 14 }),
      Facing({ dir: 1 }),
      Enemy({ kind: "patrol", speed: 40, minX: 0, maxX: 80, alive: true }),
    );
    sim.player.set(Velocity, { x: 0, y: 100 }); // falling (set: get returns a snapshot)
    const before = sim.world.query(Enemy).length;
    const res = combatSystem(sim.world, T);
    expect(before).toBe(1);
    expect(res.kills).toBe(1);
    expect(sim.world.query(Enemy).length).toBe(0);
    expect(sim.player.get(Player)?.dead).toBe(false); // survived (stomp)
    expect(sim.player.get(Velocity)?.y).toBeLessThan(0); // bounced up
  });

  it("combat: an active whip kills an enemy in front of the player", () => {
    const level = parseLevel(["......", "..@...", "######"], 16);
    const sim = createSimWorld(level, T);
    const pp = sim.player.get(Position);
    const ps = sim.player.get(Size);
    // Enemy directly to the player's right, within whip reach.
    sim.world.spawn(
      Position({ x: (pp?.x ?? 0) + (ps?.w ?? 12) + 4, y: pp?.y ?? 0 }),
      Velocity({ x: 0, y: 0 }),
      Size({ w: 12, h: 14 }),
      Facing({ dir: 1 }),
      Enemy({ kind: "patrol", speed: 40, minX: 0, maxX: 80, alive: true }),
    );
    const p0 = sim.player.get(Player);
    if (p0) sim.player.set(Player, { ...p0, whip: T.whipDuration }); // whip active, facing right
    const res = combatSystem(sim.world, T);
    expect(res.kills).toBe(1);
    expect(res.playerHurt).toBe(false);
  });

  it("combat: a side collision with no stomp/whip hurts (kills) the player", () => {
    const level = parseLevel(["......", "..@...", "######"], 16);
    const sim = createSimWorld(level, T);
    // Clear the spawn mercy window so this tests the raw hurt mechanic.
    const p0 = sim.player.get(Player);
    if (p0) sim.player.set(Player, { ...p0, invuln: 0 });
    const pp = sim.player.get(Position);
    const ps = sim.player.get(Size);
    // Enemy overlapping the player's side; player not falling, no whip.
    sim.world.spawn(
      Position({ x: (pp?.x ?? 0) + (ps?.w ?? 12) - 2, y: pp?.y ?? 0 }),
      Velocity({ x: 0, y: 0 }),
      Size({ w: 14, h: 14 }),
      Facing({ dir: 1 }),
      Enemy({ kind: "patrol", speed: 40, minX: 0, maxX: 80, alive: true }),
    );
    // Player velocity defaults to 0 (not falling) → side hit, not a stomp.
    const res = combatSystem(sim.world, T);
    expect(res.playerHurt).toBe(true);
    expect(sim.player.get(Player)?.dead).toBe(true);
  });

  it("combat: invulnerability frames block a hit (no chain-kill after respawn)", () => {
    const level = parseLevel(["......", "..@...", "######"], 16);
    const sim = createSimWorld(level, T);
    // Fresh spawn carries a mercy window (invuln > 0).
    expect(sim.player.get(Player)?.invuln).toBeGreaterThan(0);
    const pp = sim.player.get(Position);
    const ps = sim.player.get(Size);
    sim.world.spawn(
      Position({ x: (pp?.x ?? 0) + (ps?.w ?? 12) - 2, y: pp?.y ?? 0 }),
      Velocity({ x: 0, y: 0 }),
      Size({ w: 14, h: 14 }),
      Facing({ dir: 1 }),
      Enemy({ kind: "patrol", speed: 40, minX: 0, maxX: 80, alive: true }),
    );
    // While invulnerable, an overlapping enemy must NOT hurt the player.
    const res = combatSystem(sim.world, T);
    expect(res.playerHurt).toBe(false);
    expect(sim.player.get(Player)?.dead).toBe(false);
  });

  it("combat: no-op when there are no enemies", () => {
    const level = flatLevel();
    const sim = createSimWorld(level, T);
    const res = combatSystem(sim.world, T);
    expect(res).toEqual({ kills: 0, playerHurt: false });
  });

  it("award scales points by the combo and raises it", () => {
    const level = flatLevel();
    const sim = createSimWorld(level, T);
    expect(award(sim.world, 100)).toBe(100); // combo starts at 1
    expect(award(sim.world, 100)).toBe(200); // combo now 2
    const s = sim.score.get(Score);
    expect(s?.points).toBe(300);
    expect(s?.combo).toBe(3);
    expect(s?.comboTimer).toBeCloseTo(COMBO_WINDOW);
  });

  it("combo multiplier is capped at MAX_COMBO", () => {
    const level = flatLevel();
    const sim = createSimWorld(level, T);
    for (let i = 0; i < 20; i++) award(sim.world, 10);
    expect(sim.score.get(Score)?.combo).toBe(MAX_COMBO);
  });

  it("scoreSystem decays the combo timer and resets the multiplier on lapse", () => {
    const level = flatLevel();
    const sim = createSimWorld(level, T);
    award(sim.world, 100); // combo 2, timer = COMBO_WINDOW
    // Advance past the window.
    const steps = Math.ceil(COMBO_WINDOW / DT) + 2;
    for (let i = 0; i < steps; i++) scoreSystem(sim.world, DT);
    const s = sim.score.get(Score);
    expect(s?.combo).toBe(1);
    expect(s?.comboTimer).toBe(0);
  });

  it("collectibleSystem awards through the combo system", () => {
    const level = parseLevel(["#####", "..@..", "#####"], 16);
    const sim = createSimWorld(level, T);
    const pp = sim.player.get(Position);
    const ps = sim.player.get(Size);
    sim.world.spawn(
      Position({ x: pp?.x ?? 0, y: pp?.y ?? 0 }),
      Size({ w: ps?.w ?? 10, h: ps?.h ?? 10 }),
      Collectible({ value: 100, taken: false }),
    );
    const gained = collectibleSystem(sim.world);
    expect(gained).toBe(100);
    expect(sim.score.get(Score)?.points).toBe(100);
    expect(sim.score.get(Score)?.combo).toBe(2); // bumped after the pickup
  });

  it("mine-cart: player rides along a rail at cart speed when grounded on it", () => {
    // Rail tiles ('~') along the floor row; player spawns on them.
    const level = parseLevel(["........", "...@....", "~~~~~~~~"], 16);
    const sim = createSimWorld(level, T);
    // Settle the player onto the rail floor.
    for (let i = 0; i < 30; i++) playerSystem(sim.world, NEUTRAL_INTENT, level.map, T, DT);
    // Face right and ride.
    const f = sim.player.get(Facing);
    if (f) sim.player.set(Facing, { dir: 1 });
    const riding = mineCartSystem(sim.world, NEUTRAL_INTENT, level.map);
    expect(riding).toBe(true);
    const vel = sim.player.get(Velocity);
    expect(vel?.x).toBeCloseTo(sim.player.get(MineCart)?.speed ?? 0);
  });

  it("mine-cart: jumping dismounts the cart", () => {
    const level = parseLevel(["........", "...@....", "~~~~~~~~"], 16);
    const sim = createSimWorld(level, T);
    for (let i = 0; i < 30; i++) playerSystem(sim.world, NEUTRAL_INTENT, level.map, T, DT);
    const riding = mineCartSystem(sim.world, intent({ jumpPressed: true }), level.map);
    expect(riding).toBe(false);
    expect(sim.player.get(MineCart)?.riding).toBe(false);
  });

  it("mine-cart: no ride when not on a rail", () => {
    const level = flatLevel(); // solid floor, no rails
    const sim = createSimWorld(level, T);
    for (let i = 0; i < 30; i++) playerSystem(sim.world, NEUTRAL_INTENT, level.map, T, DT);
    expect(mineCartSystem(sim.world, NEUTRAL_INTENT, level.map)).toBe(false);
  });

  it("spawnBurst creates particles using the FX rng (deterministic per seed)", () => {
    const level = flatLevel();
    const sim = createSimWorld(level, T);
    const fx = createRngPair("seed-A").fx;
    spawnBurst(sim.world, fx, 50, 50, { count: 8, color: 0xff0000, speed: 80 });
    expect(sim.world.query(Particle).length).toBe(8);
  });

  it("particleSystem moves particles and lifetimeSystem removes them", () => {
    const level = flatLevel();
    const sim = createSimWorld(level, T);
    const fx = createRngPair("seed-B").fx;
    spawnBurst(sim.world, fx, 50, 50, { count: 4, color: 0xff0000, speed: 80, lifetime: 0.05 });
    const before = sim.world.query(Particle)[0]?.get(Position);
    particleSystem(sim.world, DT, T.gravity);
    const after = sim.world.query(Particle)[0]?.get(Position);
    // At least one coordinate changed (particles have non-zero velocity).
    expect(after?.x !== before?.x || after?.y !== before?.y).toBe(true);
    // Expire them.
    for (let i = 0; i < 6; i++) lifetimeSystem(sim.world, DT);
    expect(sim.world.query(Particle).length).toBe(0);
  });

  it("FX particle stream does not desync the sim stream", () => {
    // Two identical sim runs; one also spawns FX bursts. Player path must match.
    const playerX = (withFx: boolean) => {
      const level = flatLevel();
      const sim = createSimWorld(level, T);
      const fx = createRngPair("run").fx;
      for (let i = 0; i < 30; i++) {
        playerSystem(sim.world, intent({ moveX: 1 }), level.map, T, DT);
        if (withFx) spawnBurst(sim.world, fx, 0, 0, { count: 3, color: 1, speed: 50 });
      }
      return sim.player.get(Position)?.x;
    };
    expect(playerX(true)).toBe(playerX(false));
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
