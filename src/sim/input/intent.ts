/**
 * Player intent — the abstract control signal the sim consumes each step.
 *
 * The input layer (touch virtual controls, keyboard, gamepad) all funnel into
 * this single shape, so the sim never knows or cares which device produced it.
 * Edge flags (`jumpPressed`) are true only on the step the button went down;
 * `jumpHeld` reflects the sustained state (for variable jump height).
 */
export interface PlayerIntent {
  /** Horizontal axis, -1 (left) .. 1 (right). */
  readonly moveX: number;
  /** Vertical axis for ladders/aim, -1 (up) .. 1 (down). */
  readonly moveY: number;
  readonly jumpPressed: boolean;
  readonly jumpHeld: boolean;
  readonly whipPressed: boolean;
}

export const NEUTRAL_INTENT: PlayerIntent = Object.freeze({
  moveX: 0,
  moveY: 0,
  jumpPressed: false,
  jumpHeld: false,
  whipPressed: false,
});
