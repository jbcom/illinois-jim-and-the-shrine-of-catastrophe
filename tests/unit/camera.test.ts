import { createCamera, followCamera, type LevelBounds } from "@sim/world/camera.ts";
import { describe, expect, it } from "vitest";

const BOUNDS: LevelBounds = { width: 2000, height: 1000 };

describe("camera", () => {
  it("does not move while the target stays inside the deadzone", () => {
    const cam = createCamera(320, 180);
    // Center of a fresh camera is (160, 90). Nudge the target slightly.
    const next = followCamera(cam, 160 + 10, 90 + 10, BOUNDS);
    expect(next.x).toBeCloseTo(0);
    expect(next.y).toBeCloseTo(0);
  });

  it("scrolls right when the target leaves the deadzone", () => {
    const cam = createCamera(320, 180);
    const next = followCamera(cam, 1000, 90, BOUNDS);
    expect(next.x).toBeGreaterThan(0);
  });

  it("clamps to the left/top level edge (never negative)", () => {
    const cam = createCamera(320, 180);
    const next = followCamera(cam, -500, -500, BOUNDS);
    expect(next.x).toBe(0);
    expect(next.y).toBe(0);
  });

  it("clamps to the right/bottom level edge", () => {
    const cam = createCamera(320, 180);
    const next = followCamera(cam, 99999, 99999, BOUNDS);
    expect(next.x).toBe(BOUNDS.width - 320);
    expect(next.y).toBe(BOUNDS.height - 180);
  });

  it("pins to 0 when the level is smaller than the view", () => {
    const cam = createCamera(320, 180);
    const small: LevelBounds = { width: 100, height: 80 };
    const next = followCamera(cam, 50, 40, small);
    expect(next.x).toBe(0);
    expect(next.y).toBe(0);
  });

  it("is deterministic", () => {
    const run = () => {
      let cam = createCamera(320, 180);
      for (const x of [500, 800, 200, 1500]) cam = followCamera(cam, x, 90, BOUNDS);
      return cam;
    };
    expect(run()).toEqual(run());
  });
});
