/**
 * Heads-up display — the TOP bar of the HUD frame (React + Tailwind). A slim
 * 16-bit status strip pinned to the top that FRAMES the play area: score left,
 * lives right, over a subtle gradient so it reads against any scene. Pointer
 * events are off so it never steals touch input from the game canvas (the
 * dialogue bar at the bottom is the only interactive HUD surface).
 */
import { useHud } from "@ui/hudState.ts";

export function Hud() {
  const { score, lives, paused } = useHud();

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Top status strip — frames the play area's upper edge. */}
      <div
        className="absolute top-0 right-0 left-0 flex items-center justify-between bg-gradient-to-b from-[#1a120b]/85 to-transparent"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 0.4rem)",
          paddingLeft: "max(env(safe-area-inset-left), 0.9rem)",
          paddingRight: "max(env(safe-area-inset-right), 0.9rem)",
          paddingBottom: "0.7rem",
        }}
      >
        <span
          className="font-pixel text-relic-gold tracking-wider"
          style={{ fontSize: "clamp(0.95rem, 3.5vw, 1.4rem)", textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
        >
          SCORE {score.toString().padStart(6, "0")}
        </span>
        <span
          className="text-blood-red"
          style={{ fontSize: "clamp(1rem, 3.8vw, 1.5rem)", textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
        >
          {"♦".repeat(Math.max(0, lives))}
        </span>
      </div>
      {paused && (
        <div
          className="absolute inset-0 flex items-center justify-center font-display font-extrabold tracking-widest text-idol-gold"
          style={{ background: "rgba(23, 17, 11, 0.6)", fontSize: "clamp(1.5rem, 8vw, 3rem)" }}
        >
          PAUSED
        </div>
      )}
    </div>
  );
}
