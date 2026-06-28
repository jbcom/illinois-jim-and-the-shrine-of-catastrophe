/**
 * Regression: a pointer whose `pointerup` is lost must not leak a persistent
 * joystick tilt into the run.
 *
 * The live bug: tapping through the opening cutscene ends with a `pointerdown`
 * on the LEFT half of the screen (the relative-joystick zone) that bubbles to
 * the game host. The cutscene `<button>` overlay calls `onComplete()` on that
 * tap and React unmounts it mid-gesture, so the matching `pointerup` is never
 * delivered to the host's touch listener. The pointer stays in the tracked set,
 * `touchToAxes` reads a non-zero `moveX` from its drift, and the player walks
 * right off the village spawn into the first enemy — dying and losing a life
 * every ~2s with the user "standing still". The sim never sees this because the
 * sim tests feed PlayerIntent directly and never exercise the DOM touch adapter.
 *
 * The fix (engine/input/touch.ts + inputManager.ts): a `clear()` that drops all
 * tracked pointers, called by the engine on every pause→play boundary
 * (gameEcs.setPaused(false)/restart) — a fresh play session starts with no held
 * pointers regardless of any lost `pointerup`.
 */
import { createInputManager } from "@engine/input/inputManager.ts";
import { createTouchInput } from "@engine/input/touch.ts";
import { afterEach, describe, expect, it } from "vitest";

function makeSurface(w = 800, h = 400): HTMLDivElement {
  const surface = document.createElement("div");
  // jsdom/headless has no layout, so pin a deterministic client rect.
  surface.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: w, bottom: h, width: w, height: h, x: 0, y: 0 }) as DOMRect;
  Object.defineProperty(surface, "clientWidth", { value: w, configurable: true });
  Object.defineProperty(surface, "clientHeight", { value: h, configurable: true });
  document.body.appendChild(surface);
  return surface;
}

/** A left-half pointer that goes down then drifts right — and is NEVER released. */
function leakLeftPointer(surface: HTMLElement, w = 800, h = 400): void {
  const startX = w * 0.2;
  const y = h * 0.5;
  surface.dispatchEvent(
    new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, clientX: startX, clientY: y }),
  );
  surface.dispatchEvent(
    new PointerEvent("pointermove", {
      bubbles: true,
      pointerId: 1,
      clientX: startX + w * 0.25,
      clientY: y,
    }),
  );
}

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const h of hosts.splice(0)) h.remove();
});

describe("touch input — leaked pointer (lost pointerup)", () => {
  it("a left-half pointer with no pointerup tilts the joystick (the bug)", () => {
    const surface = makeSurface();
    hosts.push(surface);
    const touch = createTouchInput(surface);

    leakLeftPointer(surface);

    // The phantom pointer drives a sustained rightward move — the mechanism
    // that walked Jim into the enemy.
    expect(touch.poll().moveX).toBeGreaterThan(0);
    touch.dispose();
  });

  it("clear() drops the phantom pointer so the next run starts neutral (the fix)", () => {
    const surface = makeSurface();
    hosts.push(surface);
    const touch = createTouchInput(surface);

    leakLeftPointer(surface);
    expect(touch.poll().moveX).toBeGreaterThan(0); // leaked

    touch.clear();

    // After clear, no held pointer → no movement, even though no pointerup ever
    // arrived. This is what gameEcs.setPaused(false) calls on the cutscene→play
    // boundary.
    expect(touch.poll().moveX).toBe(0);
    touch.dispose();
  });

  it("InputManager.clear() resets touch movement to neutral", () => {
    const surface = makeSurface();
    hosts.push(surface);
    const input = createInputManager(surface);

    leakLeftPointer(surface);
    expect(input.poll().moveX).toBeGreaterThan(0);

    input.clear();
    expect(input.poll().moveX).toBe(0);
    input.dispose();
  });
});
