import { aspectImagePath, aspectKeyFor } from "@ui/aspectImage.ts";
import { describe, expect, it } from "vitest";

describe("aspectImage", () => {
  it("picks landscape / portrait / square by viewport ratio", () => {
    expect(aspectKeyFor(844, 390)).toBe("16x9"); // landscape phone
    expect(aspectKeyFor(390, 844)).toBe("9x16"); // portrait phone
    expect(aspectKeyFor(820, 820)).toBe("1x1"); // square-ish (foldable)
    expect(aspectKeyFor(1440, 900)).toBe("16x9"); // desktop
  });

  it("builds the variant path from a base + key", () => {
    expect(aspectImagePath("/assets/cutscenes/cut-01-village", "9x16")).toBe(
      "/assets/cutscenes/cut-01-village-9x16.png",
    );
  });
});
