/**
 * "Halward's Reach" — the OPENING level, hand-PAINTED from the verified overworld
 * shape catalog. This is where the story starts (surface world), BEFORE any cave.
 *
 * Story staging, left → right (the road to the mountain):
 *   • VILLAGE (left, 0–700): houses, tents, a cooking fire, torches, the angel
 *     statue — Halward's Reach, where Elder Mara warns Jim. NPCs stand here.
 *   • FOREST ROAD (middle, 700–1500): the tree-lined path out of the village,
 *     birches + oaks + blossom, grass tufts — the journey begins. First enemies.
 *   • MOUNTAIN APPROACH (right, 1500–2200): the forest thins, the ground rises
 *     toward the dark cave mouth — the goal. Reaching it triggers the descent.
 *
 * ~2200px wide ≈ 4 screens (a standard intro length — see docs/LEVEL_DESIGN.md).
 * World px; the collision floor + spawns mirror these placements in
 * src/sim/world/gameLevel.ts. Painted ground sits along GROUND_Y.
 */
import type { Placement } from "@render/composition.ts";
import { OVERWORLD as O } from "@render/overworldShapes.ts";

const GROUND_Y = 300;
const LEVEL_W = 2240;

/**
 * A continuous painted ground band along the bottom — the grass-topped dirt
 * block tiled across the whole level (z −1, behind everything) so Jim walks on a
 * real surface that fills to the screen edge, not sparse tufts over the sky. The
 * 96px block is drawn at 0.8 (≈77px) and stepped by ~74px for a slight overlap
 * (no seams). Its grass top lands at GROUND_Y; the dirt fills below to the frame.
 */
const GROUND_BLOCK = 96 * 0.8;
const GROUND_STRIP: Placement[] = [];
for (let x = -GROUND_BLOCK; x < LEVEL_W + GROUND_BLOCK; x += GROUND_BLOCK - 2) {
  GROUND_STRIP.push({ stamp: O.ground, x, y: GROUND_Y, scale: 0.8, z: -1 });
}

export const VILLAGE_APPROACH: readonly Placement[] = [
  ...GROUND_STRIP,
  // ===================== VILLAGE (left): home, the warning =====================
  // Back tree line framing the village
  { stamp: O.oakA, x: -40, y: GROUND_Y - 190, scale: 0.9, z: 0 },
  { stamp: O.pine, x: 150, y: GROUND_Y - 150, scale: 1, z: 0 },
  { stamp: O.oakC, x: 540, y: GROUND_Y - 190, scale: 0.85, z: 0, flipX: true },

  // Buildings (mid)
  { stamp: O.house, x: 60, y: GROUND_Y - 150, scale: 0.7, z: 2 },
  { stamp: O.tentLarge, x: 300, y: GROUND_Y - 96, scale: 0.9, z: 2 },
  { stamp: O.tentSmall, x: 420, y: GROUND_Y - 56, scale: 1, z: 2 },

  // Village life (front flavor) — the hearth tucked between the tents.
  { stamp: O.cookfire, x: 330, y: GROUND_Y - 28, scale: 0.22, z: 3 },
  { stamp: O.torch, x: 30, y: GROUND_Y - 96, scale: 0.6, z: 3 },
  { stamp: O.torch, x: 500, y: GROUND_Y - 96, scale: 0.6, z: 3, flipX: true },
  { stamp: O.statue, x: 600, y: GROUND_Y - 64, scale: 1, z: 3 },
  { stamp: O.grass, x: 360, y: GROUND_Y - 18, scale: 1, z: 4 },

  // ===================== FOREST ROAD (middle): the journey =====================
  { stamp: O.oakB, x: 720, y: GROUND_Y - 190, scale: 1, z: 0 },
  { stamp: O.birchA, x: 900, y: GROUND_Y - 105, scale: 1, z: 1 },
  { stamp: O.birchB, x: 980, y: GROUND_Y - 105, scale: 1, z: 1, flipX: true },
  { stamp: O.blossom, x: 1120, y: GROUND_Y - 105, scale: 1, z: 1 },
  { stamp: O.oakA, x: 1240, y: GROUND_Y - 190, scale: 1, z: 0, flipX: true },
  { stamp: O.willow, x: 1380, y: GROUND_Y - 180, scale: 0.9, z: 1 },
  { stamp: O.grass, x: 820, y: GROUND_Y - 18, scale: 1, z: 4 },
  { stamp: O.grass, x: 1060, y: GROUND_Y - 18, scale: 1, z: 4, flipX: true },
  { stamp: O.grass, x: 1300, y: GROUND_Y - 18, scale: 1, z: 4 },

  // ============== MOUNTAIN APPROACH (right): the forest thins ==============
  { stamp: O.pine, x: 1560, y: GROUND_Y - 150, scale: 1.1, z: 0 },
  { stamp: O.oakC, x: 1700, y: GROUND_Y - 190, scale: 0.8, z: 0 },
  { stamp: O.birchA, x: 1880, y: GROUND_Y - 105, scale: 0.9, z: 1 },
  { stamp: O.grass, x: 1640, y: GROUND_Y - 18, scale: 1, z: 4 },
  { stamp: O.grass, x: 1980, y: GROUND_Y - 18, scale: 1, z: 4 },
  // The lone torch at the trailhead — last light before the dark.
  { stamp: O.torch, x: 2060, y: GROUND_Y - 96, scale: 0.7, z: 3 },
];

/** The painting's pixel extents (camera bounds / collision authoring). */
export const VILLAGE_APPROACH_BOUNDS = { width: 2240, floorY: GROUND_Y } as const;

/**
 * The authored vertical frame, in world px. Cover-scaled to fill the canvas
 * height (no letterbox). Top sits above the tallest canopy (oak tops at
 * GROUND_Y−190 ≈ 110), bottom below the road so grass reaches the screen edge.
 */
export const VILLAGE_APPROACH_FRAME = { top: 80, bottom: GROUND_Y + 60 } as const;
