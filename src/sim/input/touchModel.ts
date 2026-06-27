/**
 * Pure touch→intent model. No DOM — takes abstract pointer state and a layout,
 * returns the movement axis and which action buttons are down. The DOM adapter
 * (engine/input/touch.ts) feeds real pointer coordinates into this so the
 * mapping logic is unit-testable in the node project.
 */
import { clamp } from "@sim/math/vec2.ts";

export interface TouchLayout {
  /** Screen size in CSS px (post-resize). */
  readonly screenW: number;
  readonly screenH: number;
  /** Radius of the virtual joystick deadzone→full-tilt, in px. */
  readonly stickRadius: number;
  /** Action button centers + radius (right side of the screen). */
  readonly jumpButton: { x: number; y: number; r: number };
  readonly whipButton: { x: number; y: number; r: number };
}

export interface Pointer {
  readonly id: number;
  /** Where the pointer first went down (anchor for the relative joystick). */
  readonly startX: number;
  readonly startY: number;
  /** Current position. */
  readonly x: number;
  readonly y: number;
}

export interface TouchAxes {
  readonly moveX: number;
  readonly moveY: number;
  readonly jump: boolean;
  readonly whip: boolean;
}

const within = (x: number, y: number, b: { x: number; y: number; r: number }): boolean => {
  const dx = x - b.x;
  const dy = y - b.y;
  return dx * dx + dy * dy <= b.r * b.r;
};

/** A default layout derived from the current screen size (right-handed). */
export function defaultTouchLayout(screenW: number, screenH: number): TouchLayout {
  const r = Math.max(36, Math.min(screenW, screenH) * 0.09);
  const margin = r * 1.5;
  return {
    screenW,
    screenH,
    stickRadius: Math.max(48, Math.min(screenW, screenH) * 0.12),
    jumpButton: { x: screenW - margin, y: screenH - margin, r },
    whipButton: { x: screenW - margin * 2.4, y: screenH - margin * 0.8, r },
  };
}

/**
 * Map active pointers to movement + actions.
 * Left half of the screen acts as a relative joystick (anchored at touch-down);
 * the right half hosts the jump/whip buttons.
 */
export function touchToAxes(pointers: readonly Pointer[], layout: TouchLayout): TouchAxes {
  let moveX = 0;
  let moveY = 0;
  let jump = false;
  let whip = false;

  for (const p of pointers) {
    if (within(p.x, p.y, layout.jumpButton)) {
      jump = true;
      continue;
    }
    if (within(p.x, p.y, layout.whipButton)) {
      whip = true;
      continue;
    }
    // Movement comes from pointers that started on the left half.
    if (p.startX < layout.screenW / 2) {
      const dx = p.x - p.startX;
      const dy = p.y - p.startY;
      moveX = clamp(dx / layout.stickRadius, -1, 1);
      moveY = clamp(dy / layout.stickRadius, -1, 1);
    }
  }

  return { moveX, moveY, jump, whip };
}
