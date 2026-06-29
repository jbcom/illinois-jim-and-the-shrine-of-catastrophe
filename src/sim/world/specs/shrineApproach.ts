/**
 * Shrine-approach LevelSpec — the SINGLE SOURCE OF TRUTH for the 3rd level (the
 * sanctum approach). Sim-pure surface data; collision derives here, the painting
 * (render/levels/shrineApproach.ts) anchors stamps to the same segments.
 *
 * Surfaces L→R, ground-up: the GATEHALL colonnade (ground) → a broken-nave chasm
 * bridged by two staggered BEAMS → the inner sanctum floor → the cracked STAIRCASE
 * (a raised surface that IS the shrine-steps object) crowned by the golden idol
 * (the goal). The idol is reached past the last Warden.
 */
import type { LevelSpec } from "@sim/world/levelSpec.ts";

const BASELINE_Y = 300;

export const SHRINE_APPROACH_SPEC: LevelSpec = {
  id: "shrine-approach",
  baselineY: BASELINE_Y,
  tileSize: 16,
  rows: 22,
  segments: [
    { kind: "ground", length: 700 }, // 0  the gatehall colonnade
    { kind: "gap", length: 240 }, // 1  the broken-nave chasm
    { kind: "raised", length: 130, top: 70, anchorProp: "beam" }, // 2 lower beam
    { kind: "raised", length: 130, top: 134, anchorProp: "beam" }, // 3 upper beam (staggered)
    { kind: "ground", length: 520 }, // 4  the inner sanctum floor
    { kind: "raised", length: 280, top: 90, anchorProp: "shrine-steps" }, // 5 the grand staircase
  ],
  spawn: { seg: 0, t: 0.05 },
  goal: { seg: 5, t: 0.5 }, // the golden idol atop the staircase
  enemies: [
    { seg: 0, t: 0.3, kind: "patrol", visual: "skeleton" }, // gatehall
    { seg: 0, t: 0.7, kind: "patrol", visual: "mushroom" },
    { seg: 1, t: 0.5, dy: 70, kind: "patrol", visual: "flyingEye" }, // over the chasm
    { seg: 4, t: 0.4, kind: "chase", visual: "skeleton" },
    { seg: 4, t: 0.8, kind: "chase", visual: "goblin" },
    { seg: 5, t: 0.2, kind: "chase", visual: "skeleton" }, // the Warden on the steps
  ],
  pots: [
    { seg: 0, t: 0.45, color: "red", drop: "relic" },
    { seg: 0, t: 0.9, color: "white", drop: "secret" },
    { seg: 4, t: 0.6, color: "yellow", drop: "health" }, // before the climb
  ],
  collectibles: [
    { seg: 0, t: 0.6, value: 100 },
    { seg: 2, t: 0.5, dy: 24, value: 100 }, // over the lower beam
    { seg: 3, t: 0.5, dy: 24, value: 100 }, // over the upper beam
    { seg: 5, t: 0.3, dy: 20, value: 100 }, // partway up the staircase
  ],
  npcs: [],
};
