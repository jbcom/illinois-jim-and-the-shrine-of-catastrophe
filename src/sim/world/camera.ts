/**
 * Side-scroll camera — pure math, no DOM.
 *
 * Follows a target with a deadzone box (the target can drift within the box
 * before the camera moves) and clamps to the level bounds so we never show
 * past the edges. The renderer turns the camera position into a draw offset.
 */
import { clamp } from "@sim/math/vec2.ts";

export interface Camera {
  /** Top-left of the visible region, in world units. */
  x: number;
  y: number;
  /** Visible region size in world units (the design resolution). */
  readonly viewW: number;
  readonly viewH: number;
  /** Half-width/height of the centered deadzone box. */
  readonly deadzoneX: number;
  readonly deadzoneY: number;
}

export function createCamera(viewW: number, viewH: number): Camera {
  return {
    x: 0,
    y: 0,
    viewW,
    viewH,
    deadzoneX: viewW * 0.18,
    deadzoneY: viewH * 0.25,
  };
}

export interface LevelBounds {
  readonly width: number;
  readonly height: number;
}

/** Advance the camera toward following `(tx, ty)` (the target's center). */
export function followCamera(cam: Camera, tx: number, ty: number, bounds: LevelBounds): Camera {
  const c: Camera = { ...cam };
  const centerX = c.x + c.viewW / 2;
  const centerY = c.y + c.viewH / 2;

  const dx = tx - centerX;
  if (dx > c.deadzoneX) c.x += dx - c.deadzoneX;
  else if (dx < -c.deadzoneX) c.x += dx + c.deadzoneX;

  const dy = ty - centerY;
  if (dy > c.deadzoneY) c.y += dy - c.deadzoneY;
  else if (dy < -c.deadzoneY) c.y += dy + c.deadzoneY;

  // Clamp so the view never leaves the level. If the level is smaller than the
  // view on an axis, pin to 0 (the renderer/letterbox handles the slack).
  const maxX = Math.max(0, bounds.width - c.viewW);
  const maxY = Math.max(0, bounds.height - c.viewH);
  c.x = clamp(c.x, 0, maxX);
  c.y = clamp(c.y, 0, maxY);
  return c;
}
