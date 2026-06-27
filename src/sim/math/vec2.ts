/**
 * 2D vector math. Pure, allocation-light value type.
 *
 * Vectors are plain `{ x, y }` objects so they serialize cleanly into sim
 * snapshots/replays. Operations return new vectors (immutable style); use the
 * `*Mut` helpers in hot loops where a scratch vector avoids per-frame garbage.
 */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export const vec2 = (x = 0, y = 0): Vec2 => ({ x, y });

export const ZERO: Vec2 = Object.freeze({ x: 0, y: 0 });

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;

export const lengthSq = (a: Vec2): number => a.x * a.x + a.y * a.y;
export const length = (a: Vec2): number => Math.sqrt(lengthSq(a));

export const normalize = (a: Vec2): Vec2 => {
  const len = length(a);
  return len === 0 ? ZERO : { x: a.x / len, y: a.y / len };
};

export const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

/** Linear interpolation, t in [0,1]. Used by the renderer for sim-state blending. */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const lerpVec = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
});

/** Move `value` toward `target` by at most `maxDelta` (no overshoot). */
export const approach = (value: number, target: number, maxDelta: number): number => {
  if (value < target) return Math.min(value + maxDelta, target);
  if (value > target) return Math.max(value - maxDelta, target);
  return target;
};
