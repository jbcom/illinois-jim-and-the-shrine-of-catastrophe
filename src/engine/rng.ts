/**
 * Deterministic RNG facade.
 *
 * Sim/engine code must use `createRng(seed)` instead of `Math.random()` so that
 * a given seed always replays identically — required for deterministic tests,
 * replays, and netcode-friendly logic. Enforced by .claude/gates.json ban_patterns.
 *
 * Algorithm: mulberry32 — small, fast, good enough distribution for a game,
 * fully deterministic from a 32-bit seed.
 */
export interface Rng {
  /** Next float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** True with probability p (default 0.5). */
  chance(p?: number): boolean;
  /** Random element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** Current internal state, for snapshotting a replay. */
  state(): number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;

  const next = (): number => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    range: (min, max) => next() * (max - min) + min,
    chance: (p = 0.5) => next() < p,
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) {
        throw new Error("createRng.pick: empty array");
      }
      // Non-empty checked above; index is always in-bounds.
      return items[Math.floor(next() * items.length)] as T;
    },
    state: () => s >>> 0,
  };
}

/** Derive a 32-bit seed from an arbitrary string (e.g. a daily-run key). */
export function seedFromString(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
