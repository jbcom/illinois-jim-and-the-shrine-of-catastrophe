import { add, approach, clamp, length, lerp, normalize, scale, sub, vec2 } from "@sim/math/vec2.ts";
import { describe, expect, it } from "vitest";

describe("vec2 math", () => {
  it("adds and subtracts", () => {
    expect(add(vec2(1, 2), vec2(3, 4))).toEqual({ x: 4, y: 6 });
    expect(sub(vec2(5, 5), vec2(1, 2))).toEqual({ x: 4, y: 3 });
  });

  it("scales", () => {
    expect(scale(vec2(2, -3), 2)).toEqual({ x: 4, y: -6 });
  });

  it("computes length", () => {
    expect(length(vec2(3, 4))).toBe(5);
  });

  it("normalizes, and returns zero for a zero vector", () => {
    const n = normalize(vec2(0, 10));
    expect(n.x).toBeCloseTo(0);
    expect(n.y).toBeCloseTo(1);
    expect(normalize(vec2(0, 0))).toEqual({ x: 0, y: 0 });
  });

  it("clamps scalars", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it("lerps", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });

  it("approaches a target without overshoot", () => {
    expect(approach(0, 10, 3)).toBe(3);
    expect(approach(9, 10, 3)).toBe(10);
    expect(approach(10, 0, 3)).toBe(7);
    expect(approach(1, 0, 3)).toBe(0);
  });
});
