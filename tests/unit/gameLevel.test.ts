import { DESCENT, VILLAGE } from "@sim/world/gameLevel.ts";
import { TileKind, tileAt } from "@sim/world/tilemap.ts";
import { describe, expect, it } from "vitest";

/** The floor row both levels author their solid ground on (FLOOR_Y 300 / 16). */
const FLOOR_ROW = 19;

describe("game levels", () => {
  it("the cave descent is a ~5-screen level with a bridged chasm", () => {
    const m = DESCENT.map;
    // ~2600px wide at 16px tiles ≈ 163 cols (a meaty standard level).
    expect(m.width).toBeGreaterThanOrEqual(160);
    expect(m.tileSize).toBe(16);

    // There is a real chasm: a run of floor cells with NO solid ground.
    let gap = 0;
    for (let c = 1; c < m.width - 1; c++) {
      if (tileAt(m, c, FLOOR_ROW) !== TileKind.Solid) gap++;
    }
    expect(gap).toBeGreaterThan(8); // the chasm the beams bridge

    // The chasm is bridged: at least one one-way Platform tile exists above the floor.
    let platforms = 0;
    for (let r = 0; r < FLOOR_ROW; r++) {
      for (let c = 0; c < m.width; c++) {
        if (tileAt(m, c, r) === TileKind.Platform) platforms++;
      }
    }
    expect(platforms).toBeGreaterThan(0);

    // The goal sits near the far end of the painted level.
    expect(DESCENT.goalX).toBeGreaterThan(2000);
  });

  it("the cave ramps difficulty with several enemies + pickups across its length", () => {
    expect(DESCENT.enemies.length).toBeGreaterThanOrEqual(5);
    expect(DESCENT.pots.length).toBeGreaterThanOrEqual(3);
    // Enemies are spread across the level, not clustered at the start.
    const xs = DESCENT.enemies.map((e) => e.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(1500);
    // Each enemy names a real animated visual.
    for (const e of DESCENT.enemies) {
      expect(["goblin", "skeleton", "mushroom", "flyingEye"]).toContain(e.visual);
    }
  });

  it("the village is a continuous-ground overworld level with NPCs", () => {
    const m = VILLAGE.map;
    // The overworld road has NO chasm — solid ground all the way across.
    for (let c = 1; c < m.width - 1; c++) {
      expect(tileAt(m, c, FLOOR_ROW)).toBe(TileKind.Solid);
    }
    // The village carries the story's opening NPCs (dialogue keys present).
    expect(VILLAGE.npcs.length).toBeGreaterThanOrEqual(3);
    for (const n of VILLAGE.npcs) expect(n.dialogueId).toBeTruthy();
    expect(VILLAGE.goalX).toBeGreaterThan(2000);
  });
});
