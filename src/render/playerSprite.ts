/**
 * Illinois Jim — the player sprite. Uses the real `classes/adventure` sprite
 * pack: clean, fully-transparent directional strips (96×80 frames, 8 per clip)
 * authored for a top-down/side hybrid. For our side-scroller we drive the
 * left/right facing strips and flip via scale; no chromakey, no prep — the pack
 * already ships proper alpha, loaded straight through the frame-source layer.
 *
 * Browser-only.
 */
import type { AnimatedSprite, Texture } from "pixi.js";
import { type FrameSource, loadFrames, strip } from "@render/frameSource.ts";

export type PlayerState = "idle" | "run" | "attack";

const BASE = "/assets/classes/adventure";
const FRAMES = 8;

/** Right-facing source strip per state (left is the same art, scale-flipped). */
export const PLAYER_ANIMS: Record<PlayerState, FrameSource> = {
  idle: strip(`${BASE}/IDLE/idle_right.png`, FRAMES),
  run: strip(`${BASE}/RUN/run_right.png`, FRAMES),
  attack: strip(`${BASE}/ATTACK 1/attack1_right.png`, FRAMES),
};

/** Per-state playback speed (fps) and looping. */
const TIMING: Record<PlayerState, { fps: number; loop: boolean }> = {
  idle: { fps: 6, loop: true },
  run: { fps: 12, loop: true },
  attack: { fps: 14, loop: false },
};

export interface PlayerSprite {
  readonly sprite: AnimatedSprite;
  /** Switch the active animation (no-op if already current). */
  setState(state: PlayerState): void;
  /** Face left (true) or right (false) via horizontal flip. */
  setFacing(faceLeft: boolean): void;
  /** Advance animation by `ticks` 60fps ticks (deterministic). */
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
