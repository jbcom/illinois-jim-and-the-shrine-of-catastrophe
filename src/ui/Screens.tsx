/**
 * Full-screen overlay screens (React + Tailwind) for the game-state machine:
 * title, won, and lost. The HUD renders during `playing`; these cover it on the
 * other states. Buttons are real pointer targets (pointer-events on).
 */
import type { ReactNode } from "react";
import { BRAND, TITLE, TITLE_SHORT, TYPE } from "@/brand.ts";

function Panel(props: { children: ReactNode }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-center"
      style={{ background: "rgba(23, 17, 11, 0.82)", color: BRAND.parchment }}
    >
      {props.children}
    </div>
  );
}

function PlayButton(props: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="pointer-events-auto rounded-lg px-8 py-3 font-extrabold tracking-widest"
      style={{
        background: BRAND.idolGold,
        color: BRAND.obsidian,
        fontSize: "clamp(1rem, 5vw, 1.5rem)",
        fontFamily: TYPE.display,
      }}
    >
      {props.label}
    </button>
  );
}

export function TitleScreen(props: { onStart: () => void }) {
  return (
    <Panel>
      <h1
        className="px-6 font-extrabold"
        style={{
          color: BRAND.idolGold,
          fontSize: "clamp(1.5rem, 9vw, 4rem)",
          fontFamily: TYPE.display,
          lineHeight: 1.05,
          textShadow: "0 2px 8px rgba(0,0,0,0.6)",
        }}
      >
        {TITLE}
      </h1>
      <PlayButton label="PLAY" onClick={props.onStart} />
    </Panel>
  );
}

export function ResultScreen(props: {
  won: boolean;
  score: number;
  bestScore: number;
  onRestart: () => void;
  onTitle: () => void;
}) {
  return (
    <Panel>
      <h2
        className="font-extrabold"
        style={{
          color: props.won ? BRAND.relicGold : BRAND.bloodRed,
          fontSize: "clamp(1.8rem, 10vw, 4rem)",
          fontFamily: TYPE.display,
        }}
      >
        {props.won ? "SHRINE CLAIMED" : "CATASTROPHE"}
      </h2>
      <div style={{ fontFamily: TYPE.numeric, fontSize: "clamp(1rem, 4vw, 1.4rem)" }}>
        <div>SCORE {props.score.toString().padStart(6, "0")}</div>
        <div style={{ color: BRAND.idolGold }}>
          BEST {props.bestScore.toString().padStart(6, "0")}
        </div>
      </div>
      <div className="flex gap-4">
        <PlayButton label="RETRY" onClick={props.onRestart} />
        <button
          type="button"
          onClick={props.onTitle}
          className="pointer-events-auto rounded-lg px-6 py-3 font-bold tracking-wider"
          style={{
            border: `2px solid ${BRAND.idolGold}`,
            color: BRAND.idolGold,
            fontSize: "clamp(0.9rem, 4vw, 1.2rem)",
          }}
        >
          {TITLE_SHORT}
        </button>
      </div>
    </Panel>
  );
}
