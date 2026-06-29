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
import { DialogueBox } from "@ui/DialogueBox.tsx";
import { dialogueStore, useDialogue } from "@ui/dialogueStore.ts";
import { Hud } from "@ui/Hud.tsx";
import { hudStore, useHud } from "@ui/hudState.ts";
import { Landing } from "@ui/Landing.tsx";
import { ResultScreen } from "@ui/Screens.tsx";
import { RotatePrompt } from "@ui/RotatePrompt.tsx";
import { TouchControls } from "@ui/TouchControls.tsx";
import { useOrientation } from "@ui/orientationStore.ts";
import { useMachine } from "@xstate/react";
import { useEffect, useRef } from "react";

export function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | undefined>(undefined);
  const pendingRef = useRef<Promise<void>>(Promise.resolve());
  const [snapshot, send] = useMachine(gameMachine);
  const state = snapshot.value as string;
  const cutscene = cutsceneById(snapshot.context.cutsceneId);
  const levelId = snapshot.context.levelId;
  // Tracks whether the FSM is in `playing`, readable from the async game-init
  // `.then` so a freshly-recreated level instance starts unpaused if we're mid-play.
  const playingRef = useRef(false);
  playingRef.current = state === "playing";
  // Talking pauses the action so the player can read the speech window.
  const dialogue = useDialogue();
  const talking = dialogue.script !== null;
  // Backgrounded/hidden is recorded in the HUD store; the pause effect composes it.
  const hudPaused = useHud().paused;

  // Track orientation: on phones we show a rotate prompt during gameplay if the
  // device is portrait (landscape lock). Tablets/foldables/desktop are always free.
  const orientation = useOrientation();
  // Pause the game loop while the rotate prompt is up — no point running the sim
  // when the canvas is in the wrong aspect ratio.
  const rotateBlocking = state === "playing" && orientation.needsRotatePrompt;

  // Init the game once. Pixi creates its own canvas inside this host div — a
  // fresh canvas per Application means a virgin WebGL context across StrictMode
  // remounts (a destroyed Pixi app leaves its canvas's GL context permanently
  // lost). The pendingRef chain still serialises dispose-before-reinit ordering.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    // A fresh game (new level / remount) starts with no conversation or prompt.
    dialogueStore.reset();

    const ready = pendingRef.current.then(() =>
      createGame(host, {
        onHud: ({ score, lives }) => {
          hudStore.setScore(score);
          hudStore.setLives(lives);
        },
        onGameOver: (finalScore) => send({ type: "LOSE", score: finalScore }),
        onWin: (finalScore) => send({ type: "WIN", score: finalScore }),
        onTalkTarget: (dialogueId) => dialogueStore.setPrompt(dialogueId),
      }, levelId)
        .then((g) => {
          if (disposed) {
            g.dispose();
            return;
          }
          gameRef.current = g;
          g.start();
          // Start paused unless the FSM is already in `playing` (the common case
          // when the game was recreated for the next level mid-story).
          g.setPaused(!playingRef.current);
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

    // Background/visibility only RECORD the reason in the HUD store; the single
    // pause effect below composes it with the play-state + dialogue reasons, so
    // none of them overwrites another (e.g. backgrounding mid-conversation).
    const lifecycle = CapApp.addListener("appStateChange", ({ isActive }) => {
      hudStore.setPaused(!isActive);
    });
    const onVisibility = () => hudStore.setPaused(document.hidden);
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
    // Recreate the game when the story moves to a new level (village → cave → …).
  }, [send, levelId]);

  // Drive the engine from the FSM state. levelId is an intentional extra dep so
  // this re-runs after the game is recreated for a new level and unpauses the
  // fresh instance (the new game finished init in a separate async tick).
  // biome-ignore lint/correctness/useExhaustiveDependencies: levelId re-triggers pause sync for the recreated game
  useEffect(() => {
    const g = gameRef.current;
    if (!g) return;
    // SINGLE pause source — composes every reason: not in `playing`, mid-
    // conversation, the app backgrounded/hidden (hudPaused), or a phone held in
    // portrait (rotateBlocking). None overwrites another.
    g.setPaused(!(state === "playing" && !talking && !hudPaused && !rotateBlocking));
  }, [state, levelId, talking, hudPaused, rotateBlocking]);

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
      {state === "playing" && !rotateBlocking && <TouchControls />}
      {state === "playing" && <DialogueBox />}
      {/* Rotate prompt: shown only for phones in portrait during gameplay.
          Tablets, unfolded foldables, and desktop never trigger this. */}
      {rotateBlocking && <RotatePrompt />}
      {state === "cutscene" && cutscene && (
        <CutscenePlayer cutscene={cutscene} onComplete={() => send({ type: "CUTSCENE_DONE" })} />
      )}
      {state === "title" && (
        <Landing
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
            dialogueStore.reset();
            gameRef.current?.restart();
            send({ type: "RESTART" });
          }}
          onTitle={() => send({ type: "TO_TITLE" })}
        />
      )}
    </main>
  );
}
