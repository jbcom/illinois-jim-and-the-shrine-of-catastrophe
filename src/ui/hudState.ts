/**
 * Engine → HUD store. A tiny external store the imperative engine writes to and
 * React subscribes to via useSyncExternalStore. The engine stays
 * framework-agnostic — it only calls the setters; it never imports React.
 *
 * (When koota lands, HUD values derive from ECS traits via koota/react hooks;
 * this store remains the bridge for non-entity globals like paused/deviceClass.)
 */
import { useSyncExternalStore } from "react";

export interface HudSnapshot {
  readonly score: number;
  readonly lives: number;
  readonly paused: boolean;
  readonly deviceClass: string;
}

let snapshot: HudSnapshot = { score: 0, lives: 3, paused: false, deviceClass: "desktop" };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const hudStore = {
  get: (): HudSnapshot => snapshot,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  set(patch: Partial<HudSnapshot>) {
    snapshot = { ...snapshot, ...patch };
    emit();
  },
  setScore: (score: number) => hudStore.set({ score }),
  setLives: (lives: number) => hudStore.set({ lives }),
  setPaused: (paused: boolean) => hudStore.set({ paused }),
  setDeviceClass: (deviceClass: string) => hudStore.set({ deviceClass }),
};

/** React hook: subscribe to the HUD snapshot. */
export function useHud(): HudSnapshot {
  return useSyncExternalStore(hudStore.subscribe, hudStore.get, hudStore.get);
}
