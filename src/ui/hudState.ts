/**
 * Engine → HUD signal bridge.
 *
 * The engine writes gameplay state into these Solid signals each frame; HUD
 * components read them and re-render only the exact DOM nodes that changed
 * (fine-grained reactivity, no VDOM diff). The engine never imports Solid
 * components — only this thin signal surface — so it stays framework-agnostic.
 */
import { createSignal } from "solid-js";

export interface HudModel {
  readonly score: () => number;
  readonly lives: () => number;
  readonly paused: () => boolean;
  readonly deviceClass: () => string;
  setScore(n: number): void;
  setLives(n: number): void;
  setPaused(p: boolean): void;
  setDeviceClass(c: string): void;
}

export function createHudModel(): HudModel {
  const [score, setScore] = createSignal(0);
  const [lives, setLives] = createSignal(3);
  const [paused, setPaused] = createSignal(false);
  const [deviceClass, setDeviceClass] = createSignal("desktop");

  return {
    score,
    lives,
    paused,
    deviceClass,
    setScore,
    setLives,
    setPaused,
    setDeviceClass,
  };
}
