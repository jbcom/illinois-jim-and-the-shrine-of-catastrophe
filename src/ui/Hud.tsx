/**
 * Heads-up display overlay. Reads HudModel signals; only the changed values
 * re-render. Pointer-events are off so the HUD never steals touch input from
 * the game surface beneath it.
 */

import type { HudModel } from "@ui/hudState.ts";
import { Show } from "solid-js";
import { BRAND, TYPE } from "@/brand.ts";

export function Hud(props: { model: HudModel }) {
  const m = props.model;
  return (
    <div
      style={{
        position: "absolute",
        inset: "0",
        "pointer-events": "none",
        "font-family": TYPE.hud,
        color: BRAND.parchment,
        "text-shadow": "0 1px 2px rgba(0,0,0,0.8)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top) + 0.5rem)",
          left: "calc(env(safe-area-inset-left) + 0.75rem)",
          "font-size": "clamp(0.9rem, 3.5vw, 1.4rem)",
          "font-weight": "700",
          "letter-spacing": "0.05em",
          "font-family": TYPE.numeric,
          color: BRAND.relicGold,
        }}
      >
        SCORE {m.score().toString().padStart(6, "0")}
      </div>
      <div
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top) + 0.5rem)",
          right: "calc(env(safe-area-inset-right) + 0.75rem)",
          "font-size": "clamp(0.9rem, 3.5vw, 1.4rem)",
          "font-weight": "700",
          color: BRAND.bloodRed,
        }}
      >
        {"♦".repeat(Math.max(0, m.lives()))}
      </div>
      <Show when={m.paused()}>
        <div
          style={{
            position: "absolute",
            inset: "0",
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            background: "rgba(23, 17, 11, 0.6)",
            "font-size": "clamp(1.5rem, 8vw, 3rem)",
            "font-weight": "800",
            "letter-spacing": "0.1em",
            "font-family": TYPE.display,
            color: BRAND.idolGold,
          }}
        >
          PAUSED
        </div>
      </Show>
    </div>
  );
}
