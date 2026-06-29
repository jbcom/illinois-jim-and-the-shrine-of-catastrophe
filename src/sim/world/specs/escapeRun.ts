/**
 * Escape-run LevelSpec — the SINGLE SOURCE OF TRUTH for the 5th/final level (the
 * collapsing-shrine flight out). Sim-pure surface data; collision derives here,
 * the painting (render/levels/escapeRun.ts) anchors stamps to the same segments.
 *
 * Surfaces L→R, ground-up: the shrine mouth (ground) → a collapse chasm bridged by
 * a BEAM (raised, anchored to that beam) → mid sprint (ground) → a deeper collapse
 * chasm bridged by two staggered BEAMS → the run to the cave-mouth threshold
 * (ground), where the relic-block goal stands. Falling-debris chunks are pure
 * decoration in the painting (not surfaces) — they sell the collapse, not stand on.
 */
import type { LevelSpec } from "@sim/world/levelSpec.ts";

const BASELINE_Y = 300;

export const ESCAPE_RUN_SPEC: LevelSpec = {
  id: "escape-run",
  baselineY: BASELINE_Y,
  tileSize: 16,
  rows: 22,
  segments: [
    { kind: "ground", length: 480 }, // 0  the shrine mouth
    { kind: "gap", length: 200 }, // 1  first collapse chasm
    { kind: "raised", length: 200, top: 64, anchorProp: "beam" }, // 2 a beam over it
    { kind: "ground", length: 420 }, // 3  mid sprint
    { kind: "gap", length: 240 }, // 4  deeper collapse chasm
    { kind: "raised", length: 130, top: 70, anchorProp: "beam" }, // 5 lower beam
    { kind: "raised", length: 130, top: 130, anchorProp: "beam" }, // 6 upper beam
    { kind: "ground", length: 500 }, // 7  the run to the cave mouth (goal at the end)
  ],
  spawn: { seg: 0, t: 0.06 },
  goal: { seg: 7, t: 0.85 }, // the cave-mouth relic block at the threshold
  enemies: [
    { seg: 0, t: 0.6, kind: "chase", visual: "goblin" }, // the collapse drives the panic
    { seg: 3, t: 0.4, kind: "patrol", visual: "mushroom" },
    { seg: 3, t: 0.8, kind: "chase", visual: "skeleton" },
    { seg: 7, t: 0.35, kind: "chase", visual: "goblin" },
    { seg: 7, t: 0.65, kind: "patrol", visual: "mushroom" },
  ],
  pots: [
    { seg: 0, t: 0.5, color: "yellow", drop: "health" },
    { seg: 7, t: 0.45, color: "white", drop: "secret" },
  ],
  collectibles: [
    { seg: 0, t: 0.7, value: 100 },
    { seg: 2, t: 0.5, dy: 24, value: 100 }, // over the first beam
    { seg: 5, t: 0.5, dy: 24, value: 100 }, // over the lower beam
    { seg: 6, t: 0.5, dy: 24, value: 100 }, // over the upper beam
  ],
  npcs: [],
};
