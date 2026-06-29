import { buildFromLevel, entitiesBeforeGoal, levelWidth, resolveSurfaces } from "@sim/world/buildFromLevel.ts";
import { parseLevel } from "@sim/world/levelSchema.ts";
import { TileKind, tileAt } from "@sim/world/tilemap.ts";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** A minimal valid level for the builder (a ground → raised → gap → ground route). */
const RAW: unknown = {
  id: "test-level",
  title: "Test",
  order: 1,
  biome: "clifftop-village",
  types: ["platformer"],
  targetMinutes: 7,
  story: { beat: "x", narration: ["x"] },
  baselineY: 250,
  art: [
    { key: "sky", role: "parallax", isolation: "scene", prompt: "a 16-bit dusk sky background layer", aspect: "16:9", worldHeight: 400 },
    { key: "hills", role: "parallax", isolation: "scene", prompt: "a 16-bit far hills background layer", aspect: "16:9", worldHeight: 400 },
    { key: "roof", role: "structure", isolation: "transparent", prompt: "a single pitched rooftop on a flat solid magenta background", worldHeight: 40 },
    { key: "coin", role: "collectible", isolation: "transparent", prompt: "a single gold coin on a flat solid magenta background", worldHeight: 16 },
  ],
  parallax: [
    { art: "sky", factor: 0.1 },
    { art: "hills", factor: 0.4 },
  ],
  surfaces: [
    { kind: "ground", length: 400 },
    { kind: "raised", length: 120, top: 80, anchorArt: "roof" },
    { kind: "gap", length: 100 },
    { kind: "ground", length: 500 },
  ],
  placements: [{ art: "roof", at: { surface: 1, t: 0 } }],
  enemies: [],
  collectibles: [{ art: "coin", at: { surface: 1, t: 0.5, dy: 24 }, value: 100 }],
  pots: [],
  npcs: [],
  hazards: [],
  spawn: { surface: 0, t: 0.05 },
  goal: { surface: 3, t: 0.9 },
};

describe("buildFromLevel — schema Level → playable build", () => {
  it("resolves surfaces to contiguous left-to-right spans", () => {
    const level = parseLevel(RAW);
    const r = resolveSurfaces(level);
    expect(r[0]!.x0).toBe(0);
    expect(r[0]!.x1).toBe(400);
    expect(r[1]!.surfaceY).toBe(250 - 80); // raised by its top
    expect(r[2]!.surfaceY).toBeUndefined(); // a gap has no surface
    expect(r[3]!.x1).toBe(levelWidth(level));
  });

  it("derives collision: ground solid, raised one-way, gap empty", () => {
    const built = buildFromLevel(parseLevel(RAW));
    const ts = built.map.tileSize;
    // ground row (250/16 ≈ 15) solid under surface 0.
    expect(tileAt(built.map, Math.round(200 / ts), Math.round(250 / ts))).toBe(TileKind.Solid);
    // the gap (x 520–620) has no floor.
    expect(tileAt(built.map, Math.round(560 / ts), Math.round(250 / ts))).toBe(TileKind.Empty);
    // the raised surface (y 170) is a one-way Platform.
    expect(tileAt(built.map, Math.round(460 / ts), Math.round(170 / ts))).toBe(TileKind.Platform);
  });

  it("resolves entities + goal to world coords, all before the goal", () => {
    const built = buildFromLevel(parseLevel(RAW));
    expect(built.collectibles[0]!.x).toBeCloseTo(400 + 120 * 0.5, 0);
    expect(built.goalX).toBeGreaterThan(built.collectibles[0]!.x);
    expect(entitiesBeforeGoal(parseLevel(RAW))).toBe(true);
  });

  it("the GENERATED Halward's Reach level (if present) builds + is consistent", () => {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(new URL("../../src/levels/halwards-reach.level.json", import.meta.url), "utf8"));
    } catch {
      return; // not generated in this checkout — skip
    }
    const level = parseLevel(raw);
    const built = buildFromLevel(level);
    expect(built.map.width).toBeGreaterThan(0);
    expect(entitiesBeforeGoal(level)).toBe(true);
    // density sanity: ground is not the overwhelming majority (the thesis).
    const width = levelWidth(level);
    const ground = level.surfaces.filter((s) => s.kind === "ground").reduce((a, s) => a + s.length, 0);
    expect(ground / width).toBeLessThan(0.7);
  });
});
