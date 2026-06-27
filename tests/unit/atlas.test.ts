import { cellRect, gridAtlas } from "@render/atlas.ts";
import { describe, expect, it } from "vitest";

describe("atlas rect math", () => {
  it("computes a cell rect with no gap", () => {
    expect(cellRect(0, 0, 18)).toEqual({ sx: 0, sy: 0, sw: 18, sh: 18 });
    expect(cellRect(2, 3, 18)).toEqual({ sx: 36, sy: 54, sw: 18, sh: 18 });
  });

  it("accounts for inter-tile gap", () => {
    expect(cellRect(1, 1, 16, 1)).toEqual({ sx: 17, sy: 17, sw: 16, sh: 16 });
  });

  it("builds a named grid atlas (pure — fake image object)", () => {
    const fakeImage = {} as HTMLImageElement;
    const atlas = gridAtlas(fakeImage, {
      tileSize: 18,
      cells: { ground: [0, 0], spike: [4, 1], coin: [6, 2] },
    });
    expect(atlas.tileSize).toBe(18);
    expect([...atlas.names].sort()).toEqual(["coin", "ground", "spike"]);
    expect(atlas.rect("spike")).toEqual({ sx: 72, sy: 18, sw: 18, sh: 18 });
    expect(atlas.rect("missing")).toBeUndefined();
  });
});
