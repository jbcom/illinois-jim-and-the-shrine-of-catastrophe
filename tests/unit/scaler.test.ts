import { classifyDevice } from "@engine/viewport/deviceProfile.ts";
import { computeViewport } from "@engine/viewport/scaler.ts";
import { describe, expect, it } from "vitest";

// Helper: build a DeviceProfile with an explicit design resolution.
function profileWith(w: number, h: number) {
  // Use a desktop-like input so the design resolution is predictable,
  // then override via a minimal DeviceProfile shape.
  const base = classifyDevice({ width: 1280, height: 720, dpr: 1, platform: "web" });
  return { ...base, designResolution: { width: w, height: h } };
}

// ---------------------------------------------------------------------------
// Exact fit — canvas == design resolution
// ---------------------------------------------------------------------------

describe("computeViewport — exact fit", () => {
  it("returns scale 1 with zero offsets when canvas matches design exactly", () => {
    const profile = profileWith(480, 270);
    const vp = computeViewport(profile, 480, 270);
    expect(vp.scale).toBeCloseTo(1);
    expect(vp.offsetX).toBeCloseTo(0);
    expect(vp.offsetY).toBeCloseTo(0);
    expect(vp.viewW).toBeCloseTo(480);
    expect(vp.viewH).toBeCloseTo(270);
  });

  it("returns integer scale 2 when canvas is exactly double", () => {
    const profile = profileWith(480, 270);
    const vp = computeViewport(profile, 960, 540);
    expect(vp.scale).toBeCloseTo(2);
    expect(vp.offsetX).toBeCloseTo(0);
    expect(vp.offsetY).toBeCloseTo(0);
    expect(vp.viewW).toBeCloseTo(960);
    expect(vp.viewH).toBeCloseTo(540);
  });
});

// ---------------------------------------------------------------------------
// Letterbox — canvas is wider than the design aspect ratio
// ---------------------------------------------------------------------------

describe("computeViewport — letterbox (pillar bars on sides)", () => {
  it("adds equal pillarbox offsets when canvas is wider than design", () => {
    // Design 480×270 (16:9). Canvas 960×270 (32:9) → scale = 1, pillarbox each side.
    const profile = profileWith(480, 270);
    const vp = computeViewport(profile, 960, 270);
    expect(vp.scale).toBeCloseTo(1); // height constrains
    expect(vp.viewW).toBeCloseTo(480);
    expect(vp.viewH).toBeCloseTo(270);
    expect(vp.offsetX).toBeCloseTo(240); // (960 - 480) / 2
    expect(vp.offsetY).toBeCloseTo(0);
  });

  it("scales up and adds pillarbox when canvas is tall but very wide", () => {
    // Design 480×270, canvas 1920×270: scale = 1 (height), viewW=480, bars 720 each side
    const profile = profileWith(480, 270);
    const vp = computeViewport(profile, 1920, 270);
    expect(vp.scale).toBeCloseTo(1);
    expect(vp.offsetX).toBeCloseTo(720);
    expect(vp.offsetY).toBeCloseTo(0);
  });
});

// ---------------------------------------------------------------------------
// Pillarbox — canvas is taller than the design aspect ratio
// ---------------------------------------------------------------------------

describe("computeViewport — pillarbox (letter bars top/bottom)", () => {
  it("adds equal letterbox offsets when canvas is taller than design", () => {
    // Design 480×270 (16:9). Canvas 480×540 (8:9) → scale = 1 (width constrains).
    const profile = profileWith(480, 270);
    const vp = computeViewport(profile, 480, 540);
    expect(vp.scale).toBeCloseTo(1);
    expect(vp.viewW).toBeCloseTo(480);
    expect(vp.viewH).toBeCloseTo(270);
    expect(vp.offsetX).toBeCloseTo(0);
    expect(vp.offsetY).toBeCloseTo(135); // (540 - 270) / 2
  });

  it("scales up and adds letterbox on a large portrait canvas", () => {
    // Design 480×270, canvas 960×1080: scaleX=2, scaleY=4 → scale=2, viewH=540, bars=(1080-540)/2=270
    const profile = profileWith(480, 270);
    const vp = computeViewport(profile, 960, 1080);
    expect(vp.scale).toBeCloseTo(2);
    expect(vp.viewW).toBeCloseTo(960);
    expect(vp.viewH).toBeCloseTo(540);
    expect(vp.offsetX).toBeCloseTo(0);
    expect(vp.offsetY).toBeCloseTo(270);
  });
});

// ---------------------------------------------------------------------------
// Scaling in both directions
// ---------------------------------------------------------------------------

describe("computeViewport — downscale and upscale", () => {
  it("downscales when canvas is smaller than design", () => {
    // Design 960×540, canvas 480×270 → scale 0.5, no bars
    const profile = profileWith(960, 540);
    const vp = computeViewport(profile, 480, 270);
    expect(vp.scale).toBeCloseTo(0.5);
    expect(vp.offsetX).toBeCloseTo(0);
    expect(vp.offsetY).toBeCloseTo(0);
  });

  it("scales to width when canvas is slightly narrower", () => {
    // Design 480×270, canvas 400×300: scaleX=400/480≈0.833, scaleY=300/270≈1.111 → scale≈0.833
    const profile = profileWith(480, 270);
    const vp = computeViewport(profile, 400, 300);
    const expectedScale = 400 / 480;
    expect(vp.scale).toBeCloseTo(expectedScale);
    expect(vp.viewW).toBeCloseTo(480 * expectedScale);
    expect(vp.viewH).toBeCloseTo(270 * expectedScale);
    // offsetX should be 0 (width constrained), small positive offsetY
    expect(vp.offsetX).toBeCloseTo(0);
    expect(vp.offsetY).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Centering invariant
// ---------------------------------------------------------------------------

describe("computeViewport — centering invariant", () => {
  it("always centers the view within the canvas", () => {
    const cases = [
      { cw: 800, ch: 600, dw: 480, dh: 270 },
      { cw: 1920, ch: 1080, dw: 1280, dh: 720 },
      { cw: 375, ch: 812, dw: 480, dh: 270 },
      { cw: 1024, ch: 1366, dw: 960, dh: 540 },
    ];

    for (const { cw, ch, dw, dh } of cases) {
      const profile = profileWith(dw, dh);
      const vp = computeViewport(profile, cw, ch);

      // The drawn area must fit inside the canvas.
      expect(vp.offsetX).toBeGreaterThanOrEqual(0);
      expect(vp.offsetY).toBeGreaterThanOrEqual(0);
      expect(vp.offsetX + vp.viewW).toBeCloseTo(cw - vp.offsetX, 1);
      expect(vp.offsetY + vp.viewH).toBeCloseTo(ch - vp.offsetY, 1);
    }
  });
});

// ---------------------------------------------------------------------------
// Degenerate / edge cases
// ---------------------------------------------------------------------------

describe("computeViewport — edge cases", () => {
  it("handles 1×1 canvas without throwing", () => {
    const profile = profileWith(480, 270);
    const vp = computeViewport(profile, 1, 1);
    expect(vp.scale).toBeGreaterThan(0);
    expect(Number.isFinite(vp.offsetX)).toBe(true);
    expect(Number.isFinite(vp.offsetY)).toBe(true);
  });

  it("handles square canvas", () => {
    // Design 480×270, canvas 540×540: scaleX=540/480=1.125, scaleY=540/270=2 → scale=1.125
    const profile = profileWith(480, 270);
    const vp = computeViewport(profile, 540, 540);
    expect(vp.scale).toBeCloseTo(540 / 480);
    expect(vp.offsetX).toBeCloseTo(0);
    expect(vp.offsetY).toBeGreaterThan(0);
  });

  it("scale is always positive", () => {
    const profile = profileWith(1, 1);
    const vp = computeViewport(profile, 100, 100);
    expect(vp.scale).toBeGreaterThan(0);
  });
});
