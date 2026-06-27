import { createRng, seedFromString } from "@engine/rng.ts";
import { describe, expect, it } from "vitest";

describe("createRng", () => {
  it("is deterministic: same seed → same sequence", () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const seqA = Array.from({ length: 100 }, () => a.next());
    const seqB = Array.from({ length: 100 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it("next() stays in [0, 1)", () => {
    const r = createRng(99);
    for (let i = 0; i < 10_000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("int() is inclusive on both bounds and stays in range", () => {
    const r = createRng(7);
    let sawMin = false;
    let sawMax = false;
    for (let i = 0; i < 5_000; i++) {
      const v = r.int(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      expect(Number.isInteger(v)).toBe(true);
      if (v === 1) sawMin = true;
      if (v === 6) sawMax = true;
    }
    expect(sawMin).toBe(true);
    expect(sawMax).toBe(true);
  });

  it("range() stays in [min, max)", () => {
    const r = createRng(3);
    for (let i = 0; i < 1_000; i++) {
      const v = r.range(-5, 5);
      expect(v).toBeGreaterThanOrEqual(-5);
      expect(v).toBeLessThan(5);
    }
  });

  it("int() and range() throw on inverted bounds", () => {
    const r = createRng(5);
    expect(() => r.int(10, 5)).toThrow();
    expect(() => r.range(10, 5)).toThrow();
    // Equal bounds are valid (degenerate but well-defined).
    expect(r.int(3, 3)).toBe(3);
  });

  it("pick() returns an element and throws on empty", () => {
    const r = createRng(42);
    const items = ["a", "b", "c"] as const;
    for (let i = 0; i < 100; i++) {
      expect(items).toContain(r.pick(items));
    }
    expect(() => r.pick([])).toThrow();
  });

  it("chance(p) respects probability bounds (0 → never, 1 → always)", () => {
    const r = createRng(11);
    for (let i = 0; i < 200; i++) {
      expect(r.chance(0)).toBe(false);
      expect(r.chance(1)).toBe(true);
    }
  });

  it("state() lets a sequence be resumed identically", () => {
    const r = createRng(2024);
    for (let i = 0; i < 10; i++) r.next();
    const resumed = createRng(r.state());
    // Resuming from the snapshot state reproduces forward values.
    const a = Array.from({ length: 20 }, () => r.next());
    const b = Array.from({ length: 20 }, () => resumed.next());
    expect(b).toEqual(a);
  });
});

describe("seedFromString", () => {
  it("is stable for the same string", () => {
    expect(seedFromString("daily-2026-06-27")).toBe(seedFromString("daily-2026-06-27"));
  });

  it("differs for different strings", () => {
    expect(seedFromString("a")).not.toBe(seedFromString("b"));
  });

  it("returns an unsigned 32-bit integer", () => {
    const s = seedFromString("shrine-of-catastrophe");
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(0xffffffff);
  });
});
