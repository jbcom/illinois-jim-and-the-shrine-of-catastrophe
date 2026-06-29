import { VILLAGE_APPROACH_FRAME } from "@render/levels/villageApproach.ts";
import { VILLAGE_APPROACH_SPEC as S } from "@sim/world/specs/villageApproach.ts";
import { describe, expect, it } from "vitest";

/**
 * The cover-by-height transform maps worldY → screenY. These lock the FRAMING so
 * the grass line never jams against the bottom again (the bug that turned the
 * floor into a thick brown band and squeezed the platforms into the top).
 */
const screenRatio = (worldY: number): number => {
  const frameH = VILLAGE_APPROACH_FRAME.bottom - VILLAGE_APPROACH_FRAME.top;
  return (worldY - VILLAGE_APPROACH_FRAME.top) / frameH;
};

describe("village frame geometry (vertical platform framing)", () => {
  it("the grass line sits in the upper-mid screen, not jammed at the bottom", () => {
    const grass = screenRatio(S.baselineY);
    expect(grass).toBeLessThan(0.82); // was 0.89 (the bug)
    expect(grass).toBeGreaterThan(0.6); // still reads as a floor
  });

  it("the brown band below the grass cap is a thin strip, not dead space", () => {
    // From the grass line to the clipped frame bottom (ratio 1.0).
    const band = 1 - screenRatio(S.baselineY);
    expect(band).toBeLessThan(0.3); // < ~30% of screen height
  });

  it("most platforms land in the central climbable band (15–75% of screen)", () => {
    const inBand = (S.platforms ?? []).filter((p) => {
      const r = screenRatio(S.baselineY - (p.top ?? 0));
      return r > 0.15 && r < 0.75;
    });
    expect(inBand.length).toBeGreaterThanOrEqual(4);
  });

  it("the frame top sits above the highest platform (sky headroom, nothing clipped)", () => {
    const highest = Math.min(...(S.platforms ?? []).map((p) => S.baselineY - (p.top ?? 0)));
    expect(VILLAGE_APPROACH_FRAME.top).toBeLessThanOrEqual(highest);
  });
});
