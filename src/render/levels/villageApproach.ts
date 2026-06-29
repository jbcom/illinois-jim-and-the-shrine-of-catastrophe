/**
 * "Halward's Reach" — the OPENING level, authored from VILLAGE_APPROACH_SPEC as a
 * VERTICAL platforming scene. A contiguous grass floor (covering, no brown void)
 * with most of the play space ABOVE it as climbable rooftops / awnings / walls —
 * each drawn AT its collision platform (platformPaintings), so visual = standable.
 *
 * Layered back→front: parallax (engine) → treeline backdrop → buildings whose tops
 * ARE the platforms → foreground scatter. NPCs + enemies on the grass street.
 */
import { paintingFromSpec, platformPaintings, type PropPlacement } from "@render/levels/fromSpec.ts";
import { DECOR_SHAPES as D, OVERWORLD as O } from "@render/overworldShapes.ts";
import type { Placement } from "@render/composition.ts";
import { VILLAGE_APPROACH_SPEC } from "@sim/world/specs/villageApproach.ts";

const GROUND_Y = VILLAGE_APPROACH_SPEC.baselineY; // 320
const LEVEL_W = 2240;

/**
 * CONTIGUOUS grass — a THIN grass-cap strip (34px) tiled edge-to-edge along the
 * surface line, its top on GROUND_Y. The crafted earth groundFill (registry) sits
 * directly under it as a slim band; the frame bottom is just below, so the floor
 * is a slim crafted strip — NOT the old 96px dark-dirt block that read as a void.
 */
const GBLK = 96;
const GROUND_STRIP: Placement[] = [];
for (let x = -GBLK; x < LEVEL_W + GBLK; x += GBLK - 4) {
  GROUND_STRIP.push({ stamp: O.grassCap, x, y: GROUND_Y, scale: 1.0, z: 7 });
}

/**
 * The real objects whose TOPS are the platforms — drawn AT the resolved platform
 * position (platformPaintings) so the visible object lines up with its standable
 * collision row. Platform indices match the spec's `platforms` array order:
 * 0 porch-eave, 1 house-roof, 2 tent-top, 3 awning, 4 wagon, 5 garden-wall, 6 ruin-ledge.
 */
const PLATFORM_PAINT = platformPaintings(VILLAGE_APPROACH_SPEC, [
  // The house: draw the whole house so its ROOF sits at the house-roof platform
  // (platform 1). Its top edge is the roof; the porch-eave (platform 0) is the
  // lower step on the same building, so one house stamp serves both.
  { platform: 1, stamp: O.house, scale: 0.72, z: 2, dy: -6 },
  { platform: 2, stamp: O.tentLarge, scale: 0.9, z: 2, dy: -6 }, // tent canopy top
  { platform: 3, stamp: D.crate, scale: 1.1, z: 3 }, // market-stall awning ≈ crate top
  { platform: 4, stamp: D.crate, scale: 1.2, z: 3 }, // wagon ≈ a crate
  { platform: 5, stamp: D.brickWall, scale: 1.0, z: 3 }, // garden wall
  { platform: 6, stamp: O.statue, scale: 0.85, z: 3 }, // ruin ledge ≈ statue plinth
]);

/** Scenery props anchored to the grass street (seg 0) by fraction. */
const PROPS: readonly PropPlacement[] = [
  // BACKDROP (z 0): a receding treeline behind everything.
  { stamp: O.oakA, at: { seg: 0, t: -0.027 }, scale: 0.9, z: 0 },
  { stamp: O.pine, at: { seg: 0, t: 0.07 }, scale: 0.95, z: 0 },
  { stamp: O.oakC, at: { seg: 0, t: 0.22 }, scale: 0.8, z: 0, flipX: true },
  { stamp: O.pine, at: { seg: 0, t: 0.38 }, scale: 0.85, z: 0 },
  { stamp: O.oakB, at: { seg: 0, t: 0.5 }, scale: 0.95, z: 0, flipX: true },
  { stamp: O.pine, at: { seg: 0, t: 0.63 }, scale: 0.9, z: 0 },
  { stamp: O.oakA, at: { seg: 0, t: 0.78 }, scale: 0.85, z: 0, flipX: true },
  { stamp: O.pine, at: { seg: 0, t: 0.9 }, scale: 0.95, z: 0 },

  // VILLAGE LIFE on the street (z 3-4): tents, willow, clothesline, market.
  { stamp: O.tentSmall, at: { seg: 0, t: 0.14 }, scale: 1.0, z: 2 },
  { stamp: O.willow, at: { seg: 0, t: 0.26 }, scale: 0.9, z: 1 },
  { stamp: D.clothesline, at: { seg: 0, t: 0.11 }, scale: 0.8, z: 3 },
  { stamp: D.butcherBlock, at: { seg: 0, t: 0.34 }, scale: 0.9, z: 4 },
  { stamp: O.torch, at: { seg: 0, t: 0.01 }, scale: 0.7, z: 5 },
  { stamp: D.bushGreen, at: { seg: 0, t: 0.05 }, scale: 1.1, z: 6 },
  { stamp: O.grass, at: { seg: 0, t: 0.16 }, scale: 1.0, z: 6 },
  { stamp: D.bushGreen, at: { seg: 0, t: 0.28 }, scale: 1.0, z: 6, flipX: true },

  // FOREST ROAD (middle): roadside trees + foreground scatter.
  { stamp: O.birchA, at: { seg: 0, t: 0.4 }, scale: 1.0, z: 1 },
  { stamp: O.blossom, at: { seg: 0, t: 0.46 }, scale: 1.0, z: 1 },
  { stamp: O.birchB, at: { seg: 0, t: 0.62 }, scale: 1.0, z: 1 },
  { stamp: D.boulderBig, at: { seg: 0, t: 0.44 }, scale: 0.8, z: 6 },
  { stamp: D.bushAutumn, at: { seg: 0, t: 0.5 }, scale: 1.0, z: 6 },
  { stamp: O.grass, at: { seg: 0, t: 0.58 }, scale: 1.0, z: 6, flipX: true },
  { stamp: D.bushGreen, at: { seg: 0, t: 0.66 }, scale: 1.1, z: 6 },

  // MOUNTAIN APPROACH (right): the forest thins, dread — statue, ruin, lone torch.
  { stamp: O.statue, at: { seg: 0, t: 0.82 }, scale: 1.1, z: 2 },
  { stamp: D.boulderBig, at: { seg: 0, t: 0.86 }, scale: 0.8, z: 6 },
  { stamp: D.bushAutumn, at: { seg: 0, t: 0.9 }, scale: 1.0, z: 6, flipX: true },
  { stamp: O.torch, at: { seg: 0, t: 0.95 }, scale: 0.75, z: 5 },
];

export const VILLAGE_APPROACH: readonly Placement[] = [
  ...GROUND_STRIP,
  ...PLATFORM_PAINT,
  ...paintingFromSpec(VILLAGE_APPROACH_SPEC, PROPS),
];

/**
 * The authored vertical frame, derived by ALGEBRA against the cover-by-height
 * transform (worldScale = screenH / frameH) so the grass line lands at a TARGET
 * screen ratio — not jammed at 89% (the bug that made the floor a thick brown band
 * and squeezed the platforms into the top). frameTop sits above the highest
 * platform (the awning at baseline-96) with sky headroom; frameH is solved so the
 * grass surface is GRASS_RATIO down the band; frameBottom is just past the grass
 * cap so the tile's dirt body is the bottom sliver (the groundFill backs it).
 */
// frameTop sits above the highest platform (house-roof at worldY GROUND_Y-150=100)
// with sky headroom; frameBottom is only ~40px below the grass so the crafted
// earth strip is a slim band (~18% of the frame), never a void. Grass lands ~80%.
const FRAME_TOP = GROUND_Y - 170;
const FRAME_BOTTOM = GROUND_Y + 42;
export const VILLAGE_APPROACH_FRAME = { top: FRAME_TOP, bottom: FRAME_BOTTOM } as const;
