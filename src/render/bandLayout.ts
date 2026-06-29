/**
 * Portrait "serpentine" slice-wrap layout — pure math, no DOM.
 *
 * A level is a long HORIZONTAL strip (the sim is purely 1-D horizontal). On a TALL
 * portrait screen a single wide band would be a thin sliver, so instead we WRAP the
 * strip into stacked horizontal BANDS: band 0 is the leftmost screen-width slice drawn
 * at the TOP, band 1 the next slice below it, band 2 below that, … As the player
 * advances right, the view scrolls UP one band at a time (boustrophedon snake-wrap), so
 * you always keep moving rightward on whatever band is currently centered.
 *
 * This module answers two questions, both pure:
 *   1. How many bands does a level of `levelWidthWorld` need, given a band of
 *      `bandWidthWorld` world units? → `bandCount`.
 *   2. Where does a world point land on screen? → `mapWorldX` returns the band index +
 *      the x WITHIN that band (0..bandWidthWorld). The renderer stacks the bands and
 *      applies the vertical scroll.
 *
 * Landscape is the degenerate 1-band case (the whole level is one band), so the same
 * mapping drives both orientations — orientation only chooses `bandWidthWorld`.
 */

export interface BandLayout {
  /** Width of one band in WORLD units (how much horizontal level fits per band). */
  readonly bandWidthWorld: number;
  /** Height of one band in WORLD units (the authored frame height). */
  readonly bandHeightWorld: number;
  /** Total bands needed to cover the level. */
  readonly bandCount: number;
  /** Level width in world units (used to clamp the last band). */
  readonly levelWidthWorld: number;
}

/**
 * Build a band layout for a level.
 * @param levelWidthWorld  the level's horizontal extent in world px.
 * @param bandWidthWorld   how much horizontal world fits in one on-screen band.
 * @param bandHeightWorld  the authored frame height in world px.
 */
export function makeBandLayout(
  levelWidthWorld: number,
  bandWidthWorld: number,
  bandHeightWorld: number,
): BandLayout {
  const w = Math.max(1, bandWidthWorld);
  const count = Math.max(1, Math.ceil(Math.max(1, levelWidthWorld) / w));
  return { bandWidthWorld: w, bandHeightWorld, bandCount: count, levelWidthWorld: Math.max(1, levelWidthWorld) };
}

export interface BandPos {
  /** Which stacked band this world-x falls in (0 = top). */
  readonly band: number;
  /** X within that band, in world units (0 .. bandWidthWorld). */
  readonly xInBand: number;
}

/** Map a world-x to its band index + x-within-band. */
export function mapWorldX(layout: BandLayout, worldX: number): BandPos {
  const clampedX = Math.max(0, Math.min(worldX, layout.levelWidthWorld));
  const band = Math.min(layout.bandCount - 1, Math.floor(clampedX / layout.bandWidthWorld));
  const xInBand = clampedX - band * layout.bandWidthWorld;
  return { band, xInBand };
}

/**
 * The vertical scroll offset (in BAND units) that keeps the player's band comfortably
 * in view. We center the player's band within `visibleBands` on-screen bands, clamped
 * so we never scroll past the top (band 0) or bottom (last band). Returns a fractional
 * band offset; the renderer multiplies by the on-screen band height in px.
 *
 * @param playerBand   the band the player is currently in (fractional ok for smoothing).
 * @param bandCount    total bands.
 * @param visibleBands how many bands fit on screen at once (>= 1).
 */
export function bandScrollOffset(playerBand: number, bandCount: number, visibleBands: number): number {
  const vb = Math.max(1, visibleBands);
  // Center the player's band: top-most visible band = playerBand - (vb-1)/2.
  let top = playerBand - (vb - 1) / 2;
  const maxTop = Math.max(0, bandCount - vb);
  if (top < 0) top = 0;
  else if (top > maxTop) top = maxTop;
  return top;
}
