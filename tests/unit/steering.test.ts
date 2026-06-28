import { applySteering, arrive, flee, seek } from "@sim/ai/steering.ts";
import { describe, expect, it } from "vitest";

const ZERO = { x: 0, y: 0 };

describe("steering behaviours", () => {
  it("seek produces a force toward the target", () => {
    const f = seek({ x: 0, y: 0 }, ZERO, { x: 100, y: 0 }, 50, 200);
    expect(f.x).toBeGreaterThan(0);
    expect(f.y).toBeCloseTo(0);
  });

  it("flee produces a force away from the target", () => {
    const f = flee({ x: 0, y: 0 }, ZERO, { x: 100, y: 0 }, 50, 200);
    expect(f.x).toBeLessThan(0);
  });

  it("arrive slows as it nears the target (smaller force when close)", () => {
    const far = arrive({ x: 0, y: 0 }, ZERO, { x: 1000, y: 0 }, 50, 200);
    const near = arrive({ x: 0, y: 0 }, ZERO, { x: 5, y: 0 }, 50, 200);
    expect(Math.abs(far.x)).toBeGreaterThan(Math.abs(near.x));
  });

  it("arrive returns ~zero force within tolerance", () => {
    const f = arrive({ x: 0, y: 0 }, ZERO, { x: 0.1, y: 0 }, 50, 200, 3, 0.5);
    expect(Math.abs(f.x)).toBeLessThan(1);
  });

  it("applySteering clamps velocity to maxSpeed", () => {
    const v = applySteering({ x: 49, y: 0 }, { x: 10000, y: 0 }, 1 / 60, 50);
    expect(Math.hypot(v.x, v.y)).toBeLessThanOrEqual(50 + 1e-6);
  });

  it("is deterministic", () => {
    const run = () => seek({ x: 3, y: 4 }, { x: 1, y: 1 }, { x: 50, y: 60 }, 30, 100);
    expect(run()).toEqual(run());
  });
});
