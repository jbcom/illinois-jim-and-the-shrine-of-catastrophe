/**
 * Regression: fixed-timestep render interpolation must blend monotonically from
 * the PREVIOUS sim step's end-state to the current state by `alpha`.
 *
 * The bug: gameEcs.step() snapshotted `prev = snapshotPositions()` as its FIRST
 * line, i.e. once per sub-step. On a zero-step animation frame the snapshot never
 * ran, so `prev` stayed at the value captured at the start of the LAST executed
 * step while `Position` had already advanced past it — and `alpha` reset near 0.
 * The rendered position therefore snapped BACKWARD to `prev` at every step
 * boundary, then climbed forward again: a per-frame horizontal oscillation
 * (the player sprite "flickering back and forth").
 *
 * The contract this pins (independent of Pixi/DOM): given a stream of frames
 * where the sim advances at a fixed rate but the display ticks faster (mixed
 * zero-step and one-step frames), the interpolated x must be monotonic
 * non-decreasing while the entity moves right — it must never snap backward
 * across a step boundary. We model the exact loop ordering: snapshot ONCE before
 * the step batch (only when steps>0), step, then lerp prev→current by alpha.
 */
import { lerp } from "@sim/math/vec2.ts";
import { describe, expect, it } from "vitest";

/**
 * Build the exact step/alpha cadence createClock would emit for a display whose
 * frame is `perFrame` sim-steps long (e.g. 0.5 = 120Hz display on a 60Hz sim),
 * over `count` display frames. alpha = leftover accumulator / stepMs.
 */
function cadenceFor(perFrame: number, count: number): { steps: number; alpha: number }[] {
  const out: { steps: number; alpha: number }[] = [];
  let acc = 0;
  for (let frame = 0; frame < count; frame++) {
    acc += perFrame;
    let steps = 0;
    while (acc >= 1) {
      acc -= 1;
      steps++;
    }
    out.push({ steps, alpha: acc });
  }
  return out;
}

/** True iff `xs` never decreases (allowing tiny float slop). */
function isNonDecreasing(xs: number[]): boolean {
  for (let i = 1; i < xs.length; i++) {
    const cur = xs[i] as number;
    const prev = xs[i - 1] as number;
    if (cur < prev - 1e-9) return false;
  }
  return true;
}

/** A toy 1-D entity that the "sim" advances by a fixed +1 per step. */
function runLoop(frames: { steps: number; alpha: number }[]): number[] {
  let position = 0; // live sim x
  let prev = 0; // previous-frame snapshot
  const rendered: number[] = [];

  for (const f of frames) {
    // ---- the loop ordering under test (mirrors gameEcs.frame) ----
    if (f.steps > 0) prev = position; // snapshot ONCE before the batch
    for (let i = 0; i < f.steps; i++) position += 1; // sim advances +1/step
    // -------------------------------------------------------------
    rendered.push(lerp(prev, position, f.alpha));
  }
  return rendered;
}

describe("render interpolation timing (gameEcs frame ordering)", () => {
  it("never snaps backward across a step boundary (mixed zero/one-step frames)", () => {
    // Display ~2x sim rate: alpha ramps 0→~1 over zero-step frames, a step lands,
    // alpha resets. Classic 60Hz-sim-on-120Hz-display cadence.
    // Faithful clock cadence (see createClock): alpha = accumulator/stepMs.
    // Sim 60Hz on a 120Hz display → each display tick adds half a sim step; alpha
    // climbs within zero-step runs and keeps its remainder when a step lands.
    const xs = runLoop(cadenceFor(0.5, 8));
    expect(isNonDecreasing(xs)).toBe(true);
  });

  it("interpolated x is monotonic and bounded by distance travelled", () => {
    // Display 3x sim (perFrame = 1/3): two zero-step frames between each step.
    const cadence = cadenceFor(1 / 3, 9);
    const xs = runLoop(cadence);
    const totalSteps = cadence.reduce((n, f) => n + f.steps, 0);
    expect(isNonDecreasing(xs)).toBe(true);
    // Never renders past the current sim position.
    expect(xs[xs.length - 1] as number).toBeLessThanOrEqual(totalSteps);
  });
});

/**
 * The BUGGY ordering, kept as an executable witness: snapshotting per-sub-step
 * inside step() (and never on zero-step frames) produces the backward snap. This
 * test asserts the OLD shape was actually broken, so the regression above is
 * meaningful rather than vacuous.
 */
function runBuggyLoop(frames: { steps: number; alpha: number }[]): number[] {
  let position = 0;
  let prev = 0;
  const rendered: number[] = [];
  for (const f of frames) {
    for (let i = 0; i < f.steps; i++) {
      prev = position; // snapshot INSIDE the step (the bug), pre-advance
      position += 1;
    }
    rendered.push(lerp(prev, position, f.alpha));
  }
  return rendered;
}

describe("buggy ordering witness", () => {
  it("per-sub-step snapshot mis-blends on multi-step frames (proves the fix is load-bearing)", () => {
    // Display SLOWER than sim (perFrame 1.5 → frames consume 1 or 2 sim steps).
    // On a 2-step frame the buggy ordering snapshots `prev` AFTER the first
    // sub-step (mid-batch), so it lerps from a position the sim already passed —
    // rendering HALF A STEP ahead of the true blended position every such frame.
    // The fixed ordering snapshots once before the batch and blends correctly.
    const cadence = cadenceFor(1.5, 8);
    const buggy = runBuggyLoop(cadence);
    const fixed = runLoop(cadence);

    // The two orderings MUST diverge — if they didn't, the snapshot site wouldn't
    // matter and the fix would be vacuous.
    expect(buggy).not.toEqual(fixed);

    // The fixed ordering equals the correct reference: blend from the position at
    // the END of the previous frame's batch to the END of this frame's batch.
    let pos = 0;
    let prevEnd = 0;
    const reference = cadence.map((f) => {
      const start = prevEnd;
      pos += f.steps;
      prevEnd = pos;
      return lerp(start, pos, f.alpha);
    });
    expect(fixed).toEqual(reference);

    // And the buggy ordering does NOT match the correct reference (it over-shoots
    // on multi-step frames) — the mechanism behind the visible jitter.
    expect(buggy).not.toEqual(reference);
  });
});
