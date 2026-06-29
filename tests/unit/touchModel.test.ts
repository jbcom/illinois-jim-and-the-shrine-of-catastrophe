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

// ---------------------------------------------------------------------------
// Regression: the unfolded-foldable bottom-control reachability bug.
//
// The jump/whip zones are ABSOLUTE-positioned (bottom-right corner), unlike the
// ratio-based joystick. If the layout is ever built from the wrong coordinate
// space (e.g. design-space viewW instead of CSS px), those zones land off-screen
// and a tap on the visible JMP button never registers. These assert the layout
// invariant across a near-square unfolded foldable AND normal phone sizes: the
// action zones must sit ON-screen in the bottom-right and a tap at their center
// must fire the action.
// ---------------------------------------------------------------------------

describe("defaultTouchLayout — action zones stay reachable across screen shapes", () => {
  const sizes = [
    { name: "near-square unfolded foldable", w: 1134, h: 1220 },
    { name: "unfolded foldable (landscape inner)", w: 1220, h: 1134 },
    { name: "tall phone portrait", w: 412, h: 915 },
    { name: "phone landscape", w: 915, h: 412 },
  ];

  for (const { name, w, h } of sizes) {
    it(`jump + whip zones are on-screen and tappable on a ${name} (${w}×${h})`, () => {
      const l = defaultTouchLayout(w, h);
      // Both action zones must sit inside the screen rect…
      for (const b of [l.jumpButton, l.whipButton]) {
        expect(b.x).toBeGreaterThan(0);
        expect(b.x).toBeLessThan(w);
        expect(b.y).toBeGreaterThan(0);
        expect(b.y).toBeLessThan(h);
      }
      // …and in the bottom-right reachable region (right of center, below center).
      expect(l.jumpButton.x).toBeGreaterThan(w / 2);
      expect(l.jumpButton.y).toBeGreaterThan(h / 2);
      // A tap at the jump-zone center registers jump; at the whip-zone center, whip.
      const tapJump = ptr({ startX: l.jumpButton.x, startY: l.jumpButton.y, x: l.jumpButton.x, y: l.jumpButton.y });
      const tapWhip = ptr({ startX: l.whipButton.x, startY: l.whipButton.y, x: l.whipButton.x, y: l.whipButton.y });
      expect(touchToAxes([tapJump], l).jump).toBe(true);
      expect(touchToAxes([tapWhip], l).whip).toBe(true);
    });
  }
});
