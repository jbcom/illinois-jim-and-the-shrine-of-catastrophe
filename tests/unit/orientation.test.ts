import { classifyDevice, shouldLockLandscape } from "@engine/viewport/deviceProfile.ts";
import { readOrientationState } from "@engine/viewport/orientation.ts";
import { describe, expect, it } from "vitest";

/**
 * Orientation policy AFTER the portrait serpentine slice-wrap: NOTHING locks to
 * landscape anymore — the wrap (src/render/bandLayout.ts) makes a tall portrait screen
 * fully playable, so every device is free in either rotation and the "rotate your
 * device" prompt never shows. Device CLASSIFICATION still matters (design resolution /
 * band count), only the lock is gone.
 */
describe("orientation policy (portrait slice-wrap — no landscape lock)", () => {
  it("never locks ANY device class to landscape", () => {
    expect(shouldLockLandscape("phone")).toBe(false);
    expect(shouldLockLandscape("tablet")).toBe(false);
    expect(shouldLockLandscape("foldable")).toBe(false);
    expect(shouldLockLandscape("desktop")).toBe(false);
  });

  it("classifies devices correctly but leaves them all unlocked", () => {
    const iphone = classifyDevice({ width: 390, height: 844, dpr: 3, platform: "ios" });
    expect(iphone.deviceClass).toBe("phone");
    expect(iphone.lockLandscape).toBe(false);

    const unfolded = classifyDevice({ width: 1768, height: 2208, dpr: 2.6, platform: "android" });
    expect(unfolded.deviceClass).toBe("foldable");
    expect(unfolded.lockLandscape).toBe(false);

    const ipad = classifyDevice({ width: 820, height: 1180, dpr: 2, platform: "ios" });
    expect(ipad.deviceClass).toBe("tablet");
    expect(ipad.lockLandscape).toBe(false);

    const desktop = classifyDevice({ width: 1440, height: 900, dpr: 1, platform: "web" });
    expect(desktop.deviceClass).toBe("desktop");
    expect(desktop.lockLandscape).toBe(false);
  });

  it("a web phone in portrait is PLAYABLE (slice-wrap) — no rotate prompt", () => {
    const state = readOrientationState({ innerWidth: 390, innerHeight: 844, devicePixelRatio: 3 });
    expect(state.isPortrait).toBe(true);
    expect(state.lockLandscape).toBe(false);
    expect(state.needsRotatePrompt).toBe(false);
  });

  it("a wide desktop viewport is free, no prompt", () => {
    const state = readOrientationState({ innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1 });
    expect(state.isPortrait).toBe(false);
    expect(state.lockLandscape).toBe(false);
    expect(state.needsRotatePrompt).toBe(false);
  });
});
