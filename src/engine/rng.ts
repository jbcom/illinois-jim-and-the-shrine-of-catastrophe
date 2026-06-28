/**
 * Deterministic RNG facade, backed by the seedrandom library.
 *
 * Sim/engine code must use these factories instead of `Math.random()` so a given
 * seed always replays identically — required for deterministic tests, replays,
 * and netcode-friendly logic. Enforced by .claude/gates.json ban_patterns.
 *
 * Dual-layer (`createRngPair`): a `sim` stream drives replay-critical gameplay
 * and a separate `fx` stream drives cosmetic randomness (particles, sprite
 * jitter). Keeping them independent means visual variety never advances the sim
 * stream, so cosmetic changes can never desync a gameplay replay.
 */
import seedrandom from "seedrandom";

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
  /** Opaque PRNG state, for snapshotting/restoring a replay. */
  state(): seedrandom.State.Arc4;
}

/** A pair of independent streams: gameplay (sim) vs cosmetic (fx). */
export interface RngPair {
  readonly sim: Rng;
  readonly fx: Rng;
}

function wrap(prng: seedrandom.StatefulPRNG<seedrandom.State.Arc4>): Rng {
  const next = () => prng();
  return {
    next,
    int: (min, max) => {
      if (max < min) throw new Error(`Rng.int: max (${max}) < min (${min})`);
      return Math.floor(next() * (max - min + 1)) + min;
    },
    range: (min, max) => {
      if (max < min) throw new Error(`Rng.range: max (${max}) < min (${min})`);
      return next() * (max - min) + min;
    },
    chance: (p = 0.5) => next() < p,
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) throw new Error("Rng.pick: empty array");
      return items[Math.floor(next() * items.length)] as T;
    },
    state: () => prng.state(),
  };
}

/** Single deterministic stream from a numeric or string seed. */
export function createRng(seed: number | string): Rng {
  return wrap(seedrandom(String(seed), { state: true }));
}

/** Restore a stream from a snapshotted state (resumes an identical sequence). */
export function restoreRng(state: seedrandom.State.Arc4): Rng {
  return wrap(seedrandom("", { state }));
}

/**
 * Two independent streams from one seed. The fx stream is seeded from a derived
 * key so it never coincides with the sim stream.
 */
export function createRngPair(seed: number | string): RngPair {
  return {
    sim: createRng(`${seed}:sim`),
    fx: createRng(`${seed}:fx`),
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
