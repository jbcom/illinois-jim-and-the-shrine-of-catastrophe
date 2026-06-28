/**
 * Cave shape catalog — named organic stamps cut from the cave biome sheet
 * (`biomes/caves/mainlev_build.png`). These are the brushes used to PAINT a cave
 * level (see composition.ts). Rects were measured by connected-component analysis
 * of the sheet, not guessed.
 *
 * The cave kit is a room set: big detailed rock-fill panels (ground mass), wooden
 * beam platforms, jagged corner formations, and wall slabs.
 */
import type { ShapeStamp } from "@render/composition.ts";

const SHEET = "/assets/biomes/caves/mainlev_build.png";
const stamp = (x: number, y: number, w: number, h: number): ShapeStamp => ({ sheet: SHEET, x, y, w, h });

export const CAVE = {
  /** Detailed crushed-rock fill panels — main ground/rubble mass (96×64). */
  rubbleA: stamp(224, 736, 96, 64),
  rubbleB: stamp(224, 816, 96, 64),
  /** Wooden beam platforms (170×16) — horizontal ledges to stand on. */
  beamLong: stamp(755, 16, 170, 16),
  beamLong2: stamp(755, 48, 170, 16),
  /** Masonry brick-wall panels (~80×80) — built cave-wall sections. */
  brickWallA: stamp(832, 512, 80, 80),
  brickWallB: stamp(924, 512, 84, 80),
  /** Tall wall slabs / pillars (32×~92). */
  wallSlabA: stamp(832, 288, 32, 92),
  wallSlabB: stamp(976, 288, 32, 92),
  /**
   * The glowing-relic rock block (64×64) — a red gem set in rock. The story's
   * idol/shrine marker; place it as the goal at a level's end.
   */
  relicBlock: stamp(624, 768, 64, 64),
} as const;

export type CaveShapeName = keyof typeof CAVE;
