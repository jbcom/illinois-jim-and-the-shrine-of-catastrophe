/**
 * Fixed-timestep simulation clock.
 *
 * The sim advances in fixed steps (default 1/60 s) so physics and gameplay are
 * deterministic and frame-rate independent. The renderer interpolates between
 * the last two sim states using `alpha` for smooth visuals at any display rate.
 *
 * Sim/engine code must NOT read `performance.now()` directly (gates.json bans it);
 * wall-clock time enters only here, at the loop boundary, and is converted to a
 * fixed step count the sim consumes.
 */
export interface ClockStep {
  /** Number of fixed sim steps to advance this frame (0..maxSubSteps). */
  steps: number;
  /** Fixed step duration in seconds. */
  dt: number;
  /** Interpolation factor [0,1) between the previous and current sim state. */
  alpha: number;
}

export interface ClockOptions {
  /** Fixed step in seconds. Default 1/60. */
  readonly stepSeconds?: number;
  /** Cap on sub-steps per frame to avoid the "spiral of death". Default 5. */
  readonly maxSubSteps?: number;
}

export interface Clock {
  /** Advance accumulated wall-clock time; returns how many fixed steps to run. */
  tick(nowMs: number): ClockStep;
  /** Reset accumulator (e.g. after a pause) to avoid a time spike. */
  resync(nowMs: number): void;
  readonly stepSeconds: number;
}

export function createClock(options: ClockOptions = {}): Clock {
  const stepSeconds = options.stepSeconds ?? 1 / 60;
  const maxSubSteps = options.maxSubSteps ?? 5;
  const stepMs = stepSeconds * 1000;

  let lastMs = Number.NaN;
  let accumulatorMs = 0;

  return {
    stepSeconds,
    resync(nowMs: number) {
      lastMs = nowMs;
      accumulatorMs = 0;
    },
    tick(nowMs: number): ClockStep {
      if (Number.isNaN(lastMs)) {
        lastMs = nowMs;
      }
      const frameMs = nowMs - lastMs;
      lastMs = nowMs;
      accumulatorMs += frameMs > 0 ? frameMs : 0;

      let steps = 0;
      while (accumulatorMs >= stepMs && steps < maxSubSteps) {
        accumulatorMs -= stepMs;
        steps++;
      }

      // Spiral-of-death guard: if we hit the sub-step cap there is still
      // unconsumed time; drop it rather than carrying a growing backlog.
      if (steps >= maxSubSteps) {
        accumulatorMs = 0;
      }

      return { steps, dt: stepSeconds, alpha: accumulatorMs / stepMs };
    },
  };
}
