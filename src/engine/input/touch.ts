/**
 * DOM pointer adapter → pure touch model. Browser-only.
 *
 * Listens to pointer events on the game surface, tracks active pointers with
 * their down-anchor, and runs them through touchToAxes() to produce intent.
 * Uses Pointer Events so mouse + touch + pen all funnel through one path.
 */

import type { PlayerIntent } from "@sim/input/intent.ts";
import {
  defaultTouchLayout,
  type Pointer,
  type TouchLayout,
  touchToAxes,
} from "@sim/input/touchModel.ts";

export interface TouchInput {
  poll(): PlayerIntent;
  setLayout(layout: TouchLayout): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export function createTouchInput(surface: HTMLElement): TouchInput {
  let layout = defaultTouchLayout(surface.clientWidth || 1, surface.clientHeight || 1);
  const pointers = new Map<number, Pointer>();
  // Edge flags: true only on the frame an action button first goes down.
  let prevJump = false;
  let prevWhip = false;
  let jumpPressed = false;
  let whipPressed = false;

  const localPoint = (e: PointerEvent): { x: number; y: number } => {
    const rect = surface.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: PointerEvent) => {
    surface.setPointerCapture?.(e.pointerId);
    const { x, y } = localPoint(e);
    pointers.set(e.pointerId, { id: e.pointerId, startX: x, startY: y, x, y });
    e.preventDefault();
  };
  const onMove = (e: PointerEvent) => {
    const existing = pointers.get(e.pointerId);
    if (!existing) return;
    const { x, y } = localPoint(e);
    pointers.set(e.pointerId, { ...existing, x, y });
  };
  const onUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    surface.releasePointerCapture?.(e.pointerId);
  };

  surface.addEventListener("pointerdown", onDown);
  surface.addEventListener("pointermove", onMove);
  surface.addEventListener("pointerup", onUp);
  surface.addEventListener("pointercancel", onUp);

  return {
    poll(): PlayerIntent {
      const axes = touchToAxes([...pointers.values()], layout);
      jumpPressed = axes.jump && !prevJump;
      whipPressed = axes.whip && !prevWhip;
      prevJump = axes.jump;
      prevWhip = axes.whip;
      return {
        moveX: axes.moveX,
        moveY: axes.moveY,
        jumpPressed,
        jumpHeld: axes.jump,
        whipPressed,
      };
    },
    setLayout(next) {
      layout = next;
    },
    resize(width, height) {
      layout = defaultTouchLayout(width, height);
    },
    dispose() {
      surface.removeEventListener("pointerdown", onDown);
      surface.removeEventListener("pointermove", onMove);
      surface.removeEventListener("pointerup", onUp);
      surface.removeEventListener("pointercancel", onUp);
      pointers.clear();
    },
  };
}
