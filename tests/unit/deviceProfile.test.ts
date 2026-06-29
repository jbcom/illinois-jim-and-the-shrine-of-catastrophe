import { classifyDevice } from "@engine/viewport/deviceProfile.ts";
import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Phone classification
// ---------------------------------------------------------------------------

describe("classifyDevice — phone", () => {
  it("classifies iOS portrait phone", () => {
    const profile = classifyDevice({ width: 390, height: 844, dpr: 3, platform: "ios" });
    expect(profile.deviceClass).toBe("phone");
    expect(profile.designResolution).toEqual({ width: 480, height: 270 });
    expect(profile.uiScale).toBeGreaterThan(0);
  });

  it("classifies iOS landscape phone", () => {
    const profile = classifyDevice({ width: 844, height: 390, dpr: 3, platform: "ios" });
    expect(profile.deviceClass).toBe("phone");
  });

  it("classifies Android portrait phone (small)", () => {
    const profile = classifyDevice({ width: 360, height: 800, dpr: 2, platform: "android" });
    expect(profile.deviceClass).toBe("phone");
  });

  it("classifies Android landscape phone", () => {
    const profile = classifyDevice({ width: 800, height: 360, dpr: 2, platform: "android" });
    expect(profile.deviceClass).toBe("phone");
  });

  it("applies larger uiScale for phones with minDim >= 414", () => {
    const small = classifyDevice({ width: 375, height: 812, dpr: 3, platform: "ios" });
    const large = classifyDevice({ width: 430, height: 932, dpr: 3, platform: "ios" });
    // 375 < 414 → 1.0; 430 >= 414 → 1.25
    expect(small.uiScale).toBe(1.0);
    expect(large.uiScale).toBe(1.25);
  });
});

// ---------------------------------------------------------------------------
// Tablet classification
// ---------------------------------------------------------------------------

describe("classifyDevice — tablet", () => {
  it("classifies iOS iPad portrait", () => {
    const profile = classifyDevice({ width: 768, height: 1024, dpr: 2, platform: "ios" });
    expect(profile.deviceClass).toBe("tablet");
    expect(profile.designResolution).toEqual({ width: 960, height: 540 });
    expect(profile.uiScale).toBe(1.5);
  });

  it("classifies iOS iPad landscape", () => {
    const profile = classifyDevice({ width: 1024, height: 768, dpr: 2, platform: "ios" });
    expect(profile.deviceClass).toBe("tablet");
  });

  it("classifies Android tablet portrait (minDim 600–899)", () => {
    const profile = classifyDevice({ width: 600, height: 960, dpr: 2, platform: "android" });
    expect(profile.deviceClass).toBe("tablet");
  });

  it("classifies Android tablet landscape", () => {
    const profile = classifyDevice({ width: 1024, height: 600, dpr: 2, platform: "android" });
    expect(profile.deviceClass).toBe("tablet");
  });
});

// ---------------------------------------------------------------------------
// Foldable classification
// ---------------------------------------------------------------------------

describe("classifyDevice — foldable", () => {
  it("classifies tall-aspect Android foldable (cover screen, aspect > 2.1)", () => {
    // Galaxy Z Fold cover: ~344 × 882 → aspect ≈ 2.56
    const profile = classifyDevice({ width: 344, height: 882, dpr: 3, platform: "android" });
    expect(profile.deviceClass).toBe("foldable");
    expect(profile.designResolution).toEqual({ width: 720, height: 405 });
    expect(profile.uiScale).toBe(1.25);
  });

  it("classifies large-minDim Android foldable (inner screen, minDim >= 900)", () => {
    // Galaxy Z Fold inner unfolded: ~1200 × 1812 → minDim 1200
    const profile = classifyDevice({ width: 900, height: 1200, dpr: 2, platform: "android" });
    expect(profile.deviceClass).toBe("foldable");
  });

  it("does NOT classify an iOS device as foldable even with odd aspect", () => {
    const profile = classifyDevice({ width: 300, height: 700, dpr: 3, platform: "ios" });
    // iOS: minDim 300 < 768 → phone
    expect(profile.deviceClass).toBe("phone");
  });
});

// ---------------------------------------------------------------------------
// Desktop classification
// ---------------------------------------------------------------------------

describe("classifyDevice — desktop", () => {
  it("classifies wide web viewport as desktop", () => {
    const profile = classifyDevice({ width: 1440, height: 900, dpr: 2, platform: "web" });
    expect(profile.deviceClass).toBe("desktop");
    expect(profile.designResolution).toEqual({ width: 1280, height: 720 });
    expect(profile.uiScale).toBe(1.0);
  });

  it("classifies narrow web viewport as phone", () => {
    const profile = classifyDevice({ width: 390, height: 844, dpr: 1, platform: "web" });
    expect(profile.deviceClass).toBe("phone");
  });

  it("classifies borderline web viewport (minDim exactly 600) as desktop", () => {
    const profile = classifyDevice({ width: 600, height: 900, dpr: 1, platform: "web" });
    expect(profile.deviceClass).toBe("desktop");
  });
});

// ---------------------------------------------------------------------------
// Deployed WEB build (GitHub Pages) — platform is ALWAYS "web" (no native
// Capacitor), so an Android UA hint + physical pixels must tell a big-screen
// unfolded foldable from a phone. Regression for: unfolded OnePlus Open on the
// web build was misclassified phone → wrongly landscape-locked + cut off.
// ---------------------------------------------------------------------------

describe("classifyDevice — deployed web build (platform 'web')", () => {
  it("an unfolded foldable (OnePlus Open, big inner screen) is NOT phone and is NOT locked", () => {
    // OnePlus Open unfolded ≈ CSS 1134×1220 at DPR 2 → physical min-dim ~2268.
    const profile = classifyDevice({ width: 1220, height: 1134, dpr: 2, platform: "web", androidUA: true });
    expect(profile.deviceClass).not.toBe("phone");
    expect(profile.lockLandscape).toBe(false); // the KEY fix — no rotate prompt
  });

  it("an unfolded foldable in PORTRAIT on web is still free (no rotate prompt)", () => {
    const profile = classifyDevice({ width: 1134, height: 1220, dpr: 2, platform: "web", androidUA: true });
    expect(profile.deviceClass).not.toBe("phone");
    expect(profile.lockLandscape).toBe(false);
  });

  it("a mid-size unfolded foldable (smaller inner screen) classifies foldable, free", () => {
    // A smaller foldable: CSS ~820×740 at DPR 1.5 → physical min ~1110 (foldable band).
    const profile = classifyDevice({ width: 820, height: 740, dpr: 1.5, platform: "web", androidUA: true });
    expect(profile.deviceClass).toBe("foldable");
    expect(profile.lockLandscape).toBe(false);
  });

  it("a real Android phone on web stays phone (small physical screen) and locks landscape", () => {
    // CSS 360×800 at DPR 2 → physical min-dim 720 (< the foldable threshold).
    const profile = classifyDevice({ width: 360, height: 800, dpr: 2, platform: "web", androidUA: true });
    expect(profile.deviceClass).toBe("phone");
    expect(profile.lockLandscape).toBe(true);
  });

  it("a big Android tablet (Pixel Tablet) on web classifies tablet, free orientation", () => {
    // CSS ~1024×768-ish at DPR ~2 → physical min-dim ~1500.
    const profile = classifyDevice({ width: 800, height: 1280, dpr: 2, platform: "web", androidUA: true });
    expect(profile.deviceClass).toBe("tablet");
    expect(profile.lockLandscape).toBe(false);
  });

  it("a desktop browser (no android UA) stays desktop and free", () => {
    const profile = classifyDevice({ width: 1440, height: 900, dpr: 1, platform: "web", androidUA: false });
    expect(profile.deviceClass).toBe("desktop");
    expect(profile.lockLandscape).toBe(false);
  });

  it("a narrow desktop window (no android UA) is phone-like and locks", () => {
    const profile = classifyDevice({ width: 420, height: 760, dpr: 1, platform: "web", androidUA: false });
    expect(profile.deviceClass).toBe("phone");
  });
});

// ---------------------------------------------------------------------------
// Profile shape invariants
// ---------------------------------------------------------------------------

describe("classifyDevice — profile invariants", () => {
  const cases = [
    { width: 390, height: 844, dpr: 3, platform: "ios" as const },
    { width: 1024, height: 768, dpr: 2, platform: "ios" as const },
    { width: 344, height: 882, dpr: 3, platform: "android" as const },
    { width: 1440, height: 900, dpr: 2, platform: "web" as const },
  ];

  for (const input of cases) {
    it(`returns positive design resolution and uiScale for ${input.platform} ${input.width}×${input.height}`, () => {
      const p = classifyDevice(input);
      expect(p.designResolution.width).toBeGreaterThan(0);
      expect(p.designResolution.height).toBeGreaterThan(0);
      expect(p.uiScale).toBeGreaterThan(0);
    });
  }
});
