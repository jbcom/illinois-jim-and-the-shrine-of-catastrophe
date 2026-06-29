import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

/**
 * Contract for the Blender → WebP bake pipeline (scripts/bake/*). Every baked
 * character ships, per clip, a `<clip>.webp` horizontal sheet and a `<clip>.json`
 * manifest. The runtime slices the sheet by frame index and positions it by the
 * shared feet anchor, so these invariants must hold or the in-game sprite breaks.
 */

const SPRITES = join(__dirname, "..", "..", "public", "assets", "sprites");
const JIM = join(SPRITES, "jim");
const CLIPS = ["idle", "walk", "run", "jump"] as const;

interface SheetManifest {
  name: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  anchorX: number;
  anchorY: number;
}

function manifest(clip: string): SheetManifest {
  return JSON.parse(readFileSync(join(JIM, `${clip}.json`), "utf8"));
}

describe("Jim baked sprite sheets", () => {
  it("ships a webp + json for every clip", () => {
    for (const clip of CLIPS) {
      expect(existsSync(join(JIM, `${clip}.webp`)), `${clip}.webp`).toBe(true);
      expect(existsSync(join(JIM, `${clip}.json`)), `${clip}.json`).toBe(true);
    }
  });

  it("manifests are well-formed (square tiles, sane anchor, real frames)", () => {
    for (const clip of CLIPS) {
      const m = manifest(clip);
      expect(m.name).toBe(clip);
      expect(m.frameWidth).toBe(m.frameHeight); // square tile
      expect(m.frameCount).toBeGreaterThanOrEqual(8);
      expect(m.fps).toBeGreaterThan(0);
      // anchor: horizontal roughly centred, vertical near the feet (bottom).
      expect(m.anchorX).toBeGreaterThan(0.3);
      expect(m.anchorX).toBeLessThan(0.7);
      expect(m.anchorY).toBeGreaterThan(0.7);
      expect(m.anchorY).toBeLessThanOrEqual(1);
    }
  });

  it("all clips share one tile size (no in-game scale jitter)", () => {
    const sizes = new Set(CLIPS.map((c) => manifest(c).frameWidth));
    expect(sizes.size).toBe(1);
  });

  it("all clips share a feet anchor within tolerance (no snap between animations)", () => {
    // Every clip is baked at one shared ortho scale + ground centre, so the anchor
    // (feet contact + horizontal centre of mass) must agree to within a few percent.
    const base = manifest("walk");
    for (const c of CLIPS) {
      const m = manifest(c);
      expect(Math.abs(m.anchorX - base.anchorX), `${c} anchorX`).toBeLessThanOrEqual(0.05);
      expect(Math.abs(m.anchorY - base.anchorY), `${c} anchorY`).toBeLessThanOrEqual(0.05);
    }
  });

  it("each sheet's pixel width equals frameWidth × frameCount and carries alpha", async () => {
    for (const clip of CLIPS) {
      const m = manifest(clip);
      const meta = await sharp(join(JIM, `${clip}.webp`)).metadata();
      expect(meta.width).toBe(m.frameWidth * m.frameCount);
      expect(meta.height).toBe(m.frameHeight);
      expect(meta.hasAlpha).toBe(true);
    }
  });
});
