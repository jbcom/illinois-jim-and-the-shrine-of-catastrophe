/**
 * Build a playable level from a validated schema `Level` (Gemini's output). The
 * schema's SURFACES become the collision tilemap (ground solid, raised/rail one-way,
 * gap empty); every entity's surface-relative anchor resolves to a world position.
 * Sim-pure: collision + spawns only. The render side reads the same resolved
 * geometry to paint the generated art (render/levels/fromLevel.ts).
 *
 * This is the bridge from the Gemini contract (levelSchema.ts) to the engine. It
 * reuses the relative-surface discipline (no absolute coords; collision + art both
 * derive from the surface walk, so they can't drift).
 */
import type { Anchor, Level, Surface } from "@sim/world/levelSchema.ts";
import { createTileMap, setTile, TileKind, type TileMap } from "@sim/world/tilemap.ts";

type LevelNpc = Level["npcs"][number];
type LevelHazard = Level["hazards"][number];
type LevelCollectible = Level["collectibles"][number];
type LevelEnemyT = Level["enemies"][number];
type LevelPot = Level["pots"][number];

/** A surface resolved to its world span + standable Y (undefined for a gap). */
export interface ResolvedSurface {
  readonly surface: Surface;
  readonly index: number;
  readonly x0: number;
  readonly x1: number;
  readonly surfaceY?: number;
}

/** Walk the surfaces left-to-right from x=0, resolving each to a world span + Y. */
export function resolveSurfaces(level: Level): ResolvedSurface[] {
  const out: ResolvedSurface[] = [];
  let x = 0;
  for (let i = 0; i < level.surfaces.length; i++) {
    const s = level.surfaces[i]!;
    const x0 = x;
    const x1 = x + s.length;
    const surfaceY = s.kind === "gap" ? undefined : level.baselineY - (s.top ?? 0);
    out.push(surfaceY === undefined ? { surface: s, index: i, x0, x1 } : { surface: s, index: i, x0, x1, surfaceY });
    x = x1;
  }
  return out;
}

/** Total level width in world px (sum of surface lengths). */
export function levelWidth(level: Level): number {
  return level.surfaces.reduce((w: number, s: Surface) => w + s.length, 0);
}

/** Resolve a surface-relative anchor to an absolute world (x, y). */
export function resolveAnchor(level: Level, resolved: readonly ResolvedSurface[], a: Anchor): { x: number; y: number } {
  const r = resolved[a.surface];
  if (!r) throw new Error(`anchor references missing surface ${a.surface}`);
  const x = r.x0 + (r.x1 - r.x0) * a.t;
  const surfaceY = r.surfaceY ?? level.baselineY;
  return { x, y: surfaceY - (a.dy ?? 0) };
}

/**
 * Derive the collision tilemap from the surfaces. ground → solid from its top to the
 * map bottom; raised/rail → a one-way standable row at its top; gap → empty. Side
 * walls close the level. Overlay structures with their own collision (moving
 * platforms) are added by the systems at runtime, not baked here.
 */
export function buildCollision(level: Level): TileMap {
  const ts = 16;
  const rows = 26;
  const width = levelWidth(level);
  const cols = Math.ceil(width / ts);
  const map = createTileMap(cols, rows, ts);
  const resolved = resolveSurfaces(level);

  for (const r of resolved) {
    if (r.surfaceY === undefined) continue;
    const c0 = Math.round(r.x0 / ts);
    const c1 = Math.round(r.x1 / ts);
    const row = Math.round(r.surfaceY / ts);
    if (r.surface.kind === "ground") {
      for (let c = c0; c < c1; c++) for (let rr = row; rr < rows; rr++) setTile(map, c, rr, TileKind.Solid);
    } else if (r.surface.kind === "rail") {
      for (let c = c0; c < c1; c++) setTile(map, c, row, TileKind.Rail);
    } else {
      // raised: a one-way platform row (jump up onto it from below).
      for (let c = c0; c < c1; c++) setTile(map, c, row, TileKind.Platform);
    }
  }
  for (let rr = 0; rr < rows; rr++) {
    setTile(map, 0, rr, TileKind.Solid);
    setTile(map, cols - 1, rr, TileKind.Solid);
  }

  // Hazards (spikes/lava) → Hazard tiles: contact kills the player (systems.ts reads
  // res.touchedHazard). Lay them across the hazard's width at its placed row, so the
  // painted spike art has matching deadly collision (no "danger that does nothing").
  for (const h of level.hazards) {
    const { x, y } = resolveAnchor(level, resolved, h.at);
    const c0 = Math.round((x - h.width / 2) / ts);
    const c1 = Math.round((x + h.width / 2) / ts);
    const row = Math.round(y / ts);
    for (let c = c0; c < c1; c++) setTile(map, c, row, TileKind.Hazard);
  }
  return map;
}

/** The sim-side build: collision + every entity resolved to world space + the goal. */
export interface BuiltSchemaLevel {
  readonly id: string;
  readonly map: TileMap;
  readonly spawnX: number;
  readonly spawnY: number;
  readonly collectibles: readonly { x: number; y: number; value: number; art: string }[];
  readonly enemies: readonly { x: number; y: number; behavior: "patrol" | "chase"; range: number; art: string }[];
  readonly pots: readonly { x: number; y: number; drop: "relic" | "health" | "secret"; art: string }[];
  readonly npcs: readonly { x: number; y: number; dialogueId: string; art: string }[];
  readonly hazards: readonly { x: number; y: number; width: number; art: string }[];
  readonly switches: readonly { x: number; y: number; id: string; art: string }[];
  /** Gates: position + the world rect they block (the blocked surface span) until open. */
  readonly gates: readonly {
    x: number;
    y: number;
    art: string;
    opensWith: readonly string[];
    x0: number;
    x1: number;
    top: number;
    bottom: number;
  }[];
  readonly goalX: number;
}

/** Resolve a validated schema Level into the sim build (collision + spawns + goal). */
export function buildFromLevel(level: Level): BuiltSchemaLevel {
  const resolved = resolveSurfaces(level);
  const at = (a: Anchor) => resolveAnchor(level, resolved, a);
  const spawn = at(level.spawn);
  return {
    id: level.id,
    map: buildCollision(level),
    spawnX: spawn.x,
    spawnY: spawn.y - 40, // drop onto the surface
    collectibles: level.collectibles.map((c: LevelCollectible) => ({ ...at(c.at), value: c.value, art: c.art })),
    enemies: level.enemies.map((e: LevelEnemyT) => ({ ...at(e.at), behavior: e.behavior, range: e.range, art: e.art })),
    pots: level.pots.map((p: LevelPot) => ({ ...at(p.at), drop: p.drop, art: p.art })),
    npcs: level.npcs.map((n: LevelNpc) => ({ ...at(n.at), dialogueId: n.dialogueId, art: n.art })),
    hazards: level.hazards.map((h: LevelHazard) => ({ ...at(h.at), width: h.width, art: h.art })),
    switches: level.switches.map((s) => ({ ...at(s.at), id: s.id, art: s.art })),
    gates: level.gates.map((g) => {
      const pos = at(g.at);
      // The gate blocks its `blocksSurface` span: a vertical wall over that surface's
      // x-range, from above the standable line down to the floor.
      const blocked = resolved[g.blocksSurface];
      const x0 = blocked?.x0 ?? pos.x - 16;
      const x1 = blocked?.x1 ?? pos.x + 16;
      const top = (blocked?.surfaceY ?? pos.y) - 96;
      const bottom = (blocked?.surfaceY ?? pos.y) + 8;
      return { x: pos.x, y: pos.y, art: g.art, opensWith: g.opensWith, x0, x1, top, bottom };
    }),
    goalX: at(level.goal).x,
  };
}

/** Every entity/spawn must resolve BEFORE the goal (no stranded entities, no early
 *  win-line skip — the speedrun-integrity rule). True = clean. */
export function entitiesBeforeGoal(level: Level): boolean {
  const b = buildFromLevel(level);
  const all = [...b.enemies, ...b.collectibles, ...b.pots, ...b.npcs, ...b.hazards];
  return all.every((e) => e.x < b.goalX) && b.spawnX < b.goalX;
}
