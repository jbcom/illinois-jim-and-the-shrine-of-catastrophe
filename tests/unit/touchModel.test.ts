import { defaultTouchLayout, type Pointer, touchToAxes } from "@sim/input/touchModel.ts";
import { describe, expect, it } from "vitest";

const layout = defaultTouchLayout(800, 400);

const ptr = (over: Partial<Pointer>): Pointer => ({
  id: 1,
  startX: 0,
  startY: 0,
  x: 0,
  y: 0,
  ...over,
});

describe("touchToAxes", () => {
  it("neutral with no pointers", () => {
    const a = touchToAxes([], layout);
    expect(a).toEqual({ moveX: 0, moveY: 0, jump: false, whip: false });
  });

  it("drags right on the left half → positive moveX", () => {
    const start = 100;
    const a = touchToAxes(
      [ptr({ startX: start, startY: 200, x: start + layout.stickRadius, y: 200 })],
      layout,
    );
    expect(a.moveX).toBeCloseTo(1);
    expect(a.moveY).toBeCloseTo(0);
  });

  it("drags left → negative moveX, clamped to -1", () => {
    const a = touchToAxes(
      [ptr({ startX: 200, startY: 200, x: 200 - layout.stickRadius * 5, y: 200 })],
      layout,
    );
    expect(a.moveX).toBe(-1);
  });

  it("jump button press registers jump", () => {
    const j = layout.jumpButton;
    const a = touchToAxes([ptr({ startX: j.x, startY: j.y, x: j.x, y: j.y })], layout);
    expect(a.jump).toBe(true);
  });

  it("whip button press registers whip", () => {
    const w = layout.whipButton;
    const a = touchToAxes([ptr({ startX: w.x, startY: w.y, x: w.x, y: w.y })], layout);
    expect(a.whip).toBe(true);
  });

  it("supports simultaneous move + jump (two pointers)", () => {
    const j = layout.jumpButton;
    const a = touchToAxes(
      [
        ptr({ id: 1, startX: 100, startY: 200, x: 100 + layout.stickRadius, y: 200 }),
        ptr({ id: 2, startX: j.x, startY: j.y, x: j.x, y: j.y }),
      ],
      layout,
    );
    expect(a.moveX).toBeCloseTo(1);
    expect(a.jump).toBe(true);
  });

  it("ignores movement from a pointer that started on the right half", () => {
    const a = touchToAxes([ptr({ startX: 700, startY: 50, x: 600, y: 50 })], layout);
    expect(a.moveX).toBe(0);
  });
});
