/**
 * "Halward's Reach" — the OPENING level, authored from VILLAGE_APPROACH_SPEC
 * (surfaces from the ground up); collision AND this painting both derive from it.
 * Composed from the verified overworld + Decor catalog, layered for DEPTH.
 *
 * The road is one continuous ground segment; the ROOFTOP platforms are stacked
 * over it, each anchored to a real building (the stone house, the large tent) —
 * the overworld lets Jim jump onto the roofs, and a reward sits on each. NPCs +
 * enemies stand on the road. Story beats L→R: home + village life → the forest
 * road (first enemies) → the statue & lone torch at the dark trailhead (the goal).
 */
import { paintingFromSpec, type PropPlacement } from "@render/levels/fromSpec.ts";
import { DECOR_SHAPES as D, OVERWORLD as O } from "@render/overworldShapes.ts";
import type { Placement } from "@render/composition.ts";
import { VILLAGE_APPROACH_SPEC } from "@sim/world/specs/villageApproach.ts";

const GROUND_Y = VILLAGE_APPROACH_SPEC.baselineY;
const LEVEL_W = 2240;

/** Continuous earth band — the grass-topped dirt block tiled across the level. */
const GBLK = 96 * 0.8;
const GROUND_STRIP: Placement[] = [];
for (let x = -GBLK; x < LEVEL_W + GBLK; x += GBLK - 2) {
  GROUND_STRIP.push({ stamp: O.ground, x, y: GROUND_Y, scale: 0.8, z: -1 });
}

/** Props anchored to the single road segment (seg 0) by fraction along it. */
const PROPS: readonly PropPlacement[] = [
  // BACKDROP (z 0): a receding treeline behind everything.
  { stamp: O.oakA, at: { seg: 0, t: -0.027 }, scale: 0.8, z: 0 },
  { stamp: O.pine, at: { seg: 0, t: 0.054 }, scale: 0.85, z: 0 },
  { stamp: O.oakC, at: { seg: 0, t: 0.161 }, scale: 0.7, z: 0, flipX: true },
  { stamp: O.pine, at: { seg: 0, t: 0.25 }, scale: 0.7, z: 0 },
  { stamp: O.oakB, at: { seg: 0, t: 0.339 }, scale: 0.85, z: 0 },
  { stamp: O.pine, at: { seg: 0, t: 0.446 }, scale: 0.75, z: 0, flipX: true },
  { stamp: O.oakA, at: { seg: 0, t: 0.545 }, scale: 0.8, z: 0, flipX: true },
  { stamp: O.pine, at: { seg: 0, t: 0.661 }, scale: 0.8, z: 0 },
  { stamp: O.oakC, at: { seg: 0, t: 0.759 }, scale: 0.7, z: 0 },
  { stamp: O.pine, at: { seg: 0, t: 0.875 }, scale: 0.85, z: 0, flipX: true },

  // VILLAGE (left): home + the warning. The HOUSE and TENT are the rooftops the
  // spec platforms ride on (drawn here; their tops = the standable surfaces).
  { stamp: O.house, at: { seg: 0, t: 0.018 }, scale: 0.78, z: 2 },
  { stamp: O.tentLarge, at: { seg: 0, t: 0.134 }, scale: 0.95, z: 2 },
  { stamp: O.tentSmall, at: { seg: 0, t: 0.192 }, scale: 1.0, z: 2 },
  { stamp: O.willow, at: { seg: 0, t: 0.241 }, scale: 0.9, z: 1 },
  { stamp: D.clothesline, at: { seg: 0, t: 0.067 }, scale: 0.8, z: 3 },
  { stamp: D.crate, at: { seg: 0, t: 0.112 }, scale: 0.9, z: 4 },
  { stamp: D.crate, at: { seg: 0, t: 0.124 }, scale: 0.8, z: 4, flipX: true },
  { stamp: D.butcherBlock, at: { seg: 0, t: 0.179 }, scale: 0.9, z: 4 },
  { stamp: O.torch, at: { seg: 0, t: 0.009 }, scale: 0.6, z: 5 },
  { stamp: D.bushGreen, at: { seg: 0, t: 0.049 }, scale: 1.1, z: 6 },
  { stamp: O.grass, at: { seg: 0, t: 0.156 }, scale: 1.0, z: 6 },
  { stamp: D.bushGreen, at: { seg: 0, t: 0.277 }, scale: 1.0, z: 6, flipX: true },

  // FOREST ROAD (middle): the journey — roadside trees + foreground scatter.
  { stamp: O.birchA, at: { seg: 0, t: 0.366 }, scale: 1.0, z: 1 },
  { stamp: O.blossom, at: { seg: 0, t: 0.42 }, scale: 1.0, z: 1 },
  { stamp: O.oakB, at: { seg: 0, t: 0.482 }, scale: 0.9, z: 1, flipX: true },
  { stamp: O.birchB, at: { seg: 0, t: 0.563 }, scale: 1.0, z: 1 },
  { stamp: O.willow, at: { seg: 0, t: 0.634 }, scale: 0.8, z: 1, flipX: true },
  { stamp: D.boulderBig, at: { seg: 0, t: 0.402 }, scale: 0.8, z: 6 },
  { stamp: D.bushAutumn, at: { seg: 0, t: 0.464 }, scale: 1.0, z: 6 },
  { stamp: O.grass, at: { seg: 0, t: 0.527 }, scale: 1.0, z: 6, flipX: true },
  { stamp: D.bushGreen, at: { seg: 0, t: 0.598 }, scale: 1.1, z: 6 },
  { stamp: D.boulderBig2, at: { seg: 0, t: 0.661 }, scale: 0.7, z: 6, flipX: true },

  // MOUNTAIN APPROACH (right): the forest thins, dread — statue, ruin, lone torch.
  { stamp: O.statue, at: { seg: 0, t: 0.732 }, scale: 1.1, z: 2 },
  { stamp: O.birchA, at: { seg: 0, t: 0.804 }, scale: 0.85, z: 1 },
  { stamp: D.boulderBig, at: { seg: 0, t: 0.839 }, scale: 0.8, z: 6 },
  { stamp: O.grass, at: { seg: 0, t: 0.768 }, scale: 1.0, z: 6 },
  { stamp: D.bushAutumn, at: { seg: 0, t: 0.893 }, scale: 1.0, z: 6, flipX: true },
  { stamp: O.torch, at: { seg: 0, t: 0.946 }, scale: 0.75, z: 5 },
];

export const VILLAGE_APPROACH: readonly Placement[] = [
  ...GROUND_STRIP,
  ...paintingFromSpec(VILLAGE_APPROACH_SPEC, PROPS),
];

/**
 * The authored vertical frame, in world px. Top sits above the tallest tree canopy
 * AND the rooftops Jim can climb to; bottom below the road so ground reaches the edge.
 */
export const VILLAGE_APPROACH_FRAME = { top: 70, bottom: GROUND_Y + 50 } as const;
