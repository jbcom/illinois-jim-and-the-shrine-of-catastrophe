/**
 * "The Descent" — the first cave level, hand-PAINTED from cave shape stamps.
 *
 * The scene tells a beat of the story: Jim drops into the cave mouth (left),
 * crosses broken ground and beam platforms past brick ruins, toward the glowing
 * relic block set in the far wall (right) — the pull toward the Shrine. This is
 * authored composition (a painting), not a tile grid; collision is separate.
 *
 * Coordinates are world px for a ~960-wide opening stretch.
 */
import { CAVE } from "@render/caveShapes.ts";
import type { Placement } from "@render/composition.ts";

const FLOOR_Y = 300;

export const CAVE_DESCENT: readonly Placement[] = [
  // --- back wall masonry (z 0): brick sections framing the chamber ---
  { stamp: CAVE.brickWallA, x: 40, y: FLOOR_Y - 150, scale: 1.1, z: 0 },
  { stamp: CAVE.brickWallB, x: 150, y: FLOOR_Y - 150, scale: 1.1, z: 0 },
  { stamp: CAVE.brickWallA, x: 600, y: FLOOR_Y - 160, scale: 1.2, z: 0, flipX: true },
  { stamp: CAVE.brickWallB, x: 720, y: FLOOR_Y - 160, scale: 1.2, z: 0 },

  // --- side pillars (z 1) framing the opening ---
  { stamp: CAVE.wallSlabA, x: 0, y: FLOOR_Y - 184, scale: 2, z: 1 },
  { stamp: CAVE.wallSlabB, x: 912, y: FLOOR_Y - 184, scale: 2, z: 1 },

  // --- ground mass (z 2): rubble panels laid as the floor ---
  { stamp: CAVE.rubbleA, x: 30, y: FLOOR_Y, scale: 1, z: 2 },
  { stamp: CAVE.rubbleB, x: 126, y: FLOOR_Y, scale: 1, z: 2 },
  { stamp: CAVE.rubbleA, x: 222, y: FLOOR_Y, scale: 1, z: 2, flipX: true },
  { stamp: CAVE.rubbleB, x: 318, y: FLOOR_Y, scale: 1, z: 2 },
  { stamp: CAVE.rubbleA, x: 600, y: FLOOR_Y, scale: 1, z: 2 },
  { stamp: CAVE.rubbleB, x: 696, y: FLOOR_Y, scale: 1, z: 2, flipX: true },
  { stamp: CAVE.rubbleA, x: 792, y: FLOOR_Y, scale: 1, z: 2 },

  // --- beam platforms (z 3) to cross the gap in the middle ---
  { stamp: CAVE.beamLong, x: 360, y: FLOOR_Y - 70, scale: 1, z: 3 },
  { stamp: CAVE.beamLong2, x: 470, y: FLOOR_Y - 130, scale: 1, z: 3 },

  // --- the goal: the glowing relic block set in the far wall (z 4) ---
  { stamp: CAVE.relicBlock, x: 856, y: FLOOR_Y - 96, scale: 1.3, z: 4 },
];

/** The painting's pixel extents (for camera bounds / collision authoring). */
export const CAVE_DESCENT_BOUNDS = { width: 1000, floorY: FLOOR_Y } as const;
