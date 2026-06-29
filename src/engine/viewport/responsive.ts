/**
 * Responsive viewport runtime adapter.
 *
 * The ONLY file in `src/engine/viewport/` that reads DOM state or calls
 * Capacitor plugins. `deviceProfile.ts` and `scaler.ts` remain pure.
 *
 * Responsibilities:
 *  - Read `window.innerWidth/Height` and `devicePixelRatio`.
 *  - Query `@capacitor/device` for platform.
 *  - Query `@capacitor/screen-orientation` for current orientation.
 *  - Debounce resize / orientationchange / ScreenOrientation events.
 *  - Set the canvas backing-store size to `cssSize × dpr` (dpr capped at 2).
 *  - Recompute `DeviceProfile` and `ViewportGeometry` on every change.
 *  - Expose `current()`, `onChange(cb)`, and `dispose()`.
 */

import { Device } from "@capacitor/device";
import { ScreenOrientation } from "@capacitor/screen-orientation";
import type { DeviceProfile } from "@engine/viewport/deviceProfile.ts";
import { classifyDevice } from "@engine/viewport/deviceProfile.ts";
import type { ViewportGeometry } from "@engine/viewport/scaler.ts";
import { computeViewport } from "@engine/viewport/scaler.ts";
import { isAndroidUA } from "@engine/viewport/ua.ts";

/** Maximum device-pixel-ratio applied to the canvas backing-store. */
const MAX_DPR = 2;

/** Debounce delay in ms for resize / orientation events. */
const DEBOUNCE_MS = 80;

export interface ResponsiveViewportState {
  profile: DeviceProfile;
  viewport: ViewportGeometry;
}

export interface ResponsiveViewport {
  /** Return the latest computed state. */
  current(): ResponsiveViewportState;
  /**
   * Register a callback that fires whenever the viewport is recomputed.
   * Returns an unsubscribe function.
   */
  onChange(cb: (state: ResponsiveViewportState) => void): () => void;
  /** Remove all listeners and clean up. */
  dispose(): void;
}

/**
 * Create a responsive viewport manager bound to `canvas`.
 *
 * Performs an immediate synchronous calculation for the initial state, then
 * re-evaluates asynchronously whenever the window or orientation changes.
 */
export function createResponsiveViewport(canvas: HTMLCanvasElement): ResponsiveViewport {
  // Subscribers.
  const listeners = new Set<(state: ResponsiveViewportState) => void>();

  // Latest computed state — initialised synchronously with a web-platform guess
  // before the async Capacitor query resolves.
  let state: ResponsiveViewportState = computeState("web", canvas);

  // Kick off the async platform/orientation query immediately.
  void refreshAsync();

  // --- DOM event wiring ---

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  function scheduleRefresh(): void {
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined;
      void refreshAsync();
    }, DEBOUNCE_MS);
  }

  window.addEventListener("resize", scheduleRefresh, { passive: true });
  window.addEventListener("orientationchange", scheduleRefresh, { passive: true });

  // Capacitor ScreenOrientation listener handle (async setup).
  let soListenerRemover: (() => void) | undefined;

  ScreenOrientation.addListener("screenOrientationChange", scheduleRefresh)
    .then((handle) => {
      soListenerRemover = () => {
        void handle.remove();
      };
    })
    .catch(() => {
      // Plugin unavailable (e.g. web without polyfill) — window events suffice.
    });

  // --- Core async refresh ---

  async function refreshAsync(): Promise<void> {
    const platform = await resolvePlatform();
    const next = computeState(platform, canvas);
    state = next;
    for (const cb of listeners) {
      cb(next);
    }
  }

  // --- Public API ---

  return {
    current(): ResponsiveViewportState {
      return state;
    },

    onChange(cb: (state: ResponsiveViewportState) => void): () => void {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },

    dispose(): void {
      if (debounceTimer !== undefined) {
        clearTimeout(debounceTimer);
        debounceTimer = undefined;
      }
      window.removeEventListener("resize", scheduleRefresh);
      window.removeEventListener("orientationchange", scheduleRefresh);
      soListenerRemover?.();
      listeners.clear();
    },
  };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

async function resolvePlatform(): Promise<"ios" | "android" | "web"> {
  try {
    const info = await Device.getInfo();
    const p = info.platform;
    if (p === "ios" || p === "android") {
      return p;
    }
  } catch {
    // Capacitor not available or web stub threw.
  }
  return "web";
}


function computeState(
  platform: "ios" | "android" | "web",
  canvas: HTMLCanvasElement,
): ResponsiveViewportState {
  const cssW = window.innerWidth;
  const cssH = window.innerHeight;
  const rawDpr = window.devicePixelRatio ?? 1;
  const dpr = Math.min(rawDpr, MAX_DPR);

  // Classify with the RAW dpr (physical-size signal) + a UA android hint, so the
  // web build can tell an unfolded foldable from a phone (the deployed Pages build
  // is always platform:"web"). The capped `dpr` is still used for the backing store.
  const profile = classifyDevice({ width: cssW, height: cssH, dpr: rawDpr, platform, androidUA: isAndroidUA() });

  // Set canvas backing-store size.
  const backingW = Math.round(cssW * dpr);
  const backingH = Math.round(cssH * dpr);
  canvas.width = backingW;
  canvas.height = backingH;

  // CSS display size stays at the CSS pixel dimension.
  canvas.style.width = `${String(cssW)}px`;
  canvas.style.height = `${String(cssH)}px`;

  const viewport = computeViewport(profile, backingW, backingH);

  return { profile, viewport };
}
