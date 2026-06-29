import { hudDisplay, MAX_GEM_LIVES } from "@ui/hudDisplay.ts";
import { describe, expect, it } from "vitest";

describe("hudDisplay — score readout", () => {
  it("zero-pads the score to six arcade digits", () => {
    expect(hudDisplay(0, 3).scoreText).toBe("000000");
    expect(hudDisplay(1250, 3).scoreText).toBe("001250");
    expect(hudDisplay(999999, 3).scoreText).toBe("999999");
  });

  it("does not truncate a score that exceeds six digits", () => {
    expect(hudDisplay(1234567, 3).scoreText).toBe("1234567");
  });

  it("floors fractional scores and never goes negative", () => {
    expect(hudDisplay(42.9, 3).scoreText).toBe("000042");
    expect(hudDisplay(-50, 3).scoreText).toBe("000000");
  });
});

describe("hudDisplay — lives as idol gems", () => {
  it("draws one gem per life up to the gem cap", () => {
    expect(hudDisplay(0, 3)).toMatchObject({ gemCount: 3, collapsed: false, lives: 3 });
    expect(hudDisplay(0, MAX_GEM_LIVES)).toMatchObject({ gemCount: MAX_GEM_LIVES, collapsed: false });
  });

  it("collapses to a single gem + count past the cap so the bar never overflows", () => {
    const d = hudDisplay(0, MAX_GEM_LIVES + 1);
    expect(d.collapsed).toBe(true);
    expect(d.gemCount).toBe(0); // the JSX draws one gem + "×N" when collapsed
    expect(d.lives).toBe(MAX_GEM_LIVES + 1);
  });

  it("clamps negative lives to zero (no gems, not collapsed)", () => {
    expect(hudDisplay(0, -2)).toMatchObject({ gemCount: 0, collapsed: false, lives: 0 });
  });

  it("floors a fractional life total", () => {
    expect(hudDisplay(0, 2.8).lives).toBe(2);
  });
});
