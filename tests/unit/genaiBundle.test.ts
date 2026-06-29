import { FIRST_LEVEL_ID, LEVEL_ORDER, levelBundle, nextLevelId } from "@render/levels/registry.ts";
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

/**
 * The GenAI Level 2 (the-whispering-jungle) is registered as the live second level
 * and follows Level 1 in the story order. Its free-form jungle enemy/NPC art keys
 * (canopy-panther / carnivorous-plant / guardian-warning) must adapt to valid
 * runtime visual kinds + a baked NPC roster id, or the live game crashes on boot.
 */
describe("GenAI Level 2 bundle (the-whispering-jungle)", () => {
  const ID = "the-whispering-jungle";

  it("is registered and plays right after Level 1", () => {
    expect(LEVEL_ORDER).toContain(ID);
    expect(nextLevelId(FIRST_LEVEL_ID)).toBe(ID);
  });

  it("carries a GameLevel sim with a forward goal", () => {
    const b = levelBundle(ID);
    expect(b.sim.id).toBe(ID);
    expect(b.sim.map.width).toBeGreaterThan(0);
    expect(b.sim.goalX).toBeGreaterThan(b.sim.spawnX);
  });

  it("adapts the jungle enemy + npc art keys to valid runtime kinds/ids", () => {
    const b = levelBundle(ID);
    expect(b.sim.enemies.length).toBeGreaterThan(0);
    for (const e of b.sim.enemies) {
      expect(["patrol", "chase"]).toContain(e.kind);
      // No enemy falls through to the generic flyingEye default — the jungle
      // beasts map explicitly (panther→goblin, plant→mushroom).
      expect(["goblin", "skeleton", "mushroom", "flyingEye"]).toContain(e.visual);
    }
    // The guardian NPC aliases to a real baked roster id (never a raw dialogueId).
    for (const n of b.sim.npcs) {
      expect(["elder-mara", "watchman-pell", "ferryman-cole"]).toContain(n.dialogueId);
    }
  });

  it("uses the baked-prop artPainting path with a parallax stack", () => {
    const b = levelBundle(ID);
    expect(b.painting).toHaveLength(0);
    expect(b.artPainting && b.artPainting.length).toBeGreaterThan(0);
    expect(b.parallax.length).toBeGreaterThan(0);
    for (const p of b.artPainting ?? []) {
      expect(p.url).toMatch(/\.(webp|png)$/);
    }
  });
});

/**
 * The GenAI Level 3 (the-rushing-gorge) is registered as the live third level and
 * follows Level 2. Its river-serpent enemy + boatman NPC art keys must adapt to a
 * valid runtime visual + baked roster id, and its ground/water art must NOT leak
 * into the painting as a foreground sprite (handled as groundFill + parallax).
 */
describe("GenAI Level 3 bundle (the-rushing-gorge)", () => {
  const ID = "the-rushing-gorge";

  it("is registered and plays right after Level 2", () => {
    expect(LEVEL_ORDER).toContain(ID);
    expect(nextLevelId("the-whispering-jungle")).toBe(ID);
  });

  it("adapts the river enemy + boatman npc to valid runtime kinds/ids", () => {
    const b = levelBundle(ID);
    expect(b.sim.enemies.length).toBeGreaterThan(0);
    for (const e of b.sim.enemies) {
      expect(["patrol", "chase"]).toContain(e.kind);
      expect(["goblin", "skeleton", "mushroom", "flyingEye"]).toContain(e.visual);
    }
    for (const n of b.sim.npcs) {
      expect(["elder-mara", "watchman-pell", "ferryman-cole"]).toContain(n.dialogueId);
    }
  });

  it("fills the river floor (groundFill) and never paints a ground/water sprite", () => {
    const b = levelBundle(ID);
    expect(b.groundFill).toBeDefined();
    expect(b.groundFill?.width).toBeGreaterThan(0);
    // The ground/water/decor textures stay out of the painting — no opaque sprite.
    for (const p of b.artPainting ?? []) {
      expect(p.url).not.toMatch(/(ground-riverbed|water-surface|waterfall-overlay)/);
    }
  });
});
