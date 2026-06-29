/**
 * Pure presentational logic for the HUD — the display decisions kept out of the
 * JSX so they're unit-testable without mounting React. The `Hud` component reads
 * the live store and renders the shapes this module computes.
 */

/** Max hearts drawn as individual idol gems before collapsing to a "×N" count. */
export const MAX_GEM_LIVES = 5;

export interface HudDisplay {
  /** Score zero-padded to a fixed six-digit arcade readout (e.g. "001250"). */
  readonly scoreText: string;
  /** How many idol-gem glyphs to draw (0 when lives are collapsed to a count). */
  readonly gemCount: number;
  /** True when lives exceed MAX_GEM_LIVES and collapse to a single gem + "×N". */
  readonly collapsed: boolean;
  /** The clamped, non-negative life total — what the "×N" badge and a11y label use. */
  readonly lives: number;
}

/**
 * Derive the HUD readout from raw engine values. Lives are clamped to ≥0; past
 * MAX_GEM_LIVES the gems collapse to one gem plus a "×N" badge so the bar never
 * overflows on a long life streak.
 */
export function hudDisplay(score: number, lives: number): HudDisplay {
  const safeLives = Math.max(0, Math.floor(lives));
  const collapsed = safeLives > MAX_GEM_LIVES;
  return {
    scoreText: Math.max(0, Math.floor(score)).toString().padStart(6, "0"),
    gemCount: collapsed ? 0 : safeLives,
    collapsed,
    lives: safeLives,
  };
}
