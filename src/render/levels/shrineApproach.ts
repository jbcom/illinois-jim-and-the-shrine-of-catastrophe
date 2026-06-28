/**
 * "The Shrine" — the third-act climax level, hand-PAINTED from the shrine prop
 * catalog (SHRINE_PROPS: idol-altar, cracked steps, braziers, broken pillars)
 * composed OVER the reused cave masonry (CAVE brick walls + beams, CAVE_PROPS
 * rock masses) so the inner sanctum reads as carved, ruined TEMPLE — built, not
 * wild cave. Matches cut-04-shrine: green-stone, tarnished gold, blood red.
 *
 * Layered back → front, baseline-anchored, ~2400px ≈ 4.5 screens. Story beats,
 * left → right (Jim has crossed the ruins; now he reaches the shrine itself):
 *   GATEHALL (0–700): a colonnade of broken temple pillars and the first braziers
 *     light the way in — a stately, ominous runway. The Warden's last warning.
 *   SANCTUM (700–1500): the ruined nave — masonry walls, fallen columns over a
 *     broken floor with a beam-bridged gap (a fall is death). Guardians stir.
 *   ALTAR (1500–2400): the cracked grand staircase rises to the golden idol on its
 *     altar — the GOAL. Braziers flank the steps; a skeleton warden guards the idol.
 *
 * World px; collision + spawns mirror these placements in src/sim/world/gameLevel.ts
 * (FLOOR_Y 300).
 */
import { CAVE, CAVE_PROPS as P } from "@render/caveShapes.ts";
import { SHRINE_PROPS as S } from "@render/shrineShapes.ts";
import type { Placement } from "@render/composition.ts";

const FLOOR_Y = 300;

/** Place a stamp so its BASE sits on `baseY` (anchors props to the ground). */
function on(stamp: Placement["stamp"], x: number, baseY: number, scale: number, z: number, flipX = false): Placement {
  return { stamp, x, y: baseY - stamp.h * scale, scale, z, flipX };
}

/** Place a CEILING stamp hanging from `topY` (flipY mirrors point-up rock to hang down). */
function ceil(stamp: Placement["stamp"], x: number, topY: number, scale: number, z: number, flipX = false): Placement {
  return { stamp, x, y: topY, scale, z, flipX, flipY: true };
}

export const SHRINE_APPROACH: readonly Placement[] = [
  // ===================== CEILING (z 0): jagged stalactite rock overhead =========
  ceil(P.spire, 80, -40, 1.0, 0),
  ceil(P.chunk, 320, -64, 0.8, 0, true),
  ceil(P.spire, 600, -34, 1.1, 0, true),
  ceil(P.chunk, 900, -60, 0.75, 0),
  ceil(P.spire, 1220, -40, 1.0, 0),
  ceil(P.chunk, 1540, -64, 0.8, 0, true),
  ceil(P.spire, 1860, -36, 1.1, 0, true),
  ceil(P.chunk, 2160, -60, 0.8, 0),

  // ===================== BACK WALL (z 1): rock masses frame the chamber depth ===
  on(P.rockTall, -40, FLOOR_Y, 1.0, 1),
  on(P.rockWide, 380, FLOOR_Y, 0.85, 1, true),
  on(P.rockTall, 1640, FLOOR_Y, 1.0, 1),
  on(P.rockWide, 2080, FLOOR_Y, 0.9, 1, true),

  // ============ GATEHALL (0–700): colonnade of broken pillars + braziers ========
  // Props scaled as SCENERY (~130–160px tall) so they frame the chamber without
  // dwarfing the ~16px-tall actors — in proportion with the cave catalog.
  on(CAVE.brickWallA, 30, FLOOR_Y, 1.1, 2),
  on(CAVE.brickWallB, 120, FLOOR_Y, 1.1, 2),
  on(S.pillarBroken, 230, FLOOR_Y, 0.22, 3),
  on(S.brazier, 360, FLOOR_Y, 0.26, 5),
  on(S.pillarBroken, 470, FLOOR_Y, 0.24, 3, true),
  on(S.brazier, 600, FLOOR_Y, 0.26, 5),
  on(S.pillarBroken, 660, FLOOR_Y, 0.2, 3),

  // ============ SANCTUM (700–1500): ruined nave, fallen columns, beam-bridged gap
  on(P.rockMass, 700, FLOOR_Y, 0.5, 2),
  on(CAVE.brickWallA, 820, FLOOR_Y, 1.1, 2, true),
  on(P.column, 940, FLOOR_Y, 0.85, 3), // a column fallen across the nave
  // — broken floor gap (≈1080–1320), bridged by two beam hops —
  on(CAVE.beamLong, 1080, FLOOR_Y - 70, 0.9, 4),
  on(CAVE.beamLong2, 1200, FLOOR_Y - 134, 0.9, 4),
  on(S.brazier, 1060, FLOOR_Y, 0.24, 5, true), // brazier at the gap's lip
  on(S.pillarBroken, 1340, FLOOR_Y, 0.24, 3, true), // far lip
  on(CAVE.brickWallB, 1440, FLOOR_Y, 1.1, 2),

  // ============ ALTAR (1500–2400): the grand staircase rises to the golden idol =
  on(S.brazier, 1560, FLOOR_Y, 0.28, 5),
  // The cracked grand staircase — the visual centerpiece of the final climb
  // (~190px tall, rising from the floor toward the idol's dais).
  on(S.steps, 1660, FLOOR_Y, 0.44, 3),
  on(S.brazier, 2120, FLOOR_Y, 0.28, 5, true),
  // GOAL: the golden idol on its altar, set on the staircase landing (base resting
  // ~at the top of the steps) so it crowns the climb. z above the steps.
  on(S.idol, 1850, FLOOR_Y - 110, 0.3, 6),
];

/** The painting's pixel extents (camera bounds / collision authoring). */
export const SHRINE_APPROACH_BOUNDS = { width: 2400, floorY: FLOOR_Y } as const;

/**
 * The authored vertical frame, in world px. Cover-scaled to fill the canvas
 * height. Top above the highest ceiling rock; bottom below the floor so solid
 * ground reaches the screen edge.
 */
export const SHRINE_APPROACH_FRAME = { top: -30, bottom: FLOOR_Y + 60 } as const;
