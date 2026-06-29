/**
 * Heads-up display — a pulp-relic 16-bit status frame (React + Tailwind v4).
 *
 * A slim carved-stone bar pinned to the top that FRAMES the play area: an engraved
 * SCORE plaque on the left, idol-gem LIVES on the right, over an aged sandstone-to-
 * obsidian gradient with a thin relic-gold rule beneath (the "carved edge"). Styled to
 * the game's dusk / gold / blood palette. Pointer events are off so it never steals
 * touch input from the canvas. Scales with `clamp()` so it reads on a phone, a foldable
 * (portrait OR landscape), a tablet, and desktop, and respects safe-area insets.
 */
import { hudDisplay } from "@ui/hudDisplay.ts";
import { useHud } from "@ui/hudState.ts";

export function Hud() {
  const { score, lives, paused } = useHud();
  const { scoreText, gemCount, collapsed, lives: safeLives } = hudDisplay(score, lives);

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* Carved-stone status bar framing the top edge. */}
      <div
        className="absolute top-0 right-0 left-0 flex items-stretch justify-between"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 0.35rem)",
          paddingLeft: "max(env(safe-area-inset-left), 0.6rem)",
          paddingRight: "max(env(safe-area-inset-right), 0.6rem)",
          paddingBottom: "0.55rem",
          background:
            "linear-gradient(to bottom, rgba(23,17,11,0.92) 0%, rgba(23,17,11,0.78) 55%, rgba(23,17,11,0) 100%)",
          borderBottom: "1px solid rgba(246,211,107,0.18)",
          boxShadow: "inset 0 -1px 0 rgba(246,211,107,0.10)",
        }}
      >
        {/* SCORE — an engraved relic plaque. */}
        <div
          className="flex items-center gap-[clamp(4px,1.4vmin,9px)] rounded-[3px]"
          style={{
            padding: "clamp(2px,0.8vmin,5px) clamp(8px,2vmin,14px)",
            background: "linear-gradient(to bottom, rgba(111,78,46,0.55), rgba(23,17,11,0.55))",
            border: "1px solid rgba(154,114,64,0.55)",
            boxShadow: "inset 0 1px 0 rgba(246,211,107,0.18), 0 1px 2px rgba(0,0,0,0.5)",
          }}
        >
          <span
            className="font-display tracking-[0.18em] text-sandstone"
            style={{ fontSize: "clamp(0.55rem, 1.7vmin, 0.8rem)" }}
          >
            SCORE
          </span>
          <span
            className="font-pixel tabular-nums text-relic-gold"
            style={{ fontSize: "clamp(1rem, 3.4vmin, 1.5rem)", textShadow: "0 1px 2px rgba(0,0,0,0.85)" }}
          >
            {scoreText}
          </span>
        </div>

        {/* LIVES — idol gems (a "×N" count past MAX_GEM_LIVES so the bar never overflows). */}
        <div
          className="flex items-center gap-[clamp(3px,1vmin,7px)] rounded-[3px]"
          style={{
            padding: "clamp(2px,0.8vmin,5px) clamp(7px,1.8vmin,12px)",
            background: "linear-gradient(to bottom, rgba(111,78,46,0.55), rgba(23,17,11,0.55))",
            border: "1px solid rgba(154,114,64,0.55)",
            boxShadow: "inset 0 1px 0 rgba(246,211,107,0.18), 0 1px 2px rgba(0,0,0,0.5)",
          }}
        >
          {!collapsed ? (
            Array.from({ length: gemCount }, (_, i) => `gem-${i}`).map((gemKey) => (
              <span
                key={gemKey}
                className="text-blood-red"
                style={{ fontSize: "clamp(0.95rem, 3vmin, 1.4rem)", textShadow: "0 0 6px rgba(194,64,46,0.6), 0 1px 2px rgba(0,0,0,0.85)" }}
                aria-hidden
              >
                ◆
              </span>
            ))
          ) : (
            <span
              className="flex items-center gap-[0.2em] text-blood-red"
              style={{ fontSize: "clamp(1rem, 3vmin, 1.4rem)", textShadow: "0 0 6px rgba(194,64,46,0.6), 0 1px 2px rgba(0,0,0,0.85)" }}
            >
              <span aria-hidden>◆</span>
              <span className="font-pixel text-relic-gold" style={{ fontSize: "0.8em" }}>
                ×{safeLives}
              </span>
            </span>
          )}
          <span className="sr-only">{safeLives} lives</span>
        </div>
      </div>

      {paused && (
        <div
          className="absolute inset-0 flex items-center justify-center font-display font-extrabold tracking-[0.3em] text-idol-gold"
          style={{ background: "rgba(23, 17, 11, 0.62)", fontSize: "clamp(1.5rem, 8vmin, 3rem)", textShadow: "0 2px 10px rgba(0,0,0,0.7)" }}
        >
          PAUSED
        </div>
      )}
    </div>
  );
}
