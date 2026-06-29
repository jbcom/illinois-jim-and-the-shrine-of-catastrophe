import { FIRST_LEVEL_ID, levelBundle } from "@render/levels/registry.ts";
import { describe, expect, it } from "vitest";

/**
 * The GenAI Level 1 (halward-s-reach) is registered as the live first level via the
 * genaiBundle adapter (BuiltSchemaLevel → GameLevel + baked-prop artPainting). Lock
 * the adapter's contract so the live game keeps booting the GenAI level correctly.
 */
describe("GenAI level bundle (halward-s-reach as the live first level)", () => {
  it("is the first level", () => {
    expect(FIRST_LEVEL_ID).toBe("halward-s-reach");
  });

  it("carries a GameLevel sim (collision map + spawn + goal)", () => {
    const b = levelBundle(FIRST_LEVEL_ID);
    expect(b.sim.id).toBe("halward-s-reach");
    expect(b.sim.map.width).toBeGreaterThan(0);
    expect(b.sim.map.height).toBeGreaterThan(0);
    expect(Number.isFinite(b.sim.spawnX)).toBe(true);
    expect(Number.isFinite(b.sim.spawnY)).toBe(true);
    expect(b.sim.goalX).toBeGreaterThan(b.sim.spawnX);
  });

  it("uses the baked-prop artPainting path (not the shape-stamp painting)", () => {
    const b = levelBundle(FIRST_LEVEL_ID);
    expect(b.painting).toHaveLength(0);
    expect(b.artPainting && b.artPainting.length).toBeGreaterThan(0);
    // Every painted art url is a real asset path (baked prop or level art).
    for (const p of b.artPainting ?? []) {
      expect(p.url).toMatch(/\.(webp|png)$/);
    }
  });

  it("maps enemies + npcs to valid runtime kinds/ids", () => {
    const b = levelBundle(FIRST_LEVEL_ID);
    for (const e of b.sim.enemies) {
      expect(["patrol", "chase"]).toContain(e.kind);
      expect(["goblin", "skeleton", "mushroom", "flyingEye"]).toContain(e.visual);
    }
    // NPC dialogueIds are aliased to baked roster ids where applicable.
    const ids = b.sim.npcs.map((n) => n.dialogueId);
    expect(ids).toContain("elder-mara");
  });

  it("provides a parallax stack and an authored frame", () => {
    const b = levelBundle(FIRST_LEVEL_ID);
    expect(b.parallax.length).toBeGreaterThan(0);
    expect(b.frame.bottom).toBeGreaterThan(b.frame.top);
  });

  it("threads the problem-solving layer into the sim (switches/gates/platforms/secrets)", () => {
    const b = levelBundle(FIRST_LEVEL_ID);
    // Halward's Reach authors a lever + gate + a moving platform + a secret relic.
    expect((b.sim.switches ?? []).length).toBeGreaterThan(0);
    expect((b.sim.gates ?? []).length).toBeGreaterThan(0);
    expect((b.sim.movingPlatforms ?? []).length).toBeGreaterThan(0);
    // The secret is folded into collectibles as a rich pickup (value > a normal coin).
    const richest = Math.max(...b.sim.collectibles.map((c) => c.value));
    expect(richest).toBeGreaterThanOrEqual(500);
    // A gate references a real switch id (the lever-opens-gate hook is wired).
    const switchIds = new Set((b.sim.switches ?? []).map((s) => s.id));
    for (const g of b.sim.gates ?? []) {
      expect(g.opensWith.some((id) => switchIds.has(id))).toBe(true);
    }
  });
});
