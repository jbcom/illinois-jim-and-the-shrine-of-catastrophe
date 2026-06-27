/**
 * Player movement tuning constants, in world units (px) and seconds.
 *
 * All gameplay feel lives here so it can be tweaked and snapshot-tested without
 * touching controller logic. Values assume a fixed 1/60 s step.
 */
export interface PlayerTuning {
  readonly width: number;
  readonly height: number;
  /** Horizontal run speed (px/s). */
  readonly runSpeed: number;
  /** Ground acceleration / deceleration (px/s²). */
  readonly accel: number;
  readonly decel: number;
  /** Air acceleration is lower for momentum-y jumps. */
  readonly airAccel: number;
  /** Gravity (px/s²). */
  readonly gravity: number;
  /** Cap on fall speed (px/s). */
  readonly maxFall: number;
  /** Initial upward jump velocity (px/s, positive magnitude). */
  readonly jumpSpeed: number;
  /** Extra gravity when the jump button is released early (variable height). */
  readonly jumpCutMultiplier: number;
  /** Grace window after leaving a ledge during which a jump still fires (s). */
  readonly coyoteTime: number;
  /** Window before landing during which a jump press is remembered (s). */
  readonly jumpBuffer: number;
  /** Whip reach in px and active duration in seconds. */
  readonly whipReach: number;
  readonly whipDuration: number;
}

export const DEFAULT_TUNING: PlayerTuning = Object.freeze({
  width: 12,
  height: 16,
  runSpeed: 130,
  accel: 1100,
  decel: 1400,
  airAccel: 700,
  gravity: 900,
  maxFall: 520,
  jumpSpeed: 330,
  jumpCutMultiplier: 2.4,
  coyoteTime: 0.08,
  jumpBuffer: 0.1,
  whipReach: 26,
  whipDuration: 0.18,
});
