import {
  buildCollision,
  buildLevel,
  type LevelSpec,
  levelWidth,
  resolveAnchor,
  resolveSegments,
  spawnsBeforeGoal,
} from "@sim/world/levelSpec.ts";
import { SHRINE_HEART_SPEC } from "@sim/world/specs/shrineHeart.ts";
import { TileKind, tileAt } from "@sim/world/tilemap.ts";
import { describe, expect, it } from "vitest";

const SPEC: LevelSpec = {
  id: "t",
  baselineY: 300,
  tileSize: 16,
  rows: 20,
  segments: [
    { kind: "ground", length: 160 },
    { kind: "gap", length: 80 },
    { kind: "raised", length: 80, top: 64, anchorProp: "beam" },
    { kind: "ground", length: 160 },
  ],
  goal: { seg: 3, t: 0.9 },
  enemies: [{ seg: 0, t: 0.5, kind: "patrol", visual: "goblin" }],
  pots: [{ seg: 3, t: 0.2, color: "red", drop: "relic" }],
  collectibles: [{ seg: 2, t: 0.5, dy: 24, value: 100 }],
  npcs: [],
};

describe("levelSpec — single source of truth", () => {
  it("resolves segments to contiguous left-to-right world spans", () => {
    const r = resolveSegments(SPEC);
    expect(r[0]!.x0).toBe(0);
    expect(r[0]!.x1).toBe(160);
    expect(r[1]!.x0).toBe(160); // the gap starts where ground ended
    expect(r[3]!.x1).toBe(levelWidth(SPEC)); // last segment ends at total width
  });

  it("a raised surface sits ABOVE the ground baseline by its top", () => {
    const r = resolveSegments(SPEC);
    expect(r[0]!.surfaceY).toBe(300); // ground = baseline
    expect(r[2]!.surfaceY).toBe(300 - 64); // raised by 64
    expect(r[1]!.surfaceY).toBeUndefined(); // a gap has no surface
  });

  it("derives collision: ground solid, raised one-way, gap empty", () => {
    const map = buildCollision(SPEC);
    // Ground floor row is solid (baseline 300 / 16 ≈ row 19).
    expect(tileAt(map, 2, 19)).toBe(TileKind.Solid);
    // The gap (x 160–240, cols 10–14) has NO solid floor.
    expect(tileAt(map, 12, 19)).toBe(TileKind.Empty);
    // The raised beam (surface 236/16 ≈ row 15) is a one-way Platform.
    expect(tileAt(map, 17, 15)).toBe(TileKind.Platform);
  });

  it("resolveAnchor places a thing on its segment's surface at the right x", () => {
    const r = resolveSegments(SPEC);
    // Middle of segment 0 (length 160) → x 80, on the baseline.
    expect(resolveAnchor(SPEC, r, { seg: 0, t: 0.5 })).toEqual({ x: 80, y: 300 });
    // On the raised beam, 24px above it.
    expect(resolveAnchor(SPEC, r, { seg: 2, t: 0.5, dy: 24 })).toEqual({ x: 240 + 40, y: 236 - 24 });
  });

  it("EVERY spawn resolves to a world-x before the goal (no stranded entities)", () => {
    expect(spawnsBeforeGoal(SPEC)).toBe(true);
  });

  it("the real shrine-heart spec is internally consistent (spawns before goal)", () => {
    expect(spawnsBeforeGoal(SHRINE_HEART_SPEC)).toBe(true);
    const built = buildLevel(SHRINE_HEART_SPEC);
    // Goal is on the last (staircase) segment, deep in the level.
    expect(built.goalX).toBeGreaterThan(levelWidth(SHRINE_HEART_SPEC) * 0.85);
    // Every raised segment names a real anchoring object (nothing floats).
    for (const s of SHRINE_HEART_SPEC.segments) {
      if (s.kind === "raised") expect(s.anchorProp).toBeTruthy();
    }
  });
});
