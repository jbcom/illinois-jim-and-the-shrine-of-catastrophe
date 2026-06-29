/**
 * Village (Halward's Reach) LevelSpec — the 1st level, the overworld opener, as a
 * VERTICAL platforming scene (not a flat road with a wasted ground void). The
 * floor is contiguous grass; ABOVE it most of the play space is climbable
 * PLATFORMS, every one a real anchored object: the rooftops of the houses, a
 * market-stall awning, a garden wall, a wagon. Jim can take the high road across
 * the rooftops or the low road through the street.
 *
 * Sim-pure surface data; collision derives here, the painting
 * (render/levels/villageApproach.ts) anchors stamps to the same segments + platforms.
 */
import type { LevelSpec } from "@sim/world/levelSpec.ts";

// The grass floor surface. The FRAME (render side) is sized so this lands at
// ~75% of screen height — NOT jammed at the bottom — so the platform band above
// owns the majority of the screen and the grass tile's dirt body is a thin strip.
const BASELINE_Y = 250;

export const VILLAGE_APPROACH_SPEC: LevelSpec = {
  id: "village-approach",
  baselineY: BASELINE_Y,
  tileSize: 16,
  rows: 26,
  segments: [
    { kind: "ground", length: 2240 }, // the continuous grass road
  ],
  // Rooftops / walls / awnings you climb — most of the scene is THIS vertical
  // layer. Each is a real object (the painting draws it); tops are standable. The
  // `top` heights (px above the grass) form a CLIMBABLE staircase: low steps lead
  // up to higher roofs, and all sit within the frame (highest ≈ 150 below the top).
  platforms: [
    { at: { seg: 0, t: 0.085 }, width: 80, top: 60, anchorProp: "porch-eave" }, // low step: the house porch eave
    { at: { seg: 0, t: 0.03 }, width: 140, top: 150, anchorProp: "house-roof" }, // up to the house roof
    { at: { seg: 0, t: 0.19 }, width: 100, top: 100, anchorProp: "tent-top" }, // the large tent canopy
    { at: { seg: 0, t: 0.3 }, width: 70, top: 70, anchorProp: "awning" }, // a market-stall awning
    { at: { seg: 0, t: 0.42 }, width: 64, top: 110, anchorProp: "wagon" }, // a wagon to hop on
    { at: { seg: 0, t: 0.56 }, width: 110, top: 80, anchorProp: "garden-wall" }, // a low garden wall walk
    { at: { seg: 0, t: 0.72 }, width: 80, top: 120, anchorProp: "ruin-ledge" }, // a broken ruin ledge
  ],
  spawn: { seg: 0, t: 0.03 },
  goal: { seg: 0, t: 0.95 }, // the lone torch at the dark trailhead (the cave mouth)
  enemies: [
    { seg: 0, t: 0.48, kind: "patrol", visual: "goblin" },
    { seg: 0, t: 0.72, kind: "patrol", visual: "mushroom" },
    { seg: 0, t: 0.88, kind: "patrol", visual: "goblin" },
  ],
  pots: [
    { seg: 0, t: 0.16, color: "white", drop: "secret" },
    { seg: 0, t: 0.55, color: "yellow", drop: "health" },
  ],
  collectibles: [
    { seg: 0, t: 0.44, value: 100 },
    { seg: 0, t: 0.68, value: 100 },
    // Rewards ON the high platforms — the reason to climb the vertical route
    // (dy = the platform's `top` + a little, so the coin sits just above its deck).
    { seg: 0, t: 0.07, dy: 168, value: 100 }, // on the house roof (top 150)
    { seg: 0, t: 0.2, dy: 118, value: 100 }, // on the tent canopy (top 100)
    { seg: 0, t: 0.31, dy: 88, value: 100 }, // on the awning (top 70)
    { seg: 0, t: 0.59, dy: 98, value: 100 }, // on the garden wall (top 80)
  ],
  npcs: [
    { seg: 0, t: 0.08, dialogueId: "elder-mara" }, // by the house, on the street
    { seg: 0, t: 0.24, dialogueId: "watchman-pell" }, // by the tents
    { seg: 0, t: 0.36, dialogueId: "ferryman-cole" }, // by the market
  ],
};
