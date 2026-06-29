/**
 * Village (Halward's Reach) LevelSpec — the SINGLE SOURCE OF TRUTH for the 1st
 * level, the overworld opener. Sim-pure surface data; collision derives here, the
 * painting (render/levels/villageApproach.ts) anchors stamps to the same segments.
 *
 * The overworld is a continuous walkable ROAD (one ground segment, no chasm) — but
 * NOT a flat factory: it has ROOFTOP platforms anchored to the houses, the way an
 * overworld lets you jump onto the roofs of buildings. Each rooftop is a real
 * object (anchorProp "rooftop"), never a floating slab; a reward collectible sits
 * on each to justify the climb. NPCs + enemies stand on the road.
 */
import type { LevelSpec } from "@sim/world/levelSpec.ts";

const BASELINE_Y = 300;

export const VILLAGE_APPROACH_SPEC: LevelSpec = {
  id: "village-approach",
  baselineY: BASELINE_Y,
  tileSize: 16,
  rows: 22,
  segments: [
    { kind: "ground", length: 2240 }, // the continuous village road
  ],
  // Rooftops you can jump onto — each anchored to a building in the painting.
  platforms: [
    { at: { seg: 0, t: 0.018 }, width: 175, top: 120, anchorProp: "rooftop" }, // the stone house roof (house at x40)
    { at: { seg: 0, t: 0.134 }, width: 120, top: 96, anchorProp: "rooftop" }, // the large tent top (tent at x300)
  ],
  spawn: { seg: 0, t: 0.036 },
  goal: { seg: 0, t: 0.95 }, // the lone torch at the dark trailhead (the cave mouth)
  enemies: [
    // The forest road is where the first threats appear — all PATROL on the intro.
    { seg: 0, t: 0.48, kind: "patrol", visual: "goblin" },
    { seg: 0, t: 0.72, kind: "patrol", visual: "mushroom" },
    { seg: 0, t: 0.88, kind: "patrol", visual: "goblin" },
  ],
  pots: [
    { seg: 0, t: 0.16, color: "white", drop: "secret" }, // by the cooking fire
    { seg: 0, t: 0.55, color: "yellow", drop: "health" }, // mid-road
  ],
  collectibles: [
    { seg: 0, t: 0.44, value: 100 },
    { seg: 0, t: 0.68, value: 100 },
    // Rewards ON the rooftops (justify the platforms): one above each roof.
    { seg: 0, t: 0.05, dy: 130, value: 100 }, // over the house roof
    { seg: 0, t: 0.16, dy: 106, value: 100 }, // over the tent roof
  ],
  npcs: [
    // The villagers of Halward's Reach — the story's opening voices, on the road.
    { seg: 0, t: 0.07, dialogueId: "elder-mara" }, // by the house
    { seg: 0, t: 0.19, dialogueId: "watchman-pell" }, // by the small tent
    { seg: 0, t: 0.28, dialogueId: "ferryman-cole" }, // by the statue / water's edge
  ],
};
