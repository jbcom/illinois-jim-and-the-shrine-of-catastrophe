/**
 * Level spec — the SINGLE SOURCE OF TRUTH for a level, built "from the ground up"
 * with RELATIVE surface positioning (NOT absolute world coords). A level is an
 * ordered list of SURFACE SEGMENTS laid left-to-right from x=0; props and spawns
 * attach to a segment by a relative offset and sit ON that segment's surface.
 *
 * The collision tilemap, the prop world-positions, and every spawn/goal coordinate
 * are all DERIVED from this one spec by `buildLevel` — so the painting and the
 * physics can never drift apart (the recurring bug when they were hand-authored
 * in parallel: goals past spawns, unreachable enemies, floating props).
 *
 * Pure data + pure derivation — no DOM, no render imports. The render side reads
 * the SAME resolved geometry to anchor stamps (see render/levels/fromSpec.ts).
 */
import { createTileMap, setTile, TileKind, type TileMap } from "@sim/world/tilemap.ts";

/**
 * A walkable/empty surface segment, measured in world px, laid left-to-right.
 *
 * NARRATIVE ANCHORING (hard rule): a raised surface is NEVER a platform floating
 * in air. In a parallax side-scroller a platform must be a REAL FOREGROUND OBJECT
 * you stand on — a rooftop, a crate stack, a fallen column, a stone ledge, a beam
 * — something with its own reality, drawn in the foreground plane (not jutting
 * from the moving backdrop, which would be physically incoherent). So a `raised`
 * segment NAMES the object that justifies it (`anchorProp`); its surface top is
 * that object's top. `ground` is the floor; `gap` is a chasm. There is no abstract
 * floating platform kind on purpose.
 */
export interface Segment {
  readonly kind: "ground" | "raised" | "gap";
  /** Length of this segment in world px. */
  readonly length: number;
  /**
   * Surface TOP height in px ABOVE the ground baseline (0 = the baseline floor;
   * positive = raised). For `raised`, this is the standable top of `anchorProp`.
   * Ignored for `gap`.
   */
  readonly top?: number;
  /**
   * For `raised`: a short tag naming the real object you stand on (e.g. "rooftop",
   * "crate", "fallen-column", "ledge", "beam"). Documents the narrative anchor and
   * is the contract the painting must honour (it draws that object here). Required
   * for `raised`, ignored otherwise — a raised surface with no anchor is a bug.
   */
  readonly anchorProp?: string;
}

/** Where on the level a thing sits: ON segment `seg`, at `t` (0..1) along it, plus
 *  an optional pixel `dy` above that segment's surface (e.g. a hovering enemy). */
export interface Anchor {
  readonly seg: number;
  /** Fraction along the segment (0 = its left edge, 1 = its right edge). */
  readonly t: number;
  /** Pixels ABOVE the segment's surface top (default 0 = standing on it). */
  readonly dy?: number;
}

export interface SpecEnemy extends Anchor {
  readonly kind: "patrol" | "chase";
  readonly visual: "goblin" | "skeleton" | "mushroom" | "flyingEye";
}
export interface SpecPot extends Anchor {
  readonly color: "gray" | "red" | "white" | "yellow";
  readonly drop: "relic" | "health" | "secret";
}
export interface SpecCollectible extends Anchor {
  readonly value: number;
}
export interface SpecNpc extends Anchor {
  readonly dialogueId: string;
}

export interface LevelSpec {
  readonly id: string;
  /** The ground baseline in world Y (the floor surface top of a `top:0` segment). */
  readonly baselineY: number;
  /** Tile size for the derived collision map. */
  readonly tileSize: number;
  /** Map height in tiles (rows). */
  readonly rows: number;
  /** The surfaces, left-to-right from x=0. */
  readonly segments: readonly Segment[];
  /** Where the player starts (defaults to standing on the first segment). */
  readonly spawn?: Anchor;
  /** The goal: reaching this world-x (resolved from the anchor) wins the level. */
  readonly goal: Anchor;
  readonly enemies: readonly SpecEnemy[];
  readonly pots: readonly SpecPot[];
  readonly collectibles: readonly SpecCollectible[];
  readonly npcs: readonly SpecNpc[];
}

/** A segment with its resolved world span + surface Y (the result of the walk). */
export interface ResolvedSegment {
  readonly seg: Segment;
  readonly index: number;
  /** Left/right world-x of the segment. */
  readonly x0: number;
  readonly x1: number;
  /** Surface TOP in world Y (baselineY - top); undefined for a `gap`. */
  readonly surfaceY?: number;
}

/** Walk the segments left-to-right, resolving each to a world span + surface Y. */
export function resolveSegments(spec: LevelSpec): ResolvedSegment[] {
  const out: ResolvedSegment[] = [];
  let x = 0;
  for (let i = 0; i < spec.segments.length; i++) {
    const seg = spec.segments[i]!;
    const x0 = x;
    const x1 = x + seg.length;
    const surfaceY = seg.kind === "gap" ? undefined : spec.baselineY - (seg.top ?? 0);
    out.push(surfaceY === undefined ? { seg, index: i, x0, x1 } : { seg, index: i, x0, x1, surfaceY });
    x = x1;
  }
  return out;
}

/** Total level width in world px (the sum of segment lengths). */
export function levelWidth(spec: LevelSpec): number {
  return spec.segments.reduce((w, s) => w + s.length, 0);
}

/** Resolve an anchor to an absolute world position (x, y) on its segment surface. */
export function resolveAnchor(spec: LevelSpec, resolved: readonly ResolvedSegment[], a: Anchor): { x: number; y: number } {
  const r = resolved[a.seg];
  if (!r) throw new Error(`anchor references missing segment ${a.seg}`);
  const x = r.x0 + (r.x1 - r.x0) * a.t;
  // A gap has no surface; fall back to the baseline (anchors on gaps are unusual).
  const surfaceY = r.surfaceY ?? spec.baselineY;
  return { x, y: surfaceY - (a.dy ?? 0) };
}

/**
 * Derive the collision tilemap from the segments alone. Ground fills solid from
 * its surface down; platforms lay a one-way row at their surface; gaps stay empty.
 * Side walls close the level. This is the ONLY place collision geometry is born —
 * it is a function of the segments, so it cannot disagree with the painting.
 */
export function buildCollision(spec: LevelSpec): TileMap {
  const ts = spec.tileSize;
  const width = levelWidth(spec);
  const cols = Math.ceil(width / ts);
  const map = createTileMap(cols, spec.rows, ts);
  const resolved = resolveSegments(spec);

  for (const r of resolved) {
    if (r.seg.kind === "gap" || r.surfaceY === undefined) continue;
    const c0 = Math.round(r.x0 / ts);
    const c1 = Math.round(r.x1 / ts);
    const row = Math.round(r.surfaceY / ts);
    if (r.seg.kind === "raised") {
      // A raised surface = the standable TOP of its anchor object (one-way, so the
      // player can jump up onto the rooftop/crate/ledge/beam from below).
      for (let c = c0; c < c1; c++) setTile(map, c, row, TileKind.Platform);
    } else {
      // Solid ground: fill from the surface row to the map bottom.
      for (let c = c0; c < c1; c++) {
        for (let rr = row; rr < spec.rows; rr++) setTile(map, c, rr, TileKind.Solid);
      }
    }
  }
  // Close the level edges so the player can't walk off the world.
  for (let rr = 0; rr < spec.rows; rr++) {
    setTile(map, 0, rr, TileKind.Solid);
    setTile(map, cols - 1, rr, TileKind.Solid);
  }
  return map;
}

/**
 * The sim-side GameLevel a spec produces — collision + spawns + goal, every
 * coordinate resolved from the segments so it MATCHES the painting derived from
 * the same spec. This is what the registry pairs with the rendered painting.
 */
export interface BuiltLevel {
  readonly id: string;
  readonly map: TileMap;
  readonly spawnX: number;
  readonly spawnY: number;
  readonly collectibles: readonly { x: number; y: number; value: number }[];
  readonly enemies: readonly { x: number; y: number; kind: "patrol" | "chase"; visual: SpecEnemy["visual"] }[];
  readonly pots: readonly { x: number; y: number; color: SpecPot["color"]; drop: SpecPot["drop"] }[];
  readonly npcs: readonly { x: number; y: number; dialogueId: string }[];
  readonly goalX: number;
}

/** Resolve a spec into a sim GameLevel (collision + world-space spawns + goal). */
export function buildLevel(spec: LevelSpec): BuiltLevel {
  const resolved = resolveSegments(spec);
  const at = (a: Anchor) => resolveAnchor(spec, resolved, a);
  // Spawn defaults to standing on the first segment, a little in from its left.
  const spawnPos = at(spec.spawn ?? { seg: 0, t: 0.04 });
  return {
    id: spec.id,
    map: buildCollision(spec),
    spawnX: spawnPos.x,
    // Spawn a touch above the surface so the player drops onto it.
    spawnY: spawnPos.y - 40,
    collectibles: spec.collectibles.map((c) => ({ ...at(c), value: c.value })),
    enemies: spec.enemies.map((e) => ({ ...at(e), kind: e.kind, visual: e.visual })),
    pots: spec.pots.map((p) => {
      const pos = at(p);
      // Pots rest with their base on the surface (Pot Size is 16 tall, anchored center-ish).
      return { x: pos.x, y: pos.y - 12, color: p.color, drop: p.drop };
    }),
    npcs: spec.npcs.map((n) => ({ ...at(n), dialogueId: n.dialogueId })),
    goalX: at(spec.goal).x,
  };
}

/**
 * INVARIANT CHECK (call in tests): every enemy/pot/collectible/npc/spawn sits at a
 * world-x strictly BEFORE the goal, so nothing is stranded past the win line. With
 * relative anchoring this holds by construction when the goal is on the last
 * walkable segment — this asserts the author didn't anchor something past it.
 */
export function spawnsBeforeGoal(spec: LevelSpec): boolean {
  const built = buildLevel(spec);
  const all = [...built.enemies, ...built.pots, ...built.collectibles, ...built.npcs];
  return all.every((s) => s.x < built.goalX) && built.spawnX < built.goalX;
}
