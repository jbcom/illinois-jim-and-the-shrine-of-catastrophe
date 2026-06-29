import { bandScrollOffset, makeBandLayout, mapWorldX } from "@render/bandLayout.ts";
import { describe, expect, it } from "vitest";

/**
 * The portrait serpentine slice-wrap math: wrap a long horizontal level into stacked
 * screen-width bands, and scroll vertically by band as the player advances.
 */
describe("band layout (portrait slice-wrap)", () => {
  it("splits a level into ceil(width / bandWidth) bands", () => {
    expect(makeBandLayout(1000, 400, 200).bandCount).toBe(3); // 1000/400 → 2.5 → 3
    expect(makeBandLayout(800, 400, 200).bandCount).toBe(2); // exact
    expect(makeBandLayout(399, 400, 200).bandCount).toBe(1); // smaller than one band
  });

  it("landscape is the degenerate 1-band case (band width ≥ level width)", () => {
    const l = makeBandLayout(2000, 2000, 405);
    expect(l.bandCount).toBe(1);
    expect(mapWorldX(l, 1500)).toEqual({ band: 0, xInBand: 1500 });
  });

  it("maps a world-x to the right band + x-within-band", () => {
    const l = makeBandLayout(1000, 400, 200);
    expect(mapWorldX(l, 0)).toEqual({ band: 0, xInBand: 0 });
    expect(mapWorldX(l, 399)).toEqual({ band: 0, xInBand: 399 });
    expect(mapWorldX(l, 400)).toEqual({ band: 1, xInBand: 0 }); // wraps to band 1
    expect(mapWorldX(l, 850)).toEqual({ band: 2, xInBand: 50 });
  });

  it("clamps x to the level bounds", () => {
    const l = makeBandLayout(1000, 400, 200);
    expect(mapWorldX(l, -50)).toEqual({ band: 0, xInBand: 0 });
    expect(mapWorldX(l, 99999).band).toBe(l.bandCount - 1);
  });

  it("centers the player's band and clamps the vertical scroll", () => {
    // 6 bands, 3 visible at once → top visible band = playerBand - 1, clamped [0, 3].
    expect(bandScrollOffset(0, 6, 3)).toBe(0); // can't scroll above the top
    expect(bandScrollOffset(3, 6, 3)).toBe(2); // centered: top = 3-1 = 2
    expect(bandScrollOffset(5, 6, 3)).toBe(3); // last band → clamped to maxTop=3
  });

  it("single visible band = pure one-band-at-a-time scroll (true serpentine)", () => {
    expect(bandScrollOffset(0, 5, 1)).toBe(0);
    expect(bandScrollOffset(2, 5, 1)).toBe(2);
    expect(bandScrollOffset(4, 5, 1)).toBe(4);
    expect(bandScrollOffset(9, 5, 1)).toBe(4); // clamp to last band
  });
});
