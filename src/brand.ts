/**
 * Brand identity for "Illinois Jim and the Shrine of Catastrophe".
 *
 * Original pulp-adventure identity — NOT derived from any existing franchise.
 * The mood: torch-lit temple stone, tarnished gold idols, danger-red traps,
 * jungle dusk. Single source of truth for colour + type; the renderer palette,
 * HUD, CSS, and PWA manifest all reference these tokens so the look stays
 * consistent and the brand gate (gates.json hex ban-list) has one place to guard.
 */

/** Core brand colours. Hex strings; keep in sync with .claude/gates.json bans. */
export const BRAND = {
  /** Deep temple-stone brown-black — backgrounds, letterbox bars. */
  obsidian: "#17110b",
  /** Warm torch-lit stone — primary surfaces. */
  stone: "#6f4e2e",
  /** Lighter weathered stone — platforms, secondary surfaces. */
  sandstone: "#9a7240",
  /** Tarnished idol gold — accents, title, the whip. */
  idolGold: "#e3b341",
  /** Bright relic gold — highlights, collectibles, score. */
  relicGold: "#f6d36b",
  /** Danger red — hazards, traps, low-health. */
  bloodRed: "#c2402e",
  /** Bone parchment — the hero, primary text. */
  parchment: "#f3e9d2",
  /** Jungle shadow — UI depth, vignette. */
  jungle: "#26331f",
  /** Rail steel — mine-cart tracks. */
  steel: "#9a9a9a",
} as const;

export type BrandColor = keyof typeof BRAND;

/**
 * Typography. The title uses a heavy condensed display face evoking carved
 * stone inscriptions; the HUD uses a clean readable sans. Web fonts are loaded
 * via CSS @font-face (or system fallbacks) — these are the family stacks.
 */
export const TYPE = {
  /** Display / title — bold, condensed, "carved" feel. */
  display: '"Shrine Display", "Cinzel", "Trajan Pro", "Times New Roman", serif',
  /** HUD / body — legible at small sizes on mobile. */
  hud: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  /** Monospace numerals for score/timers (tabular). */
  numeric: '"DejaVu Sans Mono", ui-monospace, "Courier New", monospace',
} as const;

/** The game's full + short title, for HUD/menus/manifest. */
export const TITLE = "Illinois Jim and the Shrine of Catastrophe";
export const TITLE_SHORT = "Illinois Jim";
