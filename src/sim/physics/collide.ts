/**
 * Tile-grid collision resolution for a moving AABB body.
 *
 * Standard robust platformer technique: resolve one axis at a time (X then Y)
 * so a body sliding along a wall doesn't snag on tile seams. Returns the
 * resolved position plus which faces touched, so the controller can update
 * grounded/wall state and zero the appropriate velocity component.
 *
 * Pure: takes a tilemap + body, returns a result. No DOM, no mutation of inputs.
 */
import type { Aabb } from "@sim/physics/aabb.ts";
import { type TileKind, type TileMap, TileKind as TK, tileAt } from "@sim/world/tilemap.ts";

export interface MoveResult {
  /** Resolved top-left position. */
  readonly x: number;
  readonly y: number;
  readonly hitLeft: boolean;
  readonly hitRight: boolean;
  readonly hitTop: boolean;
  /** Standing on solid ground this step. */
  readonly grounded: boolean;
  /** A hazard tile was overlapped during the move. */
  readonly touchedHazard: boolean;
}

const EPSILON = 1e-4;

/** Whether `kind` blocks movement given vertical velocity (one-way platforms). */
function blocks(kind: TileKind, movingDown: boolean): boolean {
  if (kind === TK.Solid) return true;
  // One-way platforms only block a downward (falling) body.
  if (kind === TK.Platform) return movingDown;
  return false;
}

function tileRange(lo: number, hi: number, size: number): [number, number] {
  return [Math.floor(lo / size), Math.floor((hi - EPSILON) / size)];
}

function scanHazard(map: TileMap, body: Aabb): boolean {
  const [c0, c1] = tileRange(body.pos.x, body.pos.x + body.size.x, map.tileSize);
  const [r0, r1] = tileRange(body.pos.y, body.pos.y + body.size.y, map.tileSize);
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      if (tileAt(map, col, row) === TK.Hazard) return true;
    }
  }
  return false;
}

/**
 * Move `body` by `(dx, dy)` and resolve against solid tiles.
 * `body.pos` is the start position; the move is applied internally per-axis.
 */
export function moveAndCollide(map: TileMap, body: Aabb, dx: number, dy: number): MoveResult {
  const ts = map.tileSize;
  const w = body.size.x;
  const h = body.size.y;
  let x = body.pos.x;
  let y = body.pos.y;

  let hitLeft = false;
  let hitRight = false;
  let hitTop = false;
  let grounded = false;

  // --- X axis ---
  // Sweep the leading vertical edge through every column it crosses, stopping at
  // the first blocker so fast bodies cannot tunnel through thin walls.
  if (dx !== 0) {
    const startX = x;
    const targetX = x + dx;
    const [r0, r1] = tileRange(y, y + h, ts);
    if (dx > 0) {
      const fromCol = Math.floor((startX + w - EPSILON) / ts);
      const toCol = Math.floor((targetX + w - EPSILON) / ts);
      x = targetX;
      for (let col = fromCol + 1; col <= toCol; col++) {
        let blocked = false;
        for (let row = r0; row <= r1; row++) {
          if (blocks(tileAt(map, col, row), false)) {
            blocked = true;
            break;
          }
        }
        if (blocked) {
          x = col * ts - w;
          hitRight = true;
          break;
        }
      }
    } else {
      const fromCol = Math.floor(startX / ts);
      const toCol = Math.floor(targetX / ts);
      x = targetX;
      for (let col = fromCol - 1; col >= toCol; col--) {
        let blocked = false;
        for (let row = r0; row <= r1; row++) {
          if (blocks(tileAt(map, col, row), false)) {
            blocked = true;
            break;
          }
        }
        if (blocked) {
          x = (col + 1) * ts;
          hitLeft = true;
          break;
        }
      }
    }
  }

  // --- Y axis ---
  if (dy !== 0) {
    const startY = y;
    const targetY = y + dy;
    const [c0, c1] = tileRange(x, x + w, ts);
    if (dy > 0) {
      const fromRow = Math.floor((startY + h - EPSILON) / ts);
      const toRow = Math.floor((targetY + h - EPSILON) / ts);
      y = targetY;
      for (let row = fromRow + 1; row <= toRow; row++) {
        let blocked = false;
        for (let col = c0; col <= c1; col++) {
          if (blocks(tileAt(map, col, row), true)) {
            blocked = true;
            break;
          }
        }
        if (blocked) {
          y = row * ts - h;
          grounded = true;
          break;
        }
      }
    } else {
      const fromRow = Math.floor(startY / ts);
      const toRow = Math.floor(targetY / ts);
      y = targetY;
      for (let row = fromRow - 1; row >= toRow; row--) {
        let blocked = false;
        for (let col = c0; col <= c1; col++) {
          if (blocks(tileAt(map, col, row), false)) {
            blocked = true;
            break;
          }
        }
        if (blocked) {
          y = (row + 1) * ts;
          hitTop = true;
          break;
        }
      }
    }
  }

  const resolved: Aabb = { pos: { x, y }, size: body.size };
  return {
    x,
    y,
    hitLeft,
    hitRight,
    hitTop,
    grounded,
    touchedHazard: scanHazard(map, resolved),
  };
}
