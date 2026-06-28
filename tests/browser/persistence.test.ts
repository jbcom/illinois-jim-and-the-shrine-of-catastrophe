import { loadBestScore, loadProgress, saveBestScore, saveProgress } from "@ui/persistence.ts";
import { Preferences } from "@capacitor/preferences";
import { beforeEach, describe, expect, it } from "vitest";

describe("persistence (best score + progress)", () => {
  beforeEach(async () => {
    await Preferences.clear();
  });

  it("returns 0 when nothing is stored", async () => {
    expect(await loadBestScore()).toBe(0);
    expect(await loadProgress()).toBe(0);
  });

  it("saves and reloads the best score, keeping the max", async () => {
    expect(await saveBestScore(1200)).toBe(1200);
    expect(await loadBestScore()).toBe(1200);
    // A lower score never lowers the stored best.
    expect(await saveBestScore(500)).toBe(1200);
    expect(await loadBestScore()).toBe(1200);
    // A higher score raises it.
    expect(await saveBestScore(3000)).toBe(3000);
    expect(await loadBestScore()).toBe(3000);
  });

  it("tracks the highest level reached (monotonic)", async () => {
    await saveProgress(2);
    expect(await loadProgress()).toBe(2);
    await saveProgress(1); // lower — ignored
    expect(await loadProgress()).toBe(2);
    await saveProgress(4);
    expect(await loadProgress()).toBe(4);
  });
});
