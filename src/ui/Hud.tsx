/**
 * Heads-up display overlay (React + Tailwind). Reads the HUD store; pointer
 * events are off so the HUD never steals touch input from the game canvas.
 */
import { useHud } from "@ui/hudState.ts";

export function Hud() {
  const { score, lives, paused } = useHud();

  return (
    <div
      className="pointer-events-none absolute inset-0 text-parchment"
      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
    >
      <div
        className="absolute font-mono font-bold tracking-wider text-relic-gold"
        style={{
          top: "calc(env(safe-area-inset-top) + 0.5rem)",
          left: "calc(env(safe-area-inset-left) + 0.75rem)",
          fontSize: "clamp(0.9rem, 3.5vw, 1.4rem)",
        }}
      >
        SCORE {score.toString().padStart(6, "0")}
      </div>
      <div
        className="absolute font-bold text-blood-red"
        style={{
          top: "calc(env(safe-area-inset-top) + 0.5rem)",
          right: "calc(env(safe-area-inset-right) + 0.75rem)",
          fontSize: "clamp(0.9rem, 3.5vw, 1.4rem)",
        }}
      >
        {"♦".repeat(Math.max(0, lives))}
      </div>
      {paused && (
        <div
          className="absolute inset-0 flex items-center justify-center font-extrabold tracking-widest text-idol-gold"
          style={{
            background: "rgba(23, 17, 11, 0.6)",
            fontSize: "clamp(1.5rem, 8vw, 3rem)",
          }}
        >
          PAUSED
        </div>
      )}
    </div>
  );
}
