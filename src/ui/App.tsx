/**
 * Root game shell (React). Owns the canvas the PixiJS renderer draws into, the
 * HUD overlay, and the game-state machine (title → playing → won/lost). The Pixi
 * Application initialises once and persists; the FSM gates pause + which overlay
 * shows. StrictMode-safe Pixi init/teardown is serialised on a ref promise.
 */
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { createGame, type Game } from "@engine/gameEcs.ts";
import { cutsceneById } from "@sim/story/cutscenes.ts";
import { CutscenePlayer } from "@ui/CutscenePlayer.tsx";
import { loadBestScore, saveBestScore } from "@ui/persistence.ts";
import { gameMachine } from "@ui/gameMachine.ts";
import { Hud } from "@ui/Hud.tsx";
import { hudStore } from "@ui/hudState.ts";
import { ResultScreen, TitleScreen } from "@ui/Screens.tsx";
import { useMachine } from "@xstate/react";
import { useEffect, useRef } from "react";

export function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | undefined>(undefined);
  const pendingRef = useRef<Promise<void>>(Promise.resolve());
  const [snapshot, send] = useMachine(gameMachine);
  const state = snapshot.value as string;
  const cutscene = cutsceneById(snapshot.context.cutsceneId);

  // Init the game once. Pixi creates its own canvas inside this host div — a
  // fresh canvas per Application means a virgin WebGL context across StrictMode
  // remounts (a destroyed Pixi app leaves its canvas's GL context permanently
  // lost). The pendingRef chain still serialises dispose-before-reinit ordering.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;

    const ready = pendingRef.current.then(() =>
      createGame(host, {
        onHud: ({ score, lives }) => {
          hudStore.setScore(score);
          hudStore.setLives(lives);
        },
        onGameOver: (finalScore) => send({ type: "LOSE", score: finalScore }),
        onWin: (finalScore) => send({ type: "WIN", score: finalScore }),
      })
        .then((g) => {
          if (disposed) {
            g.dispose();
            return;
          }
          gameRef.current = g;
          g.start();
          g.setPaused(true); // wait on the title screen
        })
        .catch((err) => {
          console.error("Game init failed:", err);
        }),
    );
    pendingRef.current = ready;

    if (Capacitor.isNativePlatform()) {
      void StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      void StatusBar.hide().catch(() => {});
    }

    const lifecycle = CapApp.addListener("appStateChange", ({ isActive }) => {
      gameRef.current?.setPaused(!isActive);
      hudStore.setPaused(!isActive);
    });
    const onVisibility = () => {
      gameRef.current?.setPaused(document.hidden);
      hudStore.setPaused(document.hidden);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      void lifecycle.then((h) => h.remove());
      document.removeEventListener("visibilitychange", onVisibility);
      pendingRef.current = ready.then(() => {
        gameRef.current?.dispose();
        gameRef.current = undefined;
      });
    };
  }, [send]);

  // Drive the engine from the FSM state.
  useEffect(() => {
    const g = gameRef.current;
    if (!g) return;
    if (state === "playing") g.setPaused(false);
    else g.setPaused(true);
  }, [state]);

  // Seed the persisted best score once on mount.
  useEffect(() => {
    void loadBestScore().then((best) => {
      if (best > 0) send({ type: "SET_BEST", bestScore: best });
    });
  }, [send]);

  // Persist the best score whenever a run ends (won/lost).
  useEffect(() => {
    if (state === "won" || state === "lost") void saveBestScore(snapshot.context.score);
  }, [state, snapshot.context.score]);

  return (
    <main className="relative h-full w-full">
      <div ref={hostRef} className="absolute inset-0 h-full w-full" />
      {state === "playing" && <Hud />}
      {state === "cutscene" && cutscene && (
        <CutscenePlayer cutscene={cutscene} onComplete={() => send({ type: "CUTSCENE_DONE" })} />
      )}
      {state === "title" && (
        <TitleScreen
          onStart={() => {
            // PLAY is a user gesture — unlock the AudioContext here so sfx play.
            void gameRef.current?.unlockAudio();
            send({ type: "START" });
          }}
        />
      )}
      {(state === "won" || state === "lost") && (
        <ResultScreen
          won={state === "won"}
          score={snapshot.context.score}
          bestScore={snapshot.context.bestScore}
          onRestart={() => {
            gameRef.current?.restart();
            send({ type: "RESTART" });
          }}
          onTitle={() => send({ type: "TO_TITLE" })}
        />
      )}
    </main>
  );
}
