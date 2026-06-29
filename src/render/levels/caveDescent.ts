/**
 * "The Descent" — the cave level, authored from CAVE_DESCENT_SPEC (surfaces from
 * the ground up); collision AND this painting both derive from it. Composed from
 * the VERIFIED cave catalog (CAVE built elements + CAVE_PROPS organic rock/flora).
 *
 * Beats L→R: ENTRANCE (ruined chamber, cavern tree, crates) → CHASM (broken
 * ground bridged by two BEAMS — the raised crossings, a fall is death) → DEEP (the
 * cave narrows to the glowing relic block, the goal). Every raised surface is a
 * real beam; nothing floats.
 */
import { CAVE, CAVE_PROPS as P } from "@render/caveShapes.ts";
import { paintingFromSpec, type PropPlacement } from "@render/levels/fromSpec.ts";
import type { Placement } from "@render/composition.ts";
import { CAVE_DESCENT_SPEC } from "@sim/world/specs/caveDescent.ts";

const BASELINE_Y = CAVE_DESCENT_SPEC.baselineY;
const FRAME_TOP = -30;

const PROPS: readonly PropPlacement[] = [
  // CEILING (z 0): jagged rock + stalactites hung from the frame top.
  { stamp: P.spire, at: { seg: 0, t: 0.05 }, scale: 1.1, z: 0, align: "ceiling", ceilingTop: FRAME_TOP - 10, flipX: true },
  { stamp: P.chunk, at: { seg: 0, t: 0.22 }, scale: 0.8, z: 0, align: "ceiling", ceilingTop: FRAME_TOP - 40 },
  { stamp: P.spire, at: { seg: 0, t: 0.42 }, scale: 0.9, z: 0, align: "ceiling", ceilingTop: FRAME_TOP },
  { stamp: P.chunk, at: { seg: 0, t: 0.65 }, scale: 0.7, z: 0, align: "ceiling", ceilingTop: FRAME_TOP - 30, flipX: true },
  { stamp: P.spire, at: { seg: 0, t: 0.9 }, scale: 1.2, z: 0, align: "ceiling", ceilingTop: FRAME_TOP - 6 },
  { stamp: P.chunk, at: { seg: 4, t: 0.1 }, scale: 0.8, z: 0, align: "ceiling", ceilingTop: FRAME_TOP - 34 },
  { stamp: P.spire, at: { seg: 4, t: 0.35 }, scale: 1.0, z: 0, align: "ceiling", ceilingTop: FRAME_TOP - 10, flipX: true },
  { stamp: P.chunk, at: { seg: 4, t: 0.6 }, scale: 0.75, z: 0, align: "ceiling", ceilingTop: FRAME_TOP - 30 },
  { stamp: P.spire, at: { seg: 4, t: 0.85 }, scale: 1.1, z: 0, align: "ceiling", ceilingTop: FRAME_TOP - 4 },

  // BACK WALL (z 1): big rock masses framing the depth.
  { stamp: P.rockTall, at: { seg: 0, t: 0 }, scale: 1.0, z: 1, dx: -40 },
  { stamp: P.rockWide, at: { seg: 0, t: 0.33 }, scale: 0.9, z: 1, flipX: true },
  { stamp: P.rockTall, at: { seg: 4, t: 0.45 }, scale: 1.05, z: 1, flipX: true },
  { stamp: P.rockWide, at: { seg: 4, t: 0.75 }, scale: 0.95, z: 1 },

  // ENTRANCE: ruined chamber, a cavern tree, crates, a column.
  { stamp: CAVE.brickWallA, at: { seg: 0, t: 0.04 }, scale: 1.1, z: 2 },
  { stamp: CAVE.brickWallB, at: { seg: 0, t: 0.12 }, scale: 1.1, z: 2 },
  { stamp: P.tree, at: { seg: 0, t: 0.23 }, scale: 0.7, z: 2 },
  { stamp: CAVE.crateA, at: { seg: 0, t: 0.39 }, scale: 1.0, z: 4 },
  { stamp: CAVE.crateB, at: { seg: 0, t: 0.43 }, scale: 0.9, z: 4, flipX: true },
  { stamp: P.bush, at: { seg: 0, t: 0.52 }, scale: 0.8, z: 5 },
  { stamp: P.column, at: { seg: 0, t: 0.59 }, scale: 1.0, z: 2 },
  // Chasm lips: rock ledges at each end of the gap (on the ground segments).
  { stamp: P.rockLedge, at: { seg: 0, t: 0.9 }, scale: 0.7, z: 3 }, // left lip
  { stamp: P.column, at: { seg: 0, t: 0.96 }, scale: 0.8, z: 2, flipX: true },

  // CHASM: the two BEAMS that ARE the raised crossings (drawn on their segments).
  { stamp: CAVE.beamLong, at: { seg: 2, t: 0 }, scale: 0.9, z: 4 },
  { stamp: CAVE.beamLong2, at: { seg: 3, t: 0 }, scale: 0.9, z: 4 },

  // DEEP: right chasm lip → the cave narrows to the relic.
  { stamp: P.rockLedge, at: { seg: 4, t: 0.02 }, scale: 0.7, z: 3, flipX: true },
  { stamp: P.column, at: { seg: 4, t: 0.06 }, scale: 0.85, z: 2 },
  { stamp: P.tree2, at: { seg: 4, t: 0.25 }, scale: 0.6, z: 2, flipX: true },
  { stamp: CAVE.brickWallA, at: { seg: 4, t: 0.45 }, scale: 1.1, z: 2, flipX: true },
  { stamp: CAVE.brickWallB, at: { seg: 4, t: 0.52 }, scale: 1.1, z: 2 },
  { stamp: P.rockMassSm, at: { seg: 4, t: 0.62 }, scale: 1.0, z: 3 },
  { stamp: P.bushWide, at: { seg: 4, t: 0.73 }, scale: 0.8, z: 5 },
  { stamp: P.column, at: { seg: 4, t: 0.85 }, scale: 1.0, z: 2, flipX: true },
  // GOAL: the glowing-relic rock block set in the far wall.
  { stamp: CAVE.relicBlock, at: { seg: 4, t: 0.95 }, scale: 1.4, z: 6 },
];

export const CAVE_DESCENT: readonly Placement[] = paintingFromSpec(CAVE_DESCENT_SPEC, PROPS);

/** The authored vertical frame (cover-scaled). Top above the highest ceiling rock. */
export const CAVE_DESCENT_FRAME = { top: FRAME_TOP, bottom: BASELINE_Y + 60 } as const;
