import { classifyDevice, shouldLockLandscape } from "@engine/viewport/deviceProfile.ts";
import { describe, expect, it } from "vitest";

describe("orientation policy", () => {
  it("locks phones to landscape", () => {
    expect(shouldLockLandscape("phone")).toBe(true);
    const iphone = classifyDevice({ width: 390, height: 844, dpr: 3, platform: "ios" });
    expect(iphone.deviceClass).toBe("phone");
    expect(iphone.lockLandscape).toBe(true);
  });

  it("does NOT lock tablets, unfolded foldables, or desktop", () => {
    expect(shouldLockLandscape("tablet")).toBe(false);
    expect(shouldLockLandscape("foldable")).toBe(false);
    expect(shouldLockLandscape("desktop")).toBe(false);

    // An UNFOLDED foldable (large min-dim on android) classifies as foldable → free.
    const unfolded = classifyDevice({ width: 1768, height: 2208, dpr: 2.6, platform: "android" });
    expect(unfolded.deviceClass).toBe("foldable");
    expect(unfolded.lockLandscape).toBe(false);

    // A tablet stays free.
    const ipad = classifyDevice({ width: 820, height: 1180, dpr: 2, platform: "ios" });
    expect(ipad.deviceClass).toBe("tablet");
    expect(ipad.lockLandscape).toBe(false);

    // Desktop web stays free.
    const desktop = classifyDevice({ width: 1440, height: 900, dpr: 1, platform: "web" });
    expect(desktop.deviceClass).toBe("desktop");
    expect(desktop.lockLandscape).toBe(false);
  });

  it("a folded foldable reads as phone-class and locks (unfolds → unlocks)", () => {
    // Folded cover screen: small min-dim → phone on android.
    const folded = classifyDevice({ width: 360, height: 748, dpr: 3, platform: "android" });
    expect(folded.lockLandscape).toBe(true);
  });
});
