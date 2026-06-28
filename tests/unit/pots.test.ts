import {
  POT_BREAK_TIME,
  POT_RELIC_VALUE,
  POT_SECRET_VALUE,
  potSystem,
} from "@sim/ecs/systems.ts";
import { Collectible, Facing, Player, Position, Pot, Score, Size } from "@sim/ecs/traits.ts";
import { DEFAULT_TUNING } from "@sim/player/tuning.ts";
import { createWorld, type World } from "koota";
import { afterEach, describe, expect, it } from "vitest";

const worlds: World[] = [];
function mk(): World {
  const w = createWorld();
  worlds.push(w);
  return w;
}
afterEach(() => {
  for (const w of worlds.splice(0)) w.destroy();
});

/** Player whipping to the right at (x,y); whip reaches +whipReach. */
function addWhippingPlayer(w: World, x = 0, y = 0) {
  return w.spawn(
    Player({ grounded: true, coyote: 0, buffer: 0, whip: 0.1, dead: false }),
    Position({ x, y }),
    Size({ w: 12, h: 16 }),
    Facing({ dir: 1 }),
  );
}

describe("potSystem", () => {
  it("smashes an intact pot the whip overlaps and drops a relic", () => {
    const w = mk();
    addWhippingPlayer(w, 0, 0);
    // Pot just to the right, within whip reach.
    w.spawn(Pot({ color: "red", drop: "relic", broken: false, breakTimer: 0 }), Position({ x: 16, y: 0 }), Size({ w: 16, h: 16 }));

    const r = potSystem(w, DEFAULT_TUNING, 1 / 60);
    expect(r.smashed).toBe(1);
    // A relic collectible was spawned at the pot.
    const relics = w.query(Collectible, Position);
    expect(relics.length).toBe(1);
    expect(relics[0]!.get(Collectible)!.value).toBe(POT_RELIC_VALUE);
  });

  it("a secret pot drops a higher-value relic", () => {
    const w = mk();
    addWhippingPlayer(w, 0, 0);
    w.spawn(Pot({ color: "yellow", drop: "secret", broken: false, breakTimer: 0 }), Position({ x: 16, y: 0 }), Size({ w: 16, h: 16 }));
    potSystem(w, DEFAULT_TUNING, 1 / 60);
    expect(w.query(Collectible)[0]!.get(Collectible)!.value).toBe(POT_SECRET_VALUE);
  });

  it("a health pot grants a life instead of a relic", () => {
    const w = mk();
    addWhippingPlayer(w, 0, 0);
    const score = w.spawn(Score({ points: 0, combo: 1, comboTimer: 0, lives: 3 }));
    w.spawn(Pot({ color: "white", drop: "health", broken: false, breakTimer: 0 }), Position({ x: 16, y: 0 }), Size({ w: 16, h: 16 }));

    const r = potSystem(w, DEFAULT_TUNING, 1 / 60);
    expect(r.healthDrops).toBe(1);
    expect(score.get(Score)!.lives).toBe(4);
    expect(w.query(Collectible).length).toBe(0);
  });

  it("does not smash a pot out of whip reach", () => {
    const w = mk();
    addWhippingPlayer(w, 0, 0);
    w.spawn(Pot({ color: "gray", drop: "relic", broken: false, breakTimer: 0 }), Position({ x: 400, y: 0 }), Size({ w: 16, h: 16 }));
    expect(potSystem(w, DEFAULT_TUNING, 1 / 60).smashed).toBe(0);
    expect(w.query(Collectible).length).toBe(0);
  });

  it("a broken pot counts down and is removed when the timer elapses", () => {
    const w = mk();
    const pot = w.spawn(Pot({ color: "red", drop: "relic", broken: true, breakTimer: POT_BREAK_TIME }), Position({ x: 16, y: 0 }), Size({ w: 16, h: 16 }));
    // One step short of elapsing: still alive.
    potSystem(w, DEFAULT_TUNING, POT_BREAK_TIME / 2);
    expect(pot.has(Pot)).toBe(true);
    // Past the timer: removed.
    potSystem(w, DEFAULT_TUNING, POT_BREAK_TIME);
    expect(w.query(Pot).length).toBe(0);
  });

  it("only drops once even if hit again before the animation finishes", () => {
    const w = mk();
    addWhippingPlayer(w, 0, 0);
    w.spawn(Pot({ color: "red", drop: "relic", broken: false, breakTimer: 0 }), Position({ x: 16, y: 0 }), Size({ w: 16, h: 16 }));
    potSystem(w, DEFAULT_TUNING, 1 / 60); // smashes
    potSystem(w, DEFAULT_TUNING, 1 / 60); // already broken — no second drop
    expect(w.query(Collectible).length).toBe(1);
  });
});
