import { classifyDevice, shouldLockLandscape } from "@engine/viewport/deviceProfile.ts";
import { readOrientationState } from "@engine/viewport/orientation.ts";
import { describe, expect, it } from "vitest";

/**
 * Orientation policy: phones lock to landscape; tablets, unfolded foldables,
 * and desktop are free in either orientation. The rotate prompt only fires for
 * phones on the web build (we can't OS-lock a web page, so we show the prompt
 * instead). Native Capacitor hard-locks via @capacitor/screen-orientation.
 */
describe("shouldLockLandscape — device class policy", () => {
  it("locks phones to landscape", () => {
    expect(shouldLockLandscape("phone")).toBe(true);
  });

  it("does NOT lock tablets to landscape", () => {
    expect(shouldLockLandscape("tablet")).toBe(false);
  });

  it("does NOT lock foldables to landscape", () => {
    expect(shouldLockLandscape("foldable")).toBe(false);
  });

  it("does NOT lock desktop to landscape", () => {
    expect(shouldLockLandscape("desktop")).toBe(false);
  });
});

describe("classifyDevice — lockLandscape field", () => {
  it("iOS phone in portrait is landscape-locked", () => {
    const p = classifyDevice({ width: 390, height: 844, dpr: 3, platform: "ios" });
    expect(p.deviceClass).toBe("phone");
    expect(p.lockLandscape).toBe(true);
  });

  it("iOS phone in landscape is still landscape-locked (already landscape)", () => {
    const p = classifyDevice({ width: 844, height: 390, dpr: 3, platform: "ios" });
    expect(p.deviceClass).toBe("phone");
    expect(p.lockLandscape).toBe(true);
  });

  it("unfolded foldable (Android native) is free — no landscape lock", () => {
    const p = classifyDevice({ width: 1768, height: 2208, dpr: 2.6, platform: "android" });
    expect(p.deviceClass).toBe("foldable");
    expect(p.lockLandscape).toBe(false);
  });

  it("iPad is free — no landscape lock", () => {
    const p = classifyDevice({ width: 820, height: 1180, dpr: 2, platform: "ios" });
    expect(p.deviceClass).toBe("tablet");
    expect(p.lockLandscape).toBe(false);
  });

  it("desktop is free — no landscape lock", () => {
    const p = classifyDevice({ width: 1440, height: 900, dpr: 1, platform: "web" });
    expect(p.deviceClass).toBe("desktop");
    expect(p.lockLandscape).toBe(false);
  });
});

describe("readOrientationState — rotate prompt", () => {
  it("phone portrait → needsRotatePrompt true", () => {
    // CSS 390×844 (iPhone 15 portrait), DPR 3 — no android UA → web phone
    const state = readOrientationState({ innerWidth: 390, innerHeight: 844, devicePixelRatio: 3 });
    expect(state.isPortrait).toBe(true);
    expect(state.lockLandscape).toBe(true);
    expect(state.needsRotatePrompt).toBe(true);
  });

  it("phone landscape → no rotate prompt", () => {
    const state = readOrientationState({ innerWidth: 844, innerHeight: 390, devicePixelRatio: 3 });
    expect(state.isPortrait).toBe(false);
    expect(state.lockLandscape).toBe(true);
    expect(state.needsRotatePrompt).toBe(false);
  });

  it("unfolded foldable (web + android UA) portrait → no rotate prompt", () => {
    // OnePlus Open unfolded ≈ CSS 1134×1220 at DPR 2
    // readOrientationState calls isAndroidUA() internally; we can only call the
    // public API, so we check via classifyDevice directly.
    const p = classifyDevice({ width: 1134, height: 1220, dpr: 2, platform: "web", androidUA: true });
    expect(p.deviceClass).not.toBe("phone");
    expect(p.lockLandscape).toBe(false);
  });

  it("tablet portrait → no rotate prompt", () => {
    const p = classifyDevice({ width: 820, height: 1180, dpr: 2, platform: "ios" });
    expect(p.deviceClass).toBe("tablet");
    expect(p.lockLandscape).toBe(false);
  });

  it("wide desktop viewport → no rotate prompt", () => {
    const state = readOrientationState({ innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1 });
    expect(state.isPortrait).toBe(false);
    expect(state.lockLandscape).toBe(false);
    expect(state.needsRotatePrompt).toBe(false);
  });
});
