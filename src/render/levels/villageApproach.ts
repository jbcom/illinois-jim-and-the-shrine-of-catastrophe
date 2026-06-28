/**
 * "Halward's Reach" — the OPENING level, hand-PAINTED (composed, not scattered)
 * from the verified overworld + Decor catalog. The story starts here, on the
 * surface, BEFORE any cave.
 *
 * Composition is layered for DEPTH (back → front), every prop baseline-anchored
 * so it sits ON the ground, with deliberate story beats read left → right:
 *
 *   BACKDROP (z 0–1): a receding treeline — tall oaks + pines, smaller and set
 *     back, framing the scene and giving the forest density behind the village.
 *   MIDGROUND (z 2): the village proper — a stone house, two tents, a weeping
 *     willow as the focal tree, the angel statue. Where the NPCs stand.
 *   GROUND (z −1): a continuous earth band (separate solid fill behind it).
 *   FOREGROUND (z 4–6): boulders, bushes, grass tufts, a clothesline, market
 *     crates — the layer Jim passes IN FRONT of, the thing that sells the depth.
 *
 * Story beats: home + village life (left) → the forest road (middle, first
 * enemies) → the statue & lone torch at the dark trailhead (right) = the goal.
 *
 * ~2240px ≈ 4 screens (standard intro length — docs/LEVEL_DESIGN.md). World px;
 * collision + spawns mirror these placements in src/sim/world/gameLevel.ts.
 */
import type { Placement } from "@render/composition.ts";
import { DECOR_SHAPES as D, OVERWORLD as O } from "@render/overworldShapes.ts";

const GROUND_Y = 300;
const LEVEL_W = 2240;

/** Place a stamp so its BASE sits on `baseY` (anchors props to the ground). */
function onGround(
  stamp: Placement["stamp"],
  x: number,
  baseY: number,
  scale: number,
  z: number,
  flipX = false,
): Placement {
  return { stamp, x, y: baseY - stamp.h * scale, scale, z, flipX };
}

/** Continuous earth band — the grass-topped dirt block tiled across the level. */
const GBLK = 96 * 0.8;
const GROUND_STRIP: Placement[] = [];
for (let x = -GBLK; x < LEVEL_W + GBLK; x += GBLK - 2) {
  GROUND_STRIP.push({ stamp: O.ground, x, y: GROUND_Y, scale: 0.8, z: -1 });
}

export const VILLAGE_APPROACH: readonly Placement[] = [
  ...GROUND_STRIP,

  // ============ BACKDROP (z 0): a receding treeline behind everything ============
  onGround(O.oakA, -60, GROUND_Y, 0.8, 0),
  onGround(O.pine, 120, GROUND_Y, 0.85, 0),
  onGround(O.oakC, 360, GROUND_Y, 0.7, 0, true),
  onGround(O.pine, 560, GROUND_Y, 0.7, 0),
  onGround(O.oakB, 760, GROUND_Y, 0.85, 0),
  onGround(O.pine, 1000, GROUND_Y, 0.75, 0, true),
  onGround(O.oakA, 1220, GROUND_Y, 0.8, 0, true),
  onGround(O.pine, 1480, GROUND_Y, 0.8, 0),
  onGround(O.oakC, 1700, GROUND_Y, 0.7, 0),
  onGround(O.pine, 1960, GROUND_Y, 0.85, 0, true),

  // ===================== VILLAGE (left): home + the warning =====================
  // The house — the focal building, set on the ground at mid-depth.
  onGround(O.house, 40, GROUND_Y, 0.78, 2),
  // Two tents clustered as the rest of the hamlet.
  onGround(O.tentLarge, 300, GROUND_Y, 0.95, 2),
  onGround(O.tentSmall, 430, GROUND_Y, 1, 2),
  // A weeping willow shading the village square (focal tree).
  onGround(O.willow, 540, GROUND_Y, 0.9, 1),
  // Village life — clothesline strung by the house, market crates, a torch.
  onGround(D.clothesline, 150, GROUND_Y, 0.8, 3),
  onGround(D.crate, 250, GROUND_Y, 0.9, 4),
  onGround(D.crate, 278, GROUND_Y, 0.8, 4, true),
  onGround(D.butcherBlock, 400, GROUND_Y, 0.9, 4),
  onGround(O.torch, 20, GROUND_Y, 0.6, 5),
  // Foreground bushes + grass framing the village edge.
  onGround(D.bushGreen, 110, GROUND_Y, 1.1, 6),
  onGround(O.grass, 350, GROUND_Y, 1, 6),
  onGround(D.bushGreen, 620, GROUND_Y, 1, 6, true),

  // ===================== FOREST ROAD (middle): the journey =====================
  // Roadside trees at mid-depth, varied species + heights for a natural line.
  onGround(O.birchA, 820, GROUND_Y, 1, 1),
  onGround(O.blossom, 940, GROUND_Y, 1, 1),
  onGround(O.oakB, 1080, GROUND_Y, 0.9, 1, true),
  onGround(O.birchB, 1260, GROUND_Y, 1, 1),
  onGround(O.willow, 1420, GROUND_Y, 0.8, 1, true),
  // Foreground scatter — boulders + bushes Jim weaves past (depth + cover).
  onGround(D.boulderBig, 900, GROUND_Y, 0.8, 6),
  onGround(D.bushAutumn, 1040, GROUND_Y, 1, 6),
  onGround(O.grass, 1180, GROUND_Y, 1, 6, true),
  onGround(D.bushGreen, 1340, GROUND_Y, 1.1, 6),
  onGround(D.boulderBig2, 1480, GROUND_Y, 0.7, 6, true),

  // ============== MOUNTAIN APPROACH (right): the forest thins, dread ==============
  // The angel statue — an old waymarker on the road to the shrine (foreboding).
  onGround(O.statue, 1640, GROUND_Y, 1.1, 2),
  // A broken brick ruin half-swallowed by the treeline — the past expedition.
  onGround(O.birchA, 1800, GROUND_Y, 0.85, 1),
  onGround(D.boulderBig, 1880, GROUND_Y, 0.8, 6),
  onGround(O.grass, 1720, GROUND_Y, 1, 6),
  onGround(D.bushAutumn, 2000, GROUND_Y, 1, 6, true),
  // The lone torch at the trailhead — the last light before the dark cave mouth.
  onGround(O.torch, 2120, GROUND_Y, 0.75, 5),
];

/** The painting's pixel extents (camera bounds / collision authoring). */
export const VILLAGE_APPROACH_BOUNDS = { width: LEVEL_W, floorY: GROUND_Y } as const;

/**
 * The authored vertical frame, in world px. Cover-scaled to fill the canvas
 * height (no letterbox). Top sits above the tallest tree canopy; bottom below
 * the road so the ground reaches the screen edge.
 */
export const VILLAGE_APPROACH_FRAME = { top: 70, bottom: GROUND_Y + 50 } as const;
