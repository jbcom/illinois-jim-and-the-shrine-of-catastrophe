/**
 * "The Heart of the Shrine" — the 4th level, the climax where Jim takes the idol
 * (→ the `catastrophe` cutscene). Authored as a single LevelSpec (surfaces from
 * the ground up); the collision AND this painting both derive from it, so they
 * cannot drift. Every raised surface is a REAL foreground object (a beam, the
 * staircase) — nothing floats.
 *
 * Surfaces L→R: a processional NAVE (ground) → a chasm bridged by a BEAM (raised,
 * anchored to that beam) → more nave → a deeper chasm bridged by two staggered
 * BEAMS → the inner hall → the cracked STAIRCASE (a raised surface that IS the
 * shrine-steps object) crowned by the enthroned idol (the goal).
 */
import { CAVE, CAVE_PROPS as P } from "@render/caveShapes.ts";
import { paintingFromSpec, type PropPlacement } from "@render/levels/fromSpec.ts";
import { SHRINE_PROPS as S } from "@render/shrineShapes.ts";
import type { Placement } from "@render/composition.ts";
import { SHRINE_HEART_SPEC } from "@sim/world/specs/shrineHeart.ts";

const BASELINE_Y = SHRINE_HEART_SPEC.baselineY;
const FRAME_TOP = -76;

/**
 * The painting props, each anchored to a SURFACE (no absolute coords). `base`
 * props sit on the segment they name; the staircase + beams are drawn ON their
 * raised segments so the visual object matches the standable collision exactly.
 */
const PROPS: readonly PropPlacement[] = [
  // CEILING: stalactite rock across the chamber (hung from the frame top).
  { stamp: P.spire, at: { seg: 0, t: 0.1 }, scale: 1.0, z: 0, align: "ceiling", ceilingTop: FRAME_TOP + 6 },
  { stamp: P.chunk, at: { seg: 0, t: 0.6 }, scale: 0.85, z: 0, align: "ceiling", ceilingTop: FRAME_TOP, flipX: true },
  { stamp: P.spire, at: { seg: 3, t: 0.4 }, scale: 1.1, z: 0, align: "ceiling", ceilingTop: FRAME_TOP + 4, flipX: true },
  { stamp: P.chunk, at: { seg: 7, t: 0.3 }, scale: 0.8, z: 0, align: "ceiling", ceilingTop: FRAME_TOP },
  { stamp: P.spire, at: { seg: 7, t: 0.8 }, scale: 1.0, z: 0, align: "ceiling", ceilingTop: FRAME_TOP + 6, flipX: true },

  // BACK WALL: rock masses framing the chamber (base on the ground segments).
  { stamp: P.rockTall, at: { seg: 0, t: 0 }, scale: 1.0, z: 1, dx: -40 },
  { stamp: P.rockWide, at: { seg: 0, t: 0.7 }, scale: 0.85, z: 1, flipX: true },
  { stamp: P.rockTall, at: { seg: 7, t: 0.6 }, scale: 1.0, z: 1 },

  // NAVE colonnade: broken pillars + braziers along the ground.
  { stamp: CAVE.brickWallA, at: { seg: 0, t: 0.02 }, scale: 1.1, z: 2 },
  { stamp: S.pillarBroken, at: { seg: 0, t: 0.28 }, scale: 0.22, z: 3 },
  { stamp: S.brazier, at: { seg: 0, t: 0.45 }, scale: 0.26, z: 5 },
  { stamp: S.pillarBroken, at: { seg: 0, t: 0.7 }, scale: 0.24, z: 3, flipX: true },
  { stamp: S.brazier, at: { seg: 0, t: 0.9 }, scale: 0.26, z: 5, flipX: true },

  // The BEAMS that ARE the raised crossings (drawn on their raised segments).
  { stamp: CAVE.beamLong, at: { seg: 2, t: 0 }, scale: 0.9, z: 4 },
  { stamp: CAVE.beamLong, at: { seg: 5, t: 0 }, scale: 0.9, z: 4 },
  { stamp: CAVE.beamLong2, at: { seg: 6, t: 0 }, scale: 0.9, z: 4 },

  // INNER HALL: denser pillars + braziers.
  { stamp: CAVE.brickWallB, at: { seg: 3, t: 0.1 }, scale: 1.1, z: 2, flipX: true },
  { stamp: S.brazier, at: { seg: 3, t: 0.5 }, scale: 0.26, z: 5 },
  { stamp: P.column, at: { seg: 3, t: 0.85 }, scale: 0.8, z: 3, flipX: true },
  { stamp: S.pillarBroken, at: { seg: 7, t: 0.2 }, scale: 0.24, z: 3, flipX: true },
  { stamp: S.brazier, at: { seg: 7, t: 0.45 }, scale: 0.28, z: 5 },
  { stamp: CAVE.brickWallA, at: { seg: 7, t: 0.92 }, scale: 1.1, z: 2 },

  // THE STAIRCASE that IS the raised landing (drawn on seg 8) + flanking braziers
  // on the ground at its foot, crowned by the idol (centered on the steps top).
  { stamp: S.brazier, at: { seg: 7, t: 0.98 }, scale: 0.3, z: 5 },
  { stamp: S.steps, at: { seg: 8, t: 0 }, scale: 0.46, z: 3 },
  // GOAL prop: the enthroned idol, base resting ON the staircase surface (seg 8 top).
  { stamp: S.idol, at: { seg: 8, t: 0.5 }, scale: 0.28, z: 6, dx: -44 },
];

export const SHRINE_HEART: readonly Placement[] = paintingFromSpec(SHRINE_HEART_SPEC, PROPS);

/** The authored vertical frame (cover-scaled). Top above the ceiling rock. */
export const SHRINE_HEART_FRAME = { top: FRAME_TOP, bottom: BASELINE_Y + 60 } as const;
