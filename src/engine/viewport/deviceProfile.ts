/**
 * Device classification and design-resolution targeting.
 *
 * Pure function — no DOM reads, no side effects. Fully unit-testable in Node.
 *
 * Classification heuristic (all sizes in CSS px):
 *   phone:    min-dim < 600
 *   tablet:   min-dim >= 600 and < 900, or (android with large min-dim and wide aspect)
 *   foldable: android with very tall aspect ratio (> 2.1) or large min-dim >= 900 on android
 *   desktop:  web platform with min-dim >= 600
 */

export type DeviceClass = "phone" | "tablet" | "foldable" | "desktop";

export interface DeviceClassifyInput {
  /** CSS pixel width of the viewport/screen. */
  width: number;
  /** CSS pixel height of the viewport/screen. */
  height: number;
  /** Device pixel ratio (raw — callers cap it before use if needed). */
  dpr: number;
  /** Runtime platform from Capacitor or navigator. */
  platform: "ios" | "android" | "web";
  /**
   * UA hint that the web runtime is on an Android device (a phone OR an unfolded
   * foldable/tablet browser). Lets the web path tell a big-screen Android foldable
   * from a small phone — the deployed Pages build is always `platform: "web"`, so
   * without this an unfolded OnePlus Open would fall into the phone bucket and get
   * wrongly landscape-locked. Defaults false (desktop-style web).
   */
  androidUA?: boolean;
}

/** Design resolution the engine should target for this device class. */
export interface DesignResolution {
  width: number;
  height: number;
}

export interface DeviceProfile {
  deviceClass: DeviceClass;
  /** Safe design resolution to render at (CSS px, portrait-normalised). */
  designResolution: DesignResolution;
  /** Recommended UI scale factor (1 = 100 %). Applied to HUD/UI elements. */
  uiScale: number;
  /**
   * Whether gameplay should be LOCKED to landscape. ALWAYS false now: the portrait
   * serpentine slice-wrap (src/render/bandLayout.ts) wraps the horizontal level into
   * stacked screen-width bands, so a tall portrait screen is FULLY playable — no lock,
   * no "rotate your device" nag. Both orientations are first-class. Kept on the profile
   * for back-compat with the orientation store; it just never asks for a lock anymore.
   * See [[portrait-serpentine-slice-wrap]].
   */
  lockLandscape: boolean;
}

/**
 * Gameplay no longer locks to landscape on any device — the portrait slice-wrap makes
 * upright play first-class. Returns false for every class (signature kept for callers).
 */
export function shouldLockLandscape(_deviceClass: DeviceClass): boolean {
  return false;
}

/**
 * Classify the device and return a rendering profile.
 *
 * All inputs are CSS pixels. The function is pure: same inputs → same output.
 */
export function classifyDevice(input: DeviceClassifyInput): DeviceProfile {
  const { width, height, dpr, platform, androidUA } = input;

  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);
  const aspectRatio = maxDim / (minDim === 0 ? 1 : minDim);
  // Physical screen size = CSS px × DPR. A high-DPR device can report a small CSS
  // viewport yet be a physically LARGE screen (an unfolded foldable in a browser
  // with a mobile viewport meta). Classify big-screen web by physical pixels so a
  // foldable/tablet is never mistaken for a phone (and wrongly landscape-locked).
  const physicalMinDim = minDim * (dpr || 1);

  const deviceClass = resolveClass({ minDim, physicalMinDim, aspectRatio, platform, androidUA });

  return {
    deviceClass,
    designResolution: designResolutionFor(deviceClass),
    uiScale: uiScaleFor(deviceClass, minDim),
    lockLandscape: shouldLockLandscape(deviceClass),
  };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

interface ResolveInput {
  minDim: number;
  physicalMinDim: number;
  aspectRatio: number;
  platform: "ios" | "android" | "web";
  androidUA: boolean | undefined;
}

function resolveClass(input: ResolveInput): DeviceClass {
  const { minDim, physicalMinDim, aspectRatio, platform, androidUA } = input;

  if (platform === "web") {
    // The deployed Pages build is ALWAYS platform:"web" (no native Capacitor), so
    // this branch must tell a phone, a tablet, an unfolded foldable, AND a desktop
    // apart — using PHYSICAL pixels (CSS×DPR), because a high-DPR mobile browser
    // reports a small CSS viewport for a physically large screen.
    if (androidUA) {
      // A mobile browser (phone or unfolded foldable/tablet). Use physical size:
      // a real phone's short edge is < ~1100 physical px; a tablet/unfolded
      // foldable is larger and must NOT be phone-locked.
      if (physicalMinDim >= 1300) return "tablet"; // big slate (Pixel Tablet, iPad-class)
      if (physicalMinDim >= 1000) return "foldable"; // unfolded foldable (OnePlus Open ≈ 1840)
      return "phone";
    }
    // Desktop/laptop browser: large CSS viewport → desktop; a tiny window → phone.
    return minDim >= 600 ? "desktop" : "phone";
  }

  if (platform === "android") {
    // Native Android (Capacitor). Foldable: very tall/narrow cover aspect OR a
    // large min-dim (the unfolded inner screen).
    if (aspectRatio > 2.4 || minDim >= 900) {
      return "foldable";
    }
    if (minDim >= 600) {
      return "tablet";
    }
    return "phone";
  }

  // iOS
  if (minDim >= 768) {
    return "tablet";
  }
  return "phone";
}

function designResolutionFor(deviceClass: DeviceClass): DesignResolution {
  // All resolutions expressed in landscape (wider) orientation so the
  // scaler can derive the correct letterbox regardless of rotation.
  switch (deviceClass) {
    case "phone":
      return { width: 480, height: 270 };
    case "tablet":
      return { width: 960, height: 540 };
    case "foldable":
      return { width: 720, height: 405 };
    case "desktop":
      return { width: 1280, height: 720 };
  }
}

function uiScaleFor(deviceClass: DeviceClass, minDim: number): number {
  switch (deviceClass) {
    case "phone":
      // Scale up UI slightly on larger phones.
      return minDim >= 414 ? 1.25 : 1.0;
    case "tablet":
      return 1.5;
    case "foldable":
      return 1.25;
    case "desktop":
      return 1.0;
  }
}
