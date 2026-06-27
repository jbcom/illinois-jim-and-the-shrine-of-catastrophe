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
interface SweepResult {
  /** Resolved leading-edge coordinate on the swept axis. */
  readonly pos: number;
  /** True if a blocker stopped the move. */
  readonly hit: boolean;
}

/**
 * Sweep one axis. `lead` is the body's start position on that axis, `size` its
 * extent, `delta` the attempted move. `spanLo/spanHi` are the body's extent on
 * the perpendicular axis. `blockAt(cell, perp)` reports whether the tile at
 * (cell,perp) — ordered along the swept axis — blocks. Returns the resolved
 * leading position and whether it was stopped, scanning cell-by-cell so a fast
 * body cannot tunnel through a thin wall.
 */
function sweep(
  lead: number,
  size: number,
  delta: number,
  spanLo: number,
  spanHi: number,
  ts: number,
  blockAt: (cell: number, perp: number) => boolean,
): SweepResult {
  const target = lead + delta;
  const movingPos = delta > 0;
  const [p0, p1] = tileRange(spanLo, spanHi, ts);
  // Leading edge cell at start and at target.
  const edge = (v: number) => Math.floor((movingPos ? v + size - EPSILON : v) / ts);
  const fromCell = edge(lead);
  const toCell = edge(target);
  const stepDir = movingPos ? 1 : -1;

  for (let cell = fromCell + stepDir; movingPos ? cell <= toCell : cell >= toCell; cell += stepDir) {
    for (let perp = p0; perp <= p1; perp++) {
      if (blockAt(cell, perp)) {
        // Snap flush against the blocking cell.
        return { pos: movingPos ? cell * ts - size : (cell + 1) * ts, hit: true };
      }
    }
  }
  return { pos: target, hit: false };
}

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

  // X axis first (columns are the swept cells; rows the perpendicular span).
  if (dx !== 0) {
    const r = sweep(x, w, dx, y, y + h, ts, (col, row) => blocks(tileAt(map, col, row), false));
    x = r.pos;
    if (r.hit) {
      if (dx > 0) hitRight = true;
      else hitLeft = true;
    }
  }

  // Y axis (rows swept; columns perpendicular). Falling bodies are blocked by
  // one-way platforms, so pass movingDown to `blocks`.
  if (dy !== 0) {
    const movingDown = dy > 0;
    const r = sweep(y, h, dy, x, x + w, ts, (row, col) => blocks(tileAt(map, col, row), movingDown));
    y = r.pos;
    if (r.hit) {
      if (movingDown) grounded = true;
      else hitTop = true;
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
