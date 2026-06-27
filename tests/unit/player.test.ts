import { NEUTRAL_INTENT, type PlayerIntent } from "@sim/input/intent.ts";
import { createPlayer, stepPlayer } from "@sim/player/player.ts";
import { DEFAULT_TUNING } from "@sim/player/tuning.ts";
import { createTileMap, setTile, TileKind } from "@sim/world/tilemap.ts";
import { describe, expect, it } from "vitest";

const DT = 1 / 60;
const T = DEFAULT_TUNING;

/** Wide flat floor at the bottom of a 40-wide, 20-tall, 16px-tile map. */
function flatMap() {
  const map = createTileMap(40, 20, 16);
  for (let c = 0; c < 40; c++) setTile(map, c, 19, TileKind.Solid);
  return map;
}

const intent = (over: Partial<PlayerIntent> = {}): PlayerIntent => ({
  ...NEUTRAL_INTENT,
  ...over,
});

function settleOnFloor(map = flatMap()) {
  // Spawn above the floor (floor top = 19*16 = 304) and let gravity settle.
  let p = createPlayer(100, 280);
  for (let i = 0; i < 60; i++) p = stepPlayer(p, NEUTRAL_INTENT, map, T, DT);
  return { map, p };
}

describe("stepPlayer", () => {
  it("falls under gravity and lands on the floor grounded", () => {
    const { p } = settleOnFloor();
    expect(p.grounded).toBe(true);
    expect(p.y).toBeCloseTo(304 - T.height, 0);
    expect(p.vy).toBe(0);
  });

  it("accelerates rightward toward run speed, not instantly", () => {
    const { map, p: start } = settleOnFloor();
    let p = stepPlayer(start, intent({ moveX: 1 }), map, T, DT);
    expect(p.vx).toBeGreaterThan(0);
    expect(p.vx).toBeLessThan(T.runSpeed); // ramps up
    expect(p.facing).toBe(1);
    for (let i = 0; i < 60; i++) p = stepPlayer(p, intent({ moveX: 1 }), map, T, DT);
    expect(p.vx).toBeCloseTo(T.runSpeed, 0);
  });

  it("faces left when moving left", () => {
    const { map, p: start } = settleOnFloor();
    const p = stepPlayer(start, intent({ moveX: -1 }), map, T, DT);
    expect(p.facing).toBe(-1);
  });

  it("jumps when grounded and rises", () => {
    const { map, p: start } = settleOnFloor();
    const p = stepPlayer(start, intent({ jumpPressed: true, jumpHeld: true }), map, T, DT);
    expect(p.vy).toBeLessThan(0); // moving up
    expect(p.grounded).toBe(false);
  });

  it("variable height: held jump goes higher than a tapped jump", () => {
    const { map, p: start } = settleOnFloor();

    let held = stepPlayer(start, intent({ jumpPressed: true, jumpHeld: true }), map, T, DT);
    for (let i = 0; i < 18; i++) {
      held = stepPlayer(held, intent({ jumpHeld: true }), map, T, DT);
    }

    let tapped = stepPlayer(start, intent({ jumpPressed: true, jumpHeld: true }), map, T, DT);
    for (let i = 0; i < 18; i++) {
      tapped = stepPlayer(tapped, NEUTRAL_INTENT, map, T, DT); // released immediately
    }

    // Lower y = higher on screen. Held jump should reach a higher apex.
    expect(held.y).toBeLessThan(tapped.y);
  });

  it("coyote time lets a jump fire shortly after walking off a ledge", () => {
    // Floor only under columns 0..5; a cliff to the right.
    const map = createTileMap(40, 20, 16);
    for (let c = 0; c <= 5; c++) setTile(map, c, 19, TileKind.Solid);
    // Spawn at the very lip of the ledge (right edge of col 5 = x 96; width 12).
    let p = createPlayer(5 * 16 + 12, 280);
    for (let i = 0; i < 60; i++) p = stepPlayer(p, NEUTRAL_INTENT, map, T, DT);
    expect(p.grounded).toBe(true);

    // Step right until airborne (clears the ledge), staying within coyote grace.
    let airborne = false;
    for (let i = 0; i < 8 && !airborne; i++) {
      p = stepPlayer(p, intent({ moveX: 1 }), map, T, DT);
      airborne = !p.grounded;
    }
    expect(airborne).toBe(true);
    expect(p.coyote).toBeGreaterThan(0); // grace window is open

    // Jump on the very next step — coyote grace should allow it despite no ground.
    p = stepPlayer(p, intent({ moveX: 1, jumpPressed: true, jumpHeld: true }), map, T, DT);
    expect(p.vy).toBeLessThan(0);
  });

  it("jump buffer fires a jump pressed just before landing", () => {
    const map = flatMap(); // floor top = 304
    // Start just above the floor so landing happens within the buffer window.
    let p = createPlayer(100, 304 - T.height - 4);
    p.vy = 120;
    // Press jump while still airborne (buffered, not consumed yet).
    p = stepPlayer(p, intent({ jumpPressed: true, jumpHeld: true }), map, T, DT);
    expect(p.vy).toBeGreaterThan(0); // still falling, jump not yet applied
    // Keep holding; on landing within the buffer window the jump should fire.
    let jumped = false;
    for (let i = 0; i < 6; i++) {
      p = stepPlayer(p, intent({ jumpHeld: true }), map, T, DT);
      if (p.vy < 0) {
        jumped = true;
        break;
      }
    }
    expect(jumped).toBe(true);
  });

  it("dies on hazard contact", () => {
    const map = flatMap();
    setTile(map, 6, 18, TileKind.Hazard);
    let p = createPlayer(6 * 16 + 2, 240);
    for (let i = 0; i < 60 && !p.dead; i++) p = stepPlayer(p, NEUTRAL_INTENT, map, T, DT);
    expect(p.dead).toBe(true);
  });

  it("whip activates on press and counts down", () => {
    const { map, p: start } = settleOnFloor();
    const p = stepPlayer(start, intent({ whipPressed: true }), map, T, DT);
    expect(p.whip).toBeGreaterThan(0);
    expect(p.whip).toBeLessThanOrEqual(T.whipDuration);
  });

  it("is deterministic for an identical intent sequence", () => {
    const intents = [
      intent({ moveX: 1 }),
      intent({ moveX: 1, jumpPressed: true, jumpHeld: true }),
      intent({ moveX: 1, jumpHeld: true }),
      intent({ moveX: -1 }),
      NEUTRAL_INTENT,
    ];
    const run = () => {
      const map = flatMap();
      let p = createPlayer(100, 280);
      for (const it of intents) p = stepPlayer(p, it, map, T, DT);
      return p;
    };
    expect(run()).toEqual(run());
  });
});
