/**
 * Axis-aligned bounding box collision primitives. Pure geometry, no DOM.
 */
import type { Vec2 } from "@sim/math/vec2.ts";

export interface Aabb {
  /** Top-left corner. */
  readonly pos: Vec2;
  /** Width/height (positive). */
  readonly size: Vec2;
}

export const aabb = (x: number, y: number, w: number, h: number): Aabb => ({
  pos: { x, y },
  size: { x: w, y: h },
});

export const right = (b: Aabb): number => b.pos.x + b.size.x;
export const bottom = (b: Aabb): number => b.pos.y + b.size.y;

export const intersects = (a: Aabb, b: Aabb): boolean =>
  a.pos.x < right(b) && right(a) > b.pos.x && a.pos.y < bottom(b) && bottom(a) > b.pos.y;

export const contains = (b: Aabb, p: Vec2): boolean =>
  p.x >= b.pos.x && p.x < right(b) && p.y >= b.pos.y && p.y < bottom(b);

/** Overlap depth on each axis (0 if not overlapping on that axis). */
export const overlap = (a: Aabb, b: Aabb): Vec2 => {
  const x = Math.min(right(a), right(b)) - Math.max(a.pos.x, b.pos.x);
  const y = Math.min(bottom(a), bottom(b)) - Math.max(a.pos.y, b.pos.y);
  return { x: Math.max(0, x), y: Math.max(0, y) };
};
