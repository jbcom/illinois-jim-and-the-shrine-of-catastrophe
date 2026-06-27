/**
 * Unified input manager — merges touch (primary, mobile-first) and keyboard
 * (desktop) into a single PlayerIntent per frame. Browser-only.
 *
 * Touch is the primary control surface; keyboard augments it so the same build
 * plays on a phone or a desktop without a mode switch.
 */
import { createKeyboardInput, type KeyboardInput } from "@engine/input/keyboard.ts";
import { createTouchInput, type TouchInput } from "@engine/input/touch.ts";
import type { PlayerIntent } from "@sim/input/intent.ts";

export interface InputManager {
  poll(): PlayerIntent;
  resize(width: number, height: number): void;
  dispose(): void;
}

export function createInputManager(surface: HTMLElement): InputManager {
  const touch: TouchInput = createTouchInput(surface);
  const keyboard: KeyboardInput = createKeyboardInput();

  return {
    poll(): PlayerIntent {
      const t = touch.poll();
      const k = keyboard.poll();
      // Touch axes take priority when active; otherwise fall back to keyboard.
      const moveX = t.moveX !== 0 ? t.moveX : k.moveX;
      const moveY = t.moveY !== 0 ? t.moveY : k.moveY;
      return {
        moveX,
        moveY,
        jumpPressed: t.jumpPressed || k.jumpPressed,
        jumpHeld: t.jumpHeld || k.jumpHeld,
        whipPressed: t.whipPressed || k.whipPressed,
      };
    },
    resize(width, height) {
      touch.resize(width, height);
    },
    dispose() {
      touch.dispose();
      keyboard.dispose();
    },
  };
}
