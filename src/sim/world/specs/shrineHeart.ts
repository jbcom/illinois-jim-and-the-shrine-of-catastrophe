/**
 * Shrine-heart LevelSpec — the SINGLE SOURCE OF TRUTH for the 4th level (the idol
 * grab). Sim-pure surface data (no render imports): the collision is derived from
 * it here, and the render painting (render/levels/shrineHeart.ts) anchors its prop
 * stamps to the SAME segments, so the two can never drift.
 *
 * Surfaces L→R, ground-up: a processional NAVE → a chasm bridged by a BEAM
 * (raised, anchored to that beam object) → inner nave → a deeper chasm bridged by
 * two staggered BEAMS → the inner hall → the cracked STAIRCASE (a raised surface
 * that IS the shrine-steps object) crowned by the enthroned idol (the goal).
 */
import type { LevelSpec } from "@sim/world/levelSpec.ts";

const BASELINE_Y = 300;

export const SHRINE_HEART_SPEC: LevelSpec = {
  id: "shrine-heart",
  baselineY: BASELINE_Y,
  tileSize: 16,
  rows: 22,
  segments: [
    { kind: "ground", length: 560 }, // 0  the processional nave
    { kind: "gap", length: 200 }, // 1  first chasm
    { kind: "raised", length: 200, top: 64, anchorProp: "beam" }, // 2 a beam bridging it
    { kind: "ground", length: 360 }, // 3  inner nave
    { kind: "gap", length: 240 }, // 4  deeper chasm
    { kind: "raised", length: 130, top: 70, anchorProp: "beam" }, // 5 lower beam
    { kind: "raised", length: 130, top: 130, anchorProp: "beam" }, // 6 upper beam (staggered)
    { kind: "ground", length: 360 }, // 7  the inner hall floor
    { kind: "raised", length: 260, top: 86, anchorProp: "shrine-steps" }, // 8 the staircase
  ],
  spawn: { seg: 0, t: 0.06 },
  goal: { seg: 8, t: 0.5 }, // atop the staircase landing — the enthroned idol
  enemies: [
    { seg: 0, t: 0.5, kind: "chase", visual: "skeleton" }, // the nave is hostile
    { seg: 3, t: 0.5, kind: "patrol", visual: "mushroom" },
    { seg: 4, t: 0.5, dy: 70, kind: "patrol", visual: "flyingEye" }, // hovers over the deep gap
    { seg: 7, t: 0.4, kind: "chase", visual: "skeleton" },
    { seg: 7, t: 0.85, kind: "chase", visual: "goblin" },
    { seg: 8, t: 0.2, kind: "chase", visual: "skeleton" }, // the last Warden on the steps
  ],
  pots: [
    { seg: 0, t: 0.4, color: "red", drop: "relic" },
    { seg: 3, t: 0.5, color: "white", drop: "secret" },
    { seg: 7, t: 0.6, color: "yellow", drop: "health" }, // before the final climb
  ],
  collectibles: [
    { seg: 0, t: 0.55, value: 100 },
    { seg: 2, t: 0.5, dy: 24, value: 100 }, // just over the first beam
    { seg: 5, t: 0.5, dy: 24, value: 100 }, // over the lower beam
    { seg: 6, t: 0.5, dy: 24, value: 100 }, // over the upper beam
  ],
  npcs: [],
};
