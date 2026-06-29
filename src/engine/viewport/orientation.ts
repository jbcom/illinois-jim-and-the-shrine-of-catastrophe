/**
 * Orientation policy — decides whether the device should be locked to landscape
 * for gameplay, driven by the Capacitor device profile (NOT a blanket lock).
 *
 * Phones lock to landscape (a flat side-scroller band can't fill a tall portrait
 * screen without extreme zoom or empty sky). Tablets, UNFOLDED foldables, and
 * desktop have room in either rotation and stay free. A folded foldable cover
 * screen classifies as `foldable` (tall-aspect guard) and stays free too.
 *
 * On NATIVE (Capacitor) we hard-lock via @capacitor/screen-orientation. On WEB we
 * can't force rotation, so we surface a "rotate your device" prompt while a
 * phone is held in portrait during active gameplay (see RotatePrompt in the UI).
 * The rotate prompt does NOT show on the title/landing screen — it only appears
 * once the player has entered the gameplay state.
 */
import { classifyDevice, type DeviceClass } from "@engine/viewport/deviceProfile.ts";
import { isAndroidUA } from "@engine/viewport/ua.ts";
import { Capacitor } from "@capacitor/core";

export interface OrientationState {
  deviceClass: DeviceClass;
  /** Gameplay wants landscape on this device. */
  lockLandscape: boolean;
  /** The viewport is currently portrait (height > width). */
  isPortrait: boolean;
  /** Show the web "rotate your device" prompt (lock wanted + web + portrait). */
  needsRotatePrompt: boolean;
}

/** Classify the current viewport using window size + the Capacitor platform. */
export function readOrientationState(win: {
  innerWidth: number;
  innerHeight: number;
  devicePixelRatio: number;
}): OrientationState {
  const platform = platformOf();
  const profile = classifyDevice({
    width: win.innerWidth,
    height: win.innerHeight,
    dpr: win.devicePixelRatio || 1,
    platform,
    // On the web build (always platform:"web" on Pages), the UA hint lets a large
    // unfolded foldable classify as foldable (free orientation) instead of phone.
    androidUA: isAndroidUA(),
  });
  const isPortrait = win.innerHeight > win.innerWidth;
  const needsRotatePrompt = profile.lockLandscape && platform === "web" && isPortrait;
  return {
    deviceClass: profile.deviceClass,
    lockLandscape: profile.lockLandscape,
    isPortrait,
    needsRotatePrompt,
  };
}

/** Map the Capacitor platform string to our profile's platform union. */
function platformOf(): "ios" | "android" | "web" {
  const p = Capacitor.getPlatform();
  return p === "ios" || p === "android" ? p : "web";
}

/**
 * Apply (or release) the native landscape lock for the given state. No-op on web
 * (the OS won't let a web page force rotation — we show a prompt instead). Safe to
 * call repeatedly; failures (unsupported plugin) are swallowed.
 */
export async function applyNativeOrientationLock(state: OrientationState): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { ScreenOrientation } = await import("@capacitor/screen-orientation");
    if (state.lockLandscape) await ScreenOrientation.lock({ orientation: "landscape" });
    else await ScreenOrientation.unlock();
  } catch {
    // Plugin missing / unsupported surface — gameplay still runs, just unlocked.
  }
}
