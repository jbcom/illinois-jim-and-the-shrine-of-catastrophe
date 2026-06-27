import { levelBounds, parseLevel } from "@sim/world/level.ts";
import { SHRINE_01 } from "@sim/world/levels/shrine01.ts";
import { TileKind, tileAt } from "@sim/world/tilemap.ts";
import { describe, expect, it } from "vitest";

describe("parseLevel", () => {
  it("maps characters to tile kinds", () => {
    const level = parseLevel(["@.#", "=^H"], 16);
    expect(tileAt(level.map, 2, 0)).toBe(TileKind.Solid);
    expect(tileAt(level.map, 0, 1)).toBe(TileKind.Platform);
    expect(tileAt(level.map, 1, 1)).toBe(TileKind.Hazard);
    expect(tileAt(level.map, 2, 1)).toBe(TileKind.Ladder);
  });

  it("extracts the player spawn from '@' and leaves the cell empty", () => {
    const level = parseLevel(["....", ".@..", "####"], 16);
    expect(level.spawnX).toBe(1 * 16);
    expect(level.spawnY).toBe(1 * 16);
    expect(tileAt(level.map, 1, 1)).toBe(TileKind.Empty);
  });

  it("pads ragged rows to the widest row", () => {
    const level = parseLevel(["#", "###"], 16);
    expect(level.map.width).toBe(3);
    expect(tileAt(level.map, 0, 0)).toBe(TileKind.Solid);
    expect(tileAt(level.map, 2, 0)).toBe(TileKind.Empty);
  });

  it("throws on an empty level", () => {
    expect(() => parseLevel([])).toThrow();
  });

  it("computes world bounds from tile dimensions", () => {
    const level = parseLevel(["###", "###"], 16);
    expect(levelBounds(level)).toEqual({ width: 48, height: 32 });
  });

  it("parses the bundled demo level with a valid spawn", () => {
    const level = parseLevel(SHRINE_01, 16);
    expect(level.map.width).toBeGreaterThan(0);
    expect(level.spawnX).toBeGreaterThanOrEqual(0);
    expect(level.spawnY).toBeGreaterThanOrEqual(0);
  });
});
