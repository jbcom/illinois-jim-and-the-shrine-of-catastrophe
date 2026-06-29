/**
 * Cave-descent LevelSpec — the SINGLE SOURCE OF TRUTH for the 2nd level (the
 * cave). Sim-pure surface data; collision derives here, the painting
 * (render/levels/caveDescent.ts) anchors stamps to the same segments.
 *
 * Surfaces L→R, ground-up: the ENTRANCE chamber (ground) → the CHASM (a gap
 * bridged by two staggered BEAMS) → the DEEP run to the glowing relic block (the
 * goal). ~2600px ≈ 5 screens — a meaty standard level.
 */
import type { LevelSpec } from "@sim/world/levelSpec.ts";

const BASELINE_Y = 300;

export const CAVE_DESCENT_SPEC: LevelSpec = {
  id: "cave-descent",
  baselineY: BASELINE_Y,
  tileSize: 16,
  rows: 22,
  segments: [
    { kind: "ground", length: 1080 }, // 0  entrance chamber + left chasm lip
    { kind: "gap", length: 240 }, // 1  the chasm
    { kind: "raised", length: 130, top: 70, anchorProp: "beam" }, // 2 lower beam
    { kind: "raised", length: 130, top: 134, anchorProp: "beam" }, // 3 upper beam (staggered)
    { kind: "ground", length: 1280 }, // 4  the deep run to the relic
  ],
  spawn: { seg: 0, t: 0.04 },
  goal: { seg: 4, t: 0.95 }, // the glowing relic block at the far wall
  enemies: [
    { seg: 0, t: 0.25, kind: "patrol", visual: "goblin" }, // entrance runway
    { seg: 0, t: 0.85, kind: "patrol", visual: "mushroom" }, // left of the chasm
    { seg: 1, t: 0.5, dy: 70, kind: "patrol", visual: "flyingEye" }, // floats over the chasm
    { seg: 4, t: 0.2, kind: "patrol", visual: "goblin" }, // deep chamber
    { seg: 4, t: 0.5, kind: "patrol", visual: "mushroom" }, // guards the ruins
    { seg: 4, t: 0.85, kind: "chase", visual: "skeleton" }, // chases at the relic goal
  ],
  pots: [
    { seg: 0, t: 0.18, color: "red", drop: "relic" },
    { seg: 0, t: 0.5, color: "white", drop: "secret" },
    { seg: 4, t: 0.15, color: "yellow", drop: "health" },
    { seg: 4, t: 0.6, color: "red", drop: "relic" },
  ],
  collectibles: [
    { seg: 0, t: 0.43, value: 100 },
    { seg: 2, t: 0.5, dy: 24, value: 100 }, // on the lower beam
    { seg: 3, t: 0.5, dy: 24, value: 100 }, // on the upper beam
    { seg: 4, t: 0.45, value: 100 },
  ],
  npcs: [],
};
