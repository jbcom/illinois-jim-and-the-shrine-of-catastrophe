/**
 * "The Descent" — the cave level, hand-PAINTED (composed for depth, not scattered)
 * from the VERIFIED cave catalog: the mainlev built elements (CAVE) plus the big
 * organic rock/flora brushes (CAVE_PROPS, sliced from props1/props2).
 *
 * Composition is layered back → front, baseline-anchored, ~2600px ≈ 5 screens
 * (a meaty standard level — docs/LEVEL_DESIGN.md). Story + difficulty beats,
 * left → right:
 *   ENTRANCE (0–700): Jim drops into a ruined chamber — brick ruins + a cavern
 *     tree, framed by tall rock masses. A safe runway, then the first goblin.
 *   CHASM (700–1500): broken ground with a gap bridged by wooden beam platforms
 *     over the dark; stalagmite spires above + below. The setpiece — a fall here
 *     is death (kill-plane). Flying eye + mushroom.
 *   DEEP (1500–2600): the cave narrows toward red-gem ruins; rock columns close
 *     in, a skeleton guards the glowing relic block — the goal (pull to the Shrine).
 *
 * World px; collision + spawns mirror these placements in src/sim/world/gameLevel.ts
 * (FLOOR_Y 300).
 */
import { CAVE, CAVE_PROPS as P } from "@render/caveShapes.ts";
import type { Placement } from "@render/composition.ts";

const FLOOR_Y = 300;

/** Place a stamp so its BASE sits on `baseY` (anchors rock/flora to the ground). */
function on(
  stamp: Placement["stamp"],
  x: number,
  baseY: number,
  scale: number,
  z: number,
  flipX = false,
): Placement {
  return { stamp, x, y: baseY - stamp.h * scale, scale, z, flipX };
}

/**
 * Place a CEILING stamp hanging from `topY`. The rock spires/chunks point UP in
 * the sheet, so flipY mirrors them to hang point-DOWN as stalactites.
 */
function ceil(
  stamp: Placement["stamp"],
  x: number,
  topY: number,
  scale: number,
  z: number,
  flipX = false,
): Placement {
  return { stamp, x, y: topY, scale, z, flipX, flipY: true };
}

export const CAVE_DESCENT: readonly Placement[] = [
  // ===================== CEILING (z 0): jagged rock + stalactites =====================
  ceil(P.spire, 60, -40, 1.1, 0, true),
  ceil(P.chunk, 240, -70, 0.8, 0),
  ceil(P.spire, 460, -30, 0.9, 0),
  ceil(P.chunk, 700, -60, 0.7, 0, true),
  ceil(P.spire, 960, -36, 1.2, 0),
  ceil(P.chunk, 1240, -64, 0.8, 0),
  ceil(P.spire, 1520, -40, 1, 0, true),
  ceil(P.chunk, 1820, -60, 0.75, 0),
  ceil(P.spire, 2120, -34, 1.1, 0),
  ceil(P.chunk, 2400, -64, 0.8, 0, true),

  // ===================== BACK WALL (z 1): big rock masses frame the depth ====
  on(P.rockTall, -40, FLOOR_Y, 1, 1),
  on(P.rockWide, 360, FLOOR_Y, 0.9, 1, true),
  on(P.rockTall, 1900, FLOOR_Y, 1.05, 1, true),
  on(P.rockWide, 2280, FLOOR_Y, 0.95, 1),

  // ============ ENTRANCE (0–700): ruined chamber, a cavern tree, safe runway ====
  on(CAVE.brickWallA, 40, FLOOR_Y, 1.1, 2),
  on(CAVE.brickWallB, 130, FLOOR_Y, 1.1, 2),
  on(P.tree, 250, FLOOR_Y, 0.7, 2),
  on(CAVE.crateA, 420, FLOOR_Y, 1, 4),
  on(CAVE.crateB, 470, FLOOR_Y, 0.9, 4, true),
  on(P.bush, 560, FLOOR_Y, 0.8, 5),
  on(P.column, 640, FLOOR_Y, 1, 2),

  // ============ CHASM (700–1500): broken ground + beam bridge over the dark ====
  // Ground masses on each lip; a gap in the middle (no rock = the chasm).
  on(P.rockMass, 700, FLOOR_Y, 0.55, 3),
  on(P.rockLedge, 980, FLOOR_Y, 0.7, 3), // left chasm lip
  // — chasm gap (≈1080–1320), bridged by beams below —
  on(P.rockLedge, 1320, FLOOR_Y, 0.7, 3, true), // right chasm lip
  on(P.rockMass, 1500, FLOOR_Y, 0.5, 3, true),
  // Wooden beam platforms bridging the gap (two hops).
  on(CAVE.beamLong, 1080, FLOOR_Y - 70, 0.9, 4),
  on(CAVE.beamLong2, 1200, FLOOR_Y - 134, 0.9, 4),
  on(P.column, 1040, FLOOR_Y, 0.8, 2, true),
  on(P.column, 1360, FLOOR_Y, 0.85, 2),

  // ============ DEEP (1500–2600): the cave narrows to the red-gem relic =========
  on(P.tree2, 1620, FLOOR_Y, 0.6, 2, true),
  on(CAVE.brickWallA, 1820, FLOOR_Y, 1.1, 2, true),
  on(CAVE.brickWallB, 1910, FLOOR_Y, 1.1, 2),
  on(P.rockMassSm, 2040, FLOOR_Y, 1, 3),
  on(P.bushWide, 2180, FLOOR_Y, 0.8, 5),
  on(P.column, 2300, FLOOR_Y, 1, 2, true),
  // GOAL: the glowing-relic rock block set in the far wall.
  on(CAVE.relicBlock, 2440, FLOOR_Y, 1.4, 6),
];

/** The painting's pixel extents (camera bounds / collision authoring). */
export const CAVE_DESCENT_BOUNDS = { width: 2600, floorY: FLOOR_Y } as const;

/**
 * The authored vertical frame, in world px. Cover-scaled to fill the canvas
 * height. Top above the highest ceiling rock; bottom below the floor so solid
 * ground reaches the screen edge.
 */
export const CAVE_DESCENT_FRAME = { top: -30, bottom: FLOOR_Y + 60 } as const;
