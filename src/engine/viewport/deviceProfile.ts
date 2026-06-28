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
   * Whether gameplay should be LOCKED to landscape. A side-scroller's flat band
   * fills a wide screen but can't fill a tall portrait one without extreme zoom
   * or empty sky — so phones lock to landscape (Sonic/Metal Slug-style). Larger
   * screens (tablets, UNFOLDED foldables, desktop) have room in either rotation
   * and stay free. Folded foldables read as `phone`-ish and lock; once unfolded
   * they reclassify to `foldable` and unlock.
   */
  lockLandscape: boolean;
}

/** Gameplay locks to landscape only on phone-class devices. */
export function shouldLockLandscape(deviceClass: DeviceClass): boolean {
  return deviceClass === "phone";
}

/**
 * Classify the device and return a rendering profile.
 *
 * All inputs are CSS pixels. The function is pure: same inputs → same output.
 */
export function classifyDevice(input: DeviceClassifyInput): DeviceProfile {
  const { width, height, platform } = input;

  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);
  const aspectRatio = maxDim / (minDim === 0 ? 1 : minDim);

  const deviceClass = resolveClass(minDim, aspectRatio, platform);

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

function resolveClass(
  minDim: number,
  aspectRatio: number,
  platform: "ios" | "android" | "web",
): DeviceClass {
  if (platform === "web") {
    // On web: large enough viewport → desktop; otherwise phone-like.
    return minDim >= 600 ? "desktop" : "phone";
  }

  if (platform === "android") {
    // Foldable: very tall/narrow aspect (cover-mode) OR very large min-dim.
    // Cover screens on foldables (e.g. Galaxy Z Fold) typically have aspect > 2.4.
    // Regular tall phones (e.g. 9:20 ≈ 2.22) do not reach this threshold.
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
