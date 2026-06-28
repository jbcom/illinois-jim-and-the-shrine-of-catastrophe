/**
 * Root game shell (React). Mounts the canvas the PixiJS renderer draws into and
 * the HUD overlay, wires Capacitor app-lifecycle (pause on background) +
 * immersive status bar, starts the ECS loop, and pipes score/lives to the HUD.
 */
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useEffect, useRef } from "react";
import { createGame, type Game } from "@engine/gameEcs.ts";
import { Hud } from "@ui/Hud.tsx";
import { hudStore } from "@ui/hudState.ts";

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Survives StrictMode's mount→cleanup→mount cycle: the previous mount's
  // async createGame() may still be awaiting app.init() when the next mount
  // fires. Serialising on this ref guarantees the prior game is fully disposed
  // (its WebGL context released) before the next createGame() touches the SAME
  // canvas — otherwise two Pixi inits share one canvas and the second gets a
  // broken GL context, hanging the thread in checkMaxIfStatementsInShader.
  const pendingRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let game: Game | undefined;
    let disposed = false;

    // Chain behind any in-flight teardown so a single Pixi Application owns the
    // canvas at a time across StrictMode (and HMR / route) remounts.
    const ready = pendingRef.current.then(() =>
      createGame(canvas, {
        onHud: ({ score, lives }) => {
          hudStore.setScore(score);
          hudStore.setLives(lives);
        },
      }).then((g) => {
        if (disposed) {
          g.dispose(); // unmounted before init finished
          return;
        }
        game = g;
        game.start();
      }),
    );
    pendingRef.current = ready;

    if (Capacitor.isNativePlatform()) {
      void StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      void StatusBar.hide().catch(() => {});
    }

    const lifecycle = CapApp.addListener("appStateChange", ({ isActive }) => {
      game?.setPaused(!isActive);
      hudStore.setPaused(!isActive);
    });

    const onVisibility = () => {
      const hidden = document.hidden;
      game?.setPaused(hidden);
      hudStore.setPaused(hidden);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      void lifecycle.then((h) => h.remove());
      document.removeEventListener("visibilitychange", onVisibility);
      // Dispose only AFTER init settles — if app.init() is still in flight,
      // `game` is undefined here and a bare game?.dispose() would leak the
      // half-built Pixi Application + its WebGL context onto the canvas. The
      // next mount chains on this promise, so it sees a free canvas.
      pendingRef.current = ready.then(() => {
        game?.dispose();
      });
    };
  }, []);

  return (
    <main className="relative h-full w-full">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <Hud />
    </main>
  );
}
