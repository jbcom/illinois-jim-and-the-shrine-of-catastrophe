import { CONTENT_H, scaleFor, TARGET_WORLD_H } from "@render/actorScale.ts";
import { describe, expect, it } from "vitest";

describe("actorScale", () => {
  it("scales each actor to its target world height by measured content", () => {
    for (const kind of Object.keys(CONTENT_H) as (keyof typeof CONTENT_H)[]) {
      const drawn = CONTENT_H[kind] * scaleFor(kind);
      expect(drawn).toBeCloseTo(TARGET_WORLD_H[kind], 5);
    }
  });

  it("keeps the hero and enemies within a sane on-screen size ratio", () => {
    // The bug was a 4× mismatch (huge Jim, tiny enemies). Every enemy's drawn
    // height must land within 0.6×–1.1× of the hero's — readable as peers, not
    // specks. (Goblin chest-high ≈ 0.8, skeleton ≈ hero, mushroom/eye smaller.)
    const heroH = TARGET_WORLD_H.player;
    // NPCs are adult humans — they belong in the same peer band as enemies, not
    // shrunk to specks next to Jim.
    for (const kind of ["goblin", "skeleton", "mushroom", "flyingEye", "npc"] as const) {
      const ratio = TARGET_WORLD_H[kind] / heroH;
      expect(ratio).toBeGreaterThanOrEqual(0.6);
      expect(ratio).toBeLessThanOrEqual(1.1);
    }
  });

  it("never returns a non-positive or absurd scale", () => {
    for (const kind of Object.keys(CONTENT_H) as (keyof typeof CONTENT_H)[]) {
      const s = scaleFor(kind);
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThan(4);
    }
  });
});
