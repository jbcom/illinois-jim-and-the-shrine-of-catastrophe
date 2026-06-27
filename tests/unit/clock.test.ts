import { createClock } from "@engine/clock.ts";
import { describe, expect, it } from "vitest";

describe("createClock", () => {
  it("runs exactly one step after one step-duration elapses", () => {
    const clock = createClock({ stepSeconds: 1 / 60 });
    clock.tick(0); // prime lastMs
    const r = clock.tick(1000 / 60);
    expect(r.steps).toBe(1);
    expect(r.dt).toBeCloseTo(1 / 60);
  });

  it("accumulates multiple steps for a long frame", () => {
    const clock = createClock({ stepSeconds: 1 / 60, maxSubSteps: 10 });
    clock.tick(0);
    const r = clock.tick((1000 / 60) * 3.5);
    expect(r.steps).toBe(3);
    // 0.5 of a step remains → alpha ≈ 0.5
    expect(r.alpha).toBeCloseTo(0.5, 1);
  });

  it("clamps runaway frames to maxSubSteps (no spiral of death)", () => {
    const clock = createClock({ stepSeconds: 1 / 60, maxSubSteps: 5 });
    clock.tick(0);
    const r = clock.tick(10_000); // 10s gap
    expect(r.steps).toBe(5);
  });

  it("carries fractional time across frames", () => {
    const clock = createClock({ stepSeconds: 1 / 60 });
    clock.tick(0);
    const stepMs = 1000 / 60;
    // Two frames of 0.6 steps each = 1.2 steps total → one step, 0.2 remainder.
    const r1 = clock.tick(stepMs * 0.6);
    expect(r1.steps).toBe(0);
    const r2 = clock.tick(stepMs * 1.2);
    expect(r2.steps).toBe(1);
  });

  it("resync() drops accumulated time after a pause", () => {
    const clock = createClock({ stepSeconds: 1 / 60 });
    clock.tick(0);
    clock.resync(5000);
    const r = clock.tick(5000 + 1000 / 60);
    expect(r.steps).toBe(1); // not hundreds of steps from the 5s gap
  });

  it("is deterministic for an identical tick schedule", () => {
    const schedule = [0, 16, 33, 50, 70, 999, 1000];
    const run = () => {
      const c = createClock();
      return schedule.map((t) => c.tick(t).steps);
    };
    expect(run()).toEqual(run());
  });
});
