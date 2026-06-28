/**
 * Keyboard input source (desktop fallback). Browser-only.
 *
 * Tracks held keys and edge presses, exposing them as a partial PlayerIntent
 * each frame. The game merges this with touch input so either works.
 */
import type { PlayerIntent } from "@sim/input/intent.ts";

const LEFT = new Set(["ArrowLeft", "KeyA"]);
const RIGHT = new Set(["ArrowRight", "KeyD"]);
const UP = new Set(["ArrowUp", "KeyW"]);
const DOWN = new Set(["ArrowDown", "KeyS"]);
const JUMP = new Set(["Space", "KeyZ", "KeyK"]);
const WHIP = new Set(["KeyX", "KeyJ", "ShiftLeft"]);

export interface KeyboardInput {
  /** Read the current intent and clear edge flags for the next frame. */
  poll(): PlayerIntent;
  /** Drop all held keys + edge state (e.g. on a pause→play boundary). */
  clear(): void;
  dispose(): void;
}

export function createKeyboardInput(target: EventTarget = window): KeyboardInput {
  const held = new Set<string>();
  let jumpPressed = false;
  let whipPressed = false;

  const onDown = (e: Event) => {
    const code = (e as KeyboardEvent).code;
    if (held.has(code)) return; // ignore auto-repeat
    held.add(code);
    if (JUMP.has(code)) jumpPressed = true;
    if (WHIP.has(code)) whipPressed = true;
  };
  const onUp = (e: Event) => {
    held.delete((e as KeyboardEvent).code);
  };

  target.addEventListener("keydown", onDown);
  target.addEventListener("keyup", onUp);

  const anyHeld = (set: Set<string>): boolean => {
    for (const code of set) if (held.has(code)) return true;
    return false;
  };

  return {
    poll(): PlayerIntent {
      const moveX = (anyHeld(RIGHT) ? 1 : 0) - (anyHeld(LEFT) ? 1 : 0);
      const moveY = (anyHeld(DOWN) ? 1 : 0) - (anyHeld(UP) ? 1 : 0);
      const intent: PlayerIntent = {
        moveX,
        moveY,
        jumpPressed,
        jumpHeld: anyHeld(JUMP),
        whipPressed,
      };
      jumpPressed = false;
      whipPressed = false;
      return intent;
    },
    clear() {
      held.clear();
      jumpPressed = false;
      whipPressed = false;
    },
    dispose() {
      target.removeEventListener("keydown", onDown);
      target.removeEventListener("keyup", onUp);
      held.clear();
    },
  };
}
