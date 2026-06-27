/**
 * Root game shell. Mounts the canvas the engine renders into and the SolidJS
 * HUD overlay, wires Capacitor app-lifecycle (pause on background) + immersive
 * status bar, and starts the loop. The canvas is the touch surface; the HUD
 * sits above it with pointer-events disabled.
 */
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { createGame, type Game } from "@engine/game.ts";
import { Hud } from "@ui/Hud.tsx";
import { createHudModel } from "@ui/hudState.ts";
import { onCleanup, onMount } from "solid-js";

export function App() {
  const hud = createHudModel();
  let canvas: HTMLCanvasElement | undefined;
  let game: Game | undefined;

  onMount(() => {
    if (!canvas) return;
    game = createGame(canvas);
    game.start();

    // Immersive status bar on native (best-effort; web no-ops).
    if (Capacitor.isNativePlatform()) {
      void StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      void StatusBar.hide().catch(() => {});
    }

    // Pause the sim when the app is backgrounded; resume on return.
    const lifecycle = CapApp.addListener("appStateChange", ({ isActive }) => {
      game?.setPaused(!isActive);
      hud.setPaused(!isActive);
    });

    // Also pause on tab visibility change for the web build.
    const onVisibility = () => {
      const hidden = document.hidden;
      game?.setPaused(hidden);
      hud.setPaused(hidden);
    };
    document.addEventListener("visibilitychange", onVisibility);

    onCleanup(() => {
      void lifecycle.then((h) => h.remove());
      document.removeEventListener("visibilitychange", onVisibility);
      game?.dispose();
    });
  });

  return (
    <main style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvas}
        style={{ position: "absolute", inset: "0", width: "100%", height: "100%" }}
      />
      <Hud model={hud} />
    </main>
  );
}
