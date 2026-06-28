/**
 * Root game shell (React). Mounts the canvas the engine renders into and the
 * HUD overlay, wires Capacitor app-lifecycle (pause on background) + immersive
 * status bar, and starts the loop. The canvas is the touch surface; the HUD
 * sits above it with pointer-events disabled.
 */
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { createGame, type Game } from "@engine/game.ts";
import { Hud } from "@ui/Hud.tsx";
import { hudStore } from "@ui/hudState.ts";
import { useEffect, useRef } from "react";

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game: Game = createGame(canvas);
    game.start();

    if (Capacitor.isNativePlatform()) {
      void StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      void StatusBar.hide().catch(() => {});
    }

    const lifecycle = CapApp.addListener("appStateChange", ({ isActive }) => {
      game.setPaused(!isActive);
      hudStore.setPaused(!isActive);
    });

    const onVisibility = () => {
      const hidden = document.hidden;
      game.setPaused(hidden);
      hudStore.setPaused(hidden);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      void lifecycle.then((h) => h.remove());
      document.removeEventListener("visibilitychange", onVisibility);
      game.dispose();
    };
  }, []);

  return (
    <main className="relative h-full w-full">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <Hud />
    </main>
  );
}
