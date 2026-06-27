import { aabb } from "@sim/physics/aabb.ts";
import { moveAndCollide } from "@sim/physics/collide.ts";
import { createTileMap, setTile, TileKind } from "@sim/world/tilemap.ts";
import { describe, expect, it } from "vitest";

/** 8×8 grid, 10px tiles. Floor row 7 solid; everything else empty by default. */
function floorMap() {
  const map = createTileMap(8, 8, 10);
  for (let c = 0; c < 8; c++) setTile(map, c, 7, TileKind.Solid);
  return map;
}

describe("moveAndCollide", () => {
  it("lands on the floor and reports grounded", () => {
    const map = floorMap();
    const body = aabb(20, 50, 8, 8); // just above floor (floor top = 70)
    const r = moveAndCollide(map, body, 0, 30); // try to fall through
    expect(r.grounded).toBe(true);
    expect(r.y).toBeCloseTo(70 - 8); // rests on top of floor tile
  });

  it("stops against a right wall and slides vertically", () => {
    const map = createTileMap(8, 8, 10);
    for (let r = 0; r < 8; r++) setTile(map, 5, r, TileKind.Solid); // wall col 5
    const body = aabb(40, 10, 8, 8);
    const r = moveAndCollide(map, body, 20, 0); // move right into wall (x=50)
    expect(r.hitRight).toBe(true);
    expect(r.x).toBeCloseTo(50 - 8);
  });

  it("stops against a left wall", () => {
    const map = createTileMap(8, 8, 10);
    for (let r = 0; r < 8; r++) setTile(map, 2, r, TileKind.Solid); // wall col 2
    const body = aabb(40, 10, 8, 8);
    const r = moveAndCollide(map, body, -20, 0); // move left toward wall (right edge col2 = 30)
    expect(r.hitLeft).toBe(true);
    expect(r.x).toBeCloseTo(30);
  });

  it("bonks head on a ceiling moving up", () => {
    const map = createTileMap(8, 8, 10);
    for (let c = 0; c < 8; c++) setTile(map, c, 1, TileKind.Solid); // ceiling row1 (bottom=20)
    const body = aabb(20, 30, 8, 8);
    const r = moveAndCollide(map, body, 0, -20);
    expect(r.hitTop).toBe(true);
    expect(r.y).toBeCloseTo(20);
  });

  it("out-of-bounds is solid (closed world): cannot leave the left edge", () => {
    const map = createTileMap(8, 8, 10);
    const body = aabb(2, 30, 8, 8);
    const r = moveAndCollide(map, body, -20, 0);
    expect(r.hitLeft).toBe(true);
    expect(r.x).toBeCloseTo(0);
  });

  it("one-way platform blocks a falling body but not a rising one", () => {
    const map = createTileMap(8, 8, 10);
    for (let c = 0; c < 8; c++) setTile(map, c, 5, TileKind.Platform); // platform row5 top=50
    const above = aabb(20, 40, 8, 8);
    const falling = moveAndCollide(map, above, 0, 20);
    expect(falling.grounded).toBe(true);
    expect(falling.y).toBeCloseTo(50 - 8);

    const below = aabb(20, 60, 8, 8);
    const rising = moveAndCollide(map, below, 0, -20);
    expect(rising.hitTop).toBe(false); // passes through from below
  });

  it("flags hazard contact without blocking", () => {
    const map = floorMap();
    setTile(map, 3, 6, TileKind.Hazard); // spike sitting on floor at col3 row6
    const body = aabb(30, 50, 8, 8);
    const r = moveAndCollide(map, body, 0, 12);
    expect(r.touchedHazard).toBe(true);
  });

  it("is deterministic for identical inputs", () => {
    const run = () => {
      const map = floorMap();
      const body = aabb(20, 50, 8, 8);
      return moveAndCollide(map, body, 3, 30);
    };
    expect(run()).toEqual(run());
  });
});
