/**
 * Illinois Jim — the player sprite. The ORIGINAL hero (teal explorer vest, brass-
 * goggle cap, amber relic-lantern, coiled grappling hook), generated via Imagen
 * and isolated to clean transparent frames (one PNG per pose — see scripts/
 * genai-assets.mjs + prep-sprites.mjs). Each animation is a list of single-image
 * frames assembled through the frame-source layer; art faces right, flipped via
 * scale for left.
 *
 * Browser-only.
 */
import type { AnimatedSprite, Texture } from "pixi.js";
import { assetUrl } from "@/assetUrl.ts";
import { type FrameSource, frames, loadFrames } from "@render/frameSource.ts";

export type PlayerState = "idle" | "run" | "jump" | "fall" | "attack";

const BASE = assetUrl("assets/player");

/** Ordered single-image frames per state (Imagen-generated, isolated). */
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
export const TIMING: Record<PlayerState, { fps: number; loop: boolean }> = {
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
  /**
   * Advance animation by `ticks` 60fps ticks (deterministic). For STANDALONE use
   * only (no render-world). When this sprite is managed by a scene's `Anim` trait,
   * `syncSprites` is the sole frame-advance authority — do NOT also call this, or
   * the animation double-advances.
   */
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
  sprite.anchor.set(0.5, 1); // feet-anchored
  let current: PlayerState = initial;
  let faceLeft = false;
  // Sub-frame accumulator. Pixi 8's `currentFrame` getter floors internally, so
  // reading it back would discard fractional progress and freeze any sub-60fps
  // animation at frame 0 — track elapsed frames ourselves.
  let acc = 0;

  const apply = (state: PlayerState) => {
    sprite.textures = textures[state];
    sprite.animationSpeed = TIMING[state].fps / 60;
    sprite.loop = TIMING[state].loop;
    acc = 0;
    sprite.currentFrame = 0;
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
      const count = sprite.textures.length;
      if (count <= 1) return;
      acc += sprite.animationSpeed * ticks;
      sprite.currentFrame = TIMING[current].loop
        ? Math.floor(((acc % count) + count) % count)
        : Math.min(count - 1, Math.floor(Math.max(0, acc)));
    },
    destroy() {
      sprite.destroy();
    },
  };
}
