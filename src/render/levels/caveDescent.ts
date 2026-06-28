/**
 * "The Descent" — the first cave level, hand-PAINTED from the VERIFIED cave shape
 * catalog (every stamp was read + named before placement, not guessed).
 *
 * Staging tells the story beat: Jim enters a ruined cave chamber (left, framed by
 * wall pillars + brick ruins under a stalactite ceiling), crosses broken ground
 * and wooden beam platforms over a chasm (middle), to the glowing relic block set
 * in the far wall (right) — the pull toward the Shrine.
 *
 * World px; matches the collision in src/sim/world/gameLevel.ts (FLOOR_Y 300).
 * Painted ground sits along FLOOR_Y; the collision floor is authored to match.
 */
import { CAVE } from "@render/caveShapes.ts";
import type { Placement } from "@render/composition.ts";

const FLOOR_Y = 300;

export const CAVE_DESCENT: readonly Placement[] = [
  // === CEILING (z 0): stalactites hang across the top ===
  { stamp: CAVE.stalactiteA, x: 40, y: -10, scale: 1.2, z: 0 },
  { stamp: CAVE.stalactiteA, x: 230, y: -16, scale: 1, z: 0, flipX: true },
  { stamp: CAVE.stalactiteA, x: 470, y: -10, scale: 1.3, z: 0 },
  { stamp: CAVE.stalactiteA, x: 700, y: -14, scale: 1.1, z: 0, flipX: true },
  { stamp: CAVE.stalactiteA, x: 880, y: -10, scale: 1.2, z: 0 },

  // === BACK WALL (z 1): brick ruins framing the chamber ===
  { stamp: CAVE.brickWallA, x: 30, y: FLOOR_Y - 150, scale: 1, z: 1 },
  { stamp: CAVE.brickWallB, x: 110, y: FLOOR_Y - 150, scale: 1, z: 1 },
  { stamp: CAVE.brickWallA, x: 620, y: FLOOR_Y - 160, scale: 1.1, z: 1, flipX: true },
  { stamp: CAVE.brickWallB, x: 730, y: FLOOR_Y - 160, scale: 1.1, z: 1 },

  // === PILLARS (z 2): frame the entrance + mark the chasm edges ===
  { stamp: CAVE.pillarA, x: 0, y: FLOOR_Y - 184, scale: 2, z: 2 },
  { stamp: CAVE.pillarB, x: 340, y: FLOOR_Y - 130, scale: 1.4, z: 2 },
  { stamp: CAVE.pillarA, x: 560, y: FLOOR_Y - 130, scale: 1.4, z: 2, flipX: true },
  { stamp: CAVE.pillarB, x: 960, y: FLOOR_Y - 184, scale: 2, z: 2 },

  // === GROUND (z 3): rubble masses + rock ledges form the floor ===
  { stamp: CAVE.rubbleA, x: 20, y: FLOOR_Y, scale: 1, z: 3 },
  { stamp: CAVE.rubbleB, x: 116, y: FLOOR_Y, scale: 1, z: 3, flipX: true },
  { stamp: CAVE.rubbleA, x: 212, y: FLOOR_Y, scale: 1, z: 3 },
  { stamp: CAVE.ledgeA, x: 308, y: FLOOR_Y, scale: 1, z: 3 }, // chasm lip (left)
  // — chasm gap cols here, bridged by beams below —
  { stamp: CAVE.ledgeB, x: 560, y: FLOOR_Y, scale: 1, z: 3 }, // chasm lip (right)
  { stamp: CAVE.rubbleB, x: 640, y: FLOOR_Y, scale: 1, z: 3 },
  { stamp: CAVE.rubbleA, x: 736, y: FLOOR_Y, scale: 1, z: 3, flipX: true },
  { stamp: CAVE.rubbleB, x: 832, y: FLOOR_Y, scale: 1, z: 3 },

  // === BEAM PLATFORMS (z 4): bridge the chasm in two hops ===
  { stamp: CAVE.beamLong, x: 352, y: FLOOR_Y - 64, scale: 0.9, z: 4 },
  { stamp: CAVE.beamLong2, x: 464, y: FLOOR_Y - 128, scale: 0.9, z: 4 },

  // === BUILT CLUTTER (z 4): crates near the ruins for flavor ===
  { stamp: CAVE.crateA, x: 200, y: FLOOR_Y - 48, scale: 1, z: 4 },
  { stamp: CAVE.crateB, x: 690, y: FLOOR_Y - 48, scale: 1, z: 4 },

  // === GOAL (z 5): the glowing relic block in the far wall ===
  { stamp: CAVE.relicBlock, x: 872, y: FLOOR_Y - 96, scale: 1.3, z: 5 },
];

/** The painting's pixel extents (camera bounds / collision authoring). */
export const CAVE_DESCENT_BOUNDS = { width: 1024, floorY: FLOOR_Y } as const;

/**
 * The authored vertical frame of the level, in world px. The renderer
 * cover-scales this band to fill the canvas height edge-to-edge (no letterbox).
 * Top sits just above the highest stalactite (y ≈ -16); bottom sits below the
 * floor base (FLOOR_Y 300 + ~60px of solid ground) so the cave floor reaches the
 * bottom screen edge. ~380px tall — matches the side-scroller's playable band.
 */
export const CAVE_DESCENT_FRAME = { top: -20, bottom: FLOOR_Y + 60 } as const;
