/**
 * "The Escape" — the 5th/final level: the collapsing-shrine sprint to the cave
 * mouth (→ the `escape` ending). Authored from ESCAPE_RUN_SPEC (surfaces from the
 * ground up); the collision AND this painting both derive from it. Every raised
 * surface is a real BEAM you stand on; the only free-floating art is falling
 * DEBRIS — pure decoration that sells the collapse (never a standable surface).
 */
import { CAVE, CAVE_PROPS as P } from "@render/caveShapes.ts";
import { paintingFromSpec, type PropPlacement } from "@render/levels/fromSpec.ts";
import type { Placement } from "@render/composition.ts";
import { ESCAPE_RUN_SPEC } from "@sim/world/specs/escapeRun.ts";

const BASELINE_Y = ESCAPE_RUN_SPEC.baselineY;
const FRAME_TOP = -70;

/**
 * Props anchored to SURFACES. Debris chunks use a NEGATIVE-segment-relative dy to
 * float mid-air over a gap/ground (decoration only — they are NOT in the spec's
 * segments, so nothing stands on them).
 */
const PROPS: readonly PropPlacement[] = [
  // CEILING: collapsing jagged rock hung from the frame top.
  { stamp: P.spire, at: { seg: 0, t: 0.1 }, scale: 1.1, z: 0, align: "ceiling", ceilingTop: FRAME_TOP + 6 },
  { stamp: P.chunk, at: { seg: 0, t: 0.6 }, scale: 0.9, z: 0, align: "ceiling", ceilingTop: FRAME_TOP, flipX: true },
  { stamp: P.spire, at: { seg: 3, t: 0.4 }, scale: 1.0, z: 0, align: "ceiling", ceilingTop: FRAME_TOP + 4, flipX: true },
  { stamp: P.chunk, at: { seg: 7, t: 0.3 }, scale: 0.85, z: 0, align: "ceiling", ceilingTop: FRAME_TOP },
  { stamp: P.spire, at: { seg: 7, t: 0.7 }, scale: 1.0, z: 0, align: "ceiling", ceilingTop: FRAME_TOP + 6, flipX: true },

  // BACK WALL: rock masses.
  { stamp: P.rockTall, at: { seg: 0, t: 0 }, scale: 1.0, z: 1, dx: -40 },
  { stamp: P.rockWide, at: { seg: 3, t: 0.4 }, scale: 0.9, z: 1, flipX: true },
  { stamp: P.rockTall, at: { seg: 7, t: 0.4 }, scale: 1.0, z: 1, flipX: true },

  // START: the shrine mouth — a toppling column + bush, the first beam crossing.
  { stamp: CAVE.brickWallA, at: { seg: 0, t: 0.02 }, scale: 1.1, z: 2 },
  { stamp: P.column, at: { seg: 0, t: 0.4 }, scale: 0.85, z: 3, flipX: true },
  { stamp: P.bush, at: { seg: 0, t: 0.7 }, scale: 0.7, z: 5 },
  { stamp: CAVE.beamLong, at: { seg: 2, t: 0 }, scale: 0.9, z: 4 }, // the beam IS the raised crossing
  { stamp: P.chunk, at: { seg: 2, t: 0.5, dy: 150 }, scale: 0.5, z: 7 }, // debris falling into the gap

  // MID SPRINT: rubble + falling debris, the second (two-beam) crossing.
  { stamp: P.rockMass, at: { seg: 3, t: 0.1 }, scale: 0.5, z: 2 },
  { stamp: P.rockMassSm, at: { seg: 3, t: 0.5 }, scale: 1.0, z: 3 },
  { stamp: P.chunk, at: { seg: 3, t: 0.6, dy: 180 }, scale: 0.7, z: 7, flipX: true }, // big chunk crashing
  { stamp: P.column, at: { seg: 3, t: 0.9 }, scale: 0.8, z: 3 },
  { stamp: CAVE.beamLong, at: { seg: 5, t: 0 }, scale: 0.9, z: 4 },
  { stamp: CAVE.beamLong2, at: { seg: 6, t: 0 }, scale: 0.9, z: 4 },
  { stamp: P.chunk, at: { seg: 4, t: 0.5, dy: 170 }, scale: 0.55, z: 7, flipX: true },

  // THE MOUTH: the exit run — ledge, bush, more debris, the cave-mouth relic goal.
  { stamp: P.rockLedge, at: { seg: 7, t: 0.1 }, scale: 0.7, z: 3 },
  { stamp: P.bushWide, at: { seg: 7, t: 0.35 }, scale: 0.8, z: 5 },
  { stamp: P.chunk, at: { seg: 7, t: 0.5, dy: 160 }, scale: 0.6, z: 7 },
  { stamp: P.column, at: { seg: 7, t: 0.7 }, scale: 0.85, z: 3, flipX: true },
  // GOAL: the cave-mouth relic block at the threshold (the surface light).
  { stamp: CAVE.relicBlock, at: { seg: 7, t: 0.85 }, scale: 1.4, z: 6 },
];

export const ESCAPE_RUN: readonly Placement[] = paintingFromSpec(ESCAPE_RUN_SPEC, PROPS);

/** The authored vertical frame (cover-scaled). Top above the ceiling rock. */
export const ESCAPE_RUN_FRAME = { top: FRAME_TOP, bottom: BASELINE_Y + 60 } as const;
