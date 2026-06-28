/**
 * Illinois Jim — the player sprite. Original side-view hero (teal explorer vest,
 * brass-goggle cap, amber relic-lantern, coiled grappling hook), authored as one
 * transparent PNG per pose under /assets/player/ and assembled into named
 * animations through the unified frame-source layer.
 *
 * Demonstrates the single-image-frames path: each state lists its pose files in
 * play order; the renderer treats them exactly like a sliced strip. Facing is a
 * horizontal scale flip (art is drawn facing right).
 *
 * Browser-only.
 */
import type { AnimatedSprite, Texture } from "pixi.js";
import { type FrameSource, frames, loadFrames } from "@render/frameSource.ts";

export type PlayerState = "idle" | "run" | "jump" | "fall" | "attack";

const BASE = "/assets/player";

/** Named animations → ordered pose files (single transparent images). */
export const PLAYER_ANIMS: Record<PlayerState, FrameSource> = {
  idle: frames([`${BASE}/illinois-jim-idle-1.png`, `${BASE}/illinois-jim-idle-2.png`]),
  run: frames([
    `${BASE}/illinois-jim-run-1.png`,
    `${BASE}/illinois-jim-run-2.png`,
    `${BASE}/illinois-jim-run-3.png`,
    `${BASE}/illinois-jim-run-4.png`,
  ]),
  jump: frames([`${BASE}/illinois-jim-jump-1.png`, `${BASE}/illinois-jim-jump-2.png`]),
  fall: frames([`${BASE}/illinois-jim-fall.png`]),
  attack: frames([`${BASE}/illinois-jim-attack-1.png`, `${BASE}/illinois-jim-attack-2.png`]),
};

/** Per-state playback speed (fps) and looping. */
const TIMING: Record<PlayerState, { fps: number; loop: boolean }> = {
  idle: { fps: 3, loop: true },
  run: { fps: 12, loop: true },
  jump: { fps: 8, loop: false },
  fall: { fps: 1, loop: false },
  attack: { fps: 14, loop: false },
};

export interface PlayerSprite {
  readonly sprite: AnimatedSprite;
  /** Switch the active animation (no-op if already current). */
  setState(state: PlayerState): void;
  /** Face left (true) or right (false) via horizontal flip. */
  setFacing(faceLeft: boolean): void;
  /** Advance animation by `frames` 60fps ticks (deterministic). */
  update(ticks: number): void;
  readonly state: PlayerState;
  destroy(): void;
}

/** Pre-load every player animation's textures so state switches are instant. */
async function loadAllAnims(): Promise<Record<PlayerState, Texture[]>> {
  const states = Object.keys(PLAYER_ANIMS) as PlayerState[];
  const loaded = await Promise.all(states.map((s) => loadFrames(PLAYER_ANIMS[s])));
  const out = {} as Record<PlayerState, Texture[]>;
  states.forEach((s, i) => {
    out[s] = loaded[i] as Texture[];
  });
  return out;
}

/** Build the player sprite with all states pre-loaded. */
export async function createPlayerSprite(initial: PlayerState = "idle"): Promise<PlayerSprite> {
  const { AnimatedSprite } = await import("pixi.js");
  const textures = await loadAllAnims();

  const sprite = new AnimatedSprite(textures[initial]);
  sprite.autoUpdate = false;
  sprite.anchor.set(0.5, 1); // feet-anchored (frames are bottom-aligned)
  let current: PlayerState = initial;
  let faceLeft = false;

  const apply = (state: PlayerState) => {
    sprite.textures = textures[state];
    sprite.animationSpeed = TIMING[state].fps / 60;
    sprite.loop = TIMING[state].loop;
    sprite.gotoAndPlay(0);
    current = state;
  };
  apply(initial);

  return {
    sprite,
    get state() {
      return current;
    },
    setState(state) {
      if (state !== current) apply(state);
    },
    setFacing(left) {
      if (left === faceLeft) return;
      faceLeft = left;
      sprite.scale.x = Math.abs(sprite.scale.x) * (left ? -1 : 1);
    },
    update(ticks) {
      // Deterministic manual advance: Pixi 8's update() wants a Ticker, so we
      // step frames ourselves from the fixed sim tick count.
      const count = sprite.textures.length;
      if (count <= 1) return;
      const next = sprite.currentFrame + sprite.animationSpeed * ticks;
      if (TIMING[current].loop) {
        sprite.currentFrame = ((next % count) + count) % count;
      } else {
        sprite.currentFrame = Math.min(count - 1, Math.max(0, Math.floor(next)));
      }
    },
    destroy() {
      sprite.destroy();
    },
  };
}
