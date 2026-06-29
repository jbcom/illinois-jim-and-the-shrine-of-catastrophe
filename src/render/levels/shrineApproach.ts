/**
 * "The Shrine" — the 3rd-act sanctum approach. Authored from SHRINE_APPROACH_SPEC
 * (surfaces from the ground up); collision AND this painting both derive from it.
 * The shrine props (idol, steps, braziers, broken pillars) compose over the reused
 * cave masonry so the sanctum reads as carved, ruined TEMPLE. Matches cut-04-shrine.
 *
 * Every raised surface is a real object: the BEAMS bridge the broken nave, the
 * STAIRCASE is the idol's raised landing. Nothing floats.
 */
import { CAVE, CAVE_PROPS as P } from "@render/caveShapes.ts";
import { paintingFromSpec, type PropPlacement } from "@render/levels/fromSpec.ts";
import { SHRINE_PROPS as S } from "@render/shrineShapes.ts";
import type { Placement } from "@render/composition.ts";
import { SHRINE_APPROACH_SPEC } from "@sim/world/specs/shrineApproach.ts";

const BASELINE_Y = SHRINE_APPROACH_SPEC.baselineY;
const FRAME_TOP = -70;

const PROPS: readonly PropPlacement[] = [
  // CEILING: stalactite rock across the chamber.
  { stamp: P.spire, at: { seg: 0, t: 0.08 }, scale: 1.0, z: 0, align: "ceiling", ceilingTop: FRAME_TOP + 6 },
  { stamp: P.chunk, at: { seg: 0, t: 0.45 }, scale: 0.8, z: 0, align: "ceiling", ceilingTop: FRAME_TOP, flipX: true },
  { stamp: P.spire, at: { seg: 0, t: 0.85 }, scale: 1.1, z: 0, align: "ceiling", ceilingTop: FRAME_TOP + 4, flipX: true },
  { stamp: P.chunk, at: { seg: 4, t: 0.3 }, scale: 0.8, z: 0, align: "ceiling", ceilingTop: FRAME_TOP },
  { stamp: P.spire, at: { seg: 4, t: 0.8 }, scale: 1.0, z: 0, align: "ceiling", ceilingTop: FRAME_TOP + 6, flipX: true },

  // BACK WALL: rock masses.
  { stamp: P.rockTall, at: { seg: 0, t: 0 }, scale: 1.0, z: 1, dx: -40 },
  { stamp: P.rockWide, at: { seg: 0, t: 0.55 }, scale: 0.85, z: 1, flipX: true },
  { stamp: P.rockTall, at: { seg: 4, t: 0.5 }, scale: 1.0, z: 1 },

  // GATEHALL colonnade: broken pillars + braziers along the ground.
  { stamp: CAVE.brickWallA, at: { seg: 0, t: 0.02 }, scale: 1.1, z: 2 },
  { stamp: CAVE.brickWallB, at: { seg: 0, t: 0.1 }, scale: 1.1, z: 2 },
  { stamp: S.pillarBroken, at: { seg: 0, t: 0.25 }, scale: 0.22, z: 3 },
  { stamp: S.brazier, at: { seg: 0, t: 0.4 }, scale: 0.26, z: 5 },
  { stamp: S.pillarBroken, at: { seg: 0, t: 0.6 }, scale: 0.24, z: 3, flipX: true },
  { stamp: S.brazier, at: { seg: 0, t: 0.8 }, scale: 0.26, z: 5, flipX: true },
  { stamp: S.pillarBroken, at: { seg: 0, t: 0.95 }, scale: 0.2, z: 3 },

  // The BEAMS bridging the broken nave (drawn ON their raised segments).
  { stamp: CAVE.beamLong, at: { seg: 2, t: 0 }, scale: 0.9, z: 4 },
  { stamp: CAVE.beamLong2, at: { seg: 3, t: 0 }, scale: 0.9, z: 4 },

  // INNER SANCTUM floor: masonry, fallen column, brazier.
  { stamp: CAVE.brickWallA, at: { seg: 4, t: 0.08 }, scale: 1.1, z: 2, flipX: true },
  { stamp: P.column, at: { seg: 4, t: 0.35 }, scale: 0.8, z: 3 },
  { stamp: S.pillarBroken, at: { seg: 4, t: 0.55 }, scale: 0.24, z: 3, flipX: true },
  { stamp: S.brazier, at: { seg: 4, t: 0.75 }, scale: 0.28, z: 5 },
  { stamp: CAVE.brickWallB, at: { seg: 4, t: 0.92 }, scale: 1.1, z: 2 },

  // THE STAIRCASE (the raised idol landing) + flanking braziers + the idol goal.
  { stamp: S.brazier, at: { seg: 4, t: 0.99 }, scale: 0.3, z: 5 },
  { stamp: S.steps, at: { seg: 5, t: 0 }, scale: 0.46, z: 3 },
  { stamp: S.idol, at: { seg: 5, t: 0.5 }, scale: 0.28, z: 6, dx: -44 },
];

export const SHRINE_APPROACH: readonly Placement[] = paintingFromSpec(SHRINE_APPROACH_SPEC, PROPS);

/** The authored vertical frame (cover-scaled). Top above the ceiling rock. */
export const SHRINE_APPROACH_FRAME = { top: FRAME_TOP, bottom: BASELINE_Y + 60 } as const;
