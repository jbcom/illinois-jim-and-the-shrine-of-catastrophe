/**
 * Cave shape catalog — named organic stamps cut from the cave biome sheet
 * (`biomes/caves/mainlev_build.png`), the BRUSHES for painting a cave level
 * (see composition.ts). Every rect was measured by connected-component analysis
 * of the full sheet (148 distinct shapes) and classified by tone/aspect, then the
 * useful staging pieces named here. NOT a tile grid.
 *
 * Two tonal families compose the cave:
 *   • COOL blue-grey — ceiling stalactites + icy ledge shelves (overhead).
 *   • WARM brown — floor rock shelves, wall pillars, rubble masses (underfoot).
 * Plus built elements: brick-wall panels, wooden beams/door, and the glowing
 * red-gem relic block (the goal marker).
 */
import type { ShapeStamp } from "@render/composition.ts";

const SHEET = "/assets/biomes/caves/mainlev_build.png";
const stamp = (x: number, y: number, w: number, h: number): ShapeStamp => ({ sheet: SHEET, x, y, w, h });

export const CAVE = {
  // --- GROUND: warm rock shelves to stand on (wide, ~2.5:1) ---
  ledgeA: stamp(512, 688, 80, 32),
  ledgeB: stamp(832, 688, 80, 32),

  // --- GROUND MASS: detailed rubble-fill panels (96×64) ---
  rubbleA: stamp(224, 736, 96, 64),
  rubbleB: stamp(224, 816, 96, 64),

  // --- WALL PILLARS: tall warm rock columns (32×~92) ---
  pillarA: stamp(832, 288, 32, 92),
  pillarB: stamp(976, 288, 32, 92),
  pillarC: stamp(880, 400, 32, 96),
  pillarShort: stamp(48, 592, 32, 80),

  // --- BUILT: masonry brick-wall panels (80×80) ---
  brickWallA: stamp(832, 512, 80, 80),
  brickWallB: stamp(924, 512, 84, 80),

  // --- BUILT: wooden crate / X-braced barricades (48×48) ---
  crateA: stamp(752, 96, 48, 48),
  crateB: stamp(816, 96, 48, 48),

  // --- BUILT: wooden beam planks (170×16) — platforms ---
  beamLong: stamp(755, 16, 170, 16),
  beamLong2: stamp(755, 48, 170, 16),

  // --- CEILING: cool blue-grey stalactite blocks (overhead) ---
  stalactiteA: stamp(544, 16, 48, 64),
  stalactiteWide: stamp(128, 496, 48, 48),

  /**
   * The glowing-relic rock block (64×64) — a red gem set in rock. The story's
   * idol/shrine marker; place it as the goal at a level's end.
   */
  relicBlock: stamp(624, 768, 64, 64),
} as const;

export type CaveShapeName = keyof typeof CAVE;
