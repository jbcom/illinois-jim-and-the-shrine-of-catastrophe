/**
 * Orientation store — the UI-facing bridge to the engine's orientation policy.
 * Keeps the device-classification + native-lock logic in the engine
 * (@engine/viewport/orientation.ts) while exposing a single React hook so
 * components in src/ui/** read orientation through this store instead of
 * importing engine internals directly.
 *
 * It owns the resize/orientationchange listener, debounces to real changes, and
 * applies the native screen-orientation lock as a side effect.
 */
import {
  applyNativeOrientationLock,
  type OrientationState,
  readOrientationState,
} from "@engine/viewport/orientation.ts";
import { useSyncExternalStore } from "react";

let snapshot: OrientationState = readOrientationState(window);
const listeners = new Set<() => void>();
let wired = false;

function sameState(a: OrientationState, b: OrientationState): boolean {
  return (
    a.deviceClass === b.deviceClass &&
    a.lockLandscape === b.lockLandscape &&
    a.isPortrait === b.isPortrait &&
    a.needsRotatePrompt === b.needsRotatePrompt
  );
}

/** Recompute on resize/rotate; only notify + re-lock when state actually changes. */
function sync(): void {
  const next = readOrientationState(window);
  if (sameState(next, snapshot)) return;
  snapshot = next;
  void applyNativeOrientationLock(next);
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!wired) {
    wired = true;
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    // Apply the initial native lock once a consumer mounts.
    void applyNativeOrientationLock(snapshot);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      wired = false;
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    }
  };
}

/** React hook: the current orientation state, updated on resize/rotate. */
export function useOrientation(): OrientationState {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}
