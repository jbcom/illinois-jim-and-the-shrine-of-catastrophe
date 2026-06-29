/**
 * Illinois Jim — the player sprite. Baked from a rigged 3D master (Meshy) to
 * transparent WebP sprite sheets via the Blender pipeline (scripts/bake/**): each clip
 * is one horizontal sheet + a JSON manifest (frameWidth, frameCount, fps, feet anchor).
 * The sheets ship under public/assets/sprites/jim/. Art faces RIGHT; left is a flip.
 *
 * Browser-only (loads textures via Pixi Assets).
 */
import type { AnimatedSprite, Texture } from "pixi.js";
import { assetUrl } from "@/assetUrl.ts";
import { type BakedClipManifest, loadBakedClip } from "@render/frameSource.ts";

export type PlayerState = "idle" | "run" | "jump" | "fall" | "attack";

/** Baked clips that physically exist under assets/sprites/jim/. */
type BakedClipName = "idle" | "walk" | "run" | "jump";

const BASE = assetUrl("assets/sprites/jim");

/**
 * Map each gameplay state to a baked clip. `walk` exists as a clip but the sim's
 * PlayerState collapses ground motion into `run`; `fall` reuses the jump arc and
 * `attack` falls back to idle until a whip-attack clip is baked (queued).
 */
const STATE_TO_CLIP: Record<PlayerState, BakedClipName> = {
  idle: "idle",
  run: "run",
  jump: "jump",
  fall: "jump",
  attack: "idle",
};

/**
 * Per-state PLAYBACK timing (fps + loop) the scene's `Anim` trait advances against —
 * this is gameplay pacing, distinct from the bake's source fps. Consumers (scene.ts)
 * read `TIMING[state].fps` when building the render trait before the sprite loads.
 * `loop` is the single source of truth for looping (see `isLooping`).
 */
export const TIMING: Record<PlayerState, { fps: number; loop: boolean }> = {
  idle: { fps: 8, loop: true },
  run: { fps: 18, loop: true },
  jump: { fps: 16, loop: false },
  fall: { fps: 16, loop: false },
  attack: { fps: 16, loop: false },
};

/** Whether a state's clip loops — derived from TIMING (one source of truth). */
const isLooping = (state: PlayerState): boolean => TIMING[state].loop;

export interface PlayerSprite {
  readonly sprite: AnimatedSprite;
  /** Switch the active animation (no-op if already current). */
  setState(state: PlayerState): void;
  /** Face left (true) or right (false) via horizontal flip. */
  setFacing(faceLeft: boolean): void;
  /**
   * Advance animation by `ticks` 60fps ticks (deterministic). For STANDALONE use
   * only (no render-world). When this sprite is managed by a scene's `Anim` trait,
   * `syncSprites` is the sole frame-advance authority — do NOT also call this.
   */
  update(ticks: number): void;
  readonly state: PlayerState;
  destroy(): void;
}

interface Clip {
  readonly textures: Texture[];
  readonly manifest: BakedClipManifest;
}

/** Load every distinct baked clip once; gameplay states share clip instances. */
async function loadAllClips(): Promise<Record<BakedClipName, Clip>> {
  const names: BakedClipName[] = ["idle", "walk", "run", "jump"];
  const loaded = await Promise.all(names.map((n) => loadBakedClip(BASE, n)));
  const out = {} as Record<BakedClipName, Clip>;
  names.forEach((n, i) => {
    const c = loaded[i];
    if (c) out[n] = { textures: c.textures, manifest: c.manifest };
  });
  return out;
}

/** Build the player sprite with all baked clips pre-loaded. */
export async function createPlayerSprite(initial: PlayerState = "idle"): Promise<PlayerSprite> {
  const { AnimatedSprite } = await import("pixi.js");
  const clips = await loadAllClips();

  const clipFor = (state: PlayerState): Clip => clips[STATE_TO_CLIP[state]];

  const initialClip = clipFor(initial);
  const sprite = new AnimatedSprite(initialClip.textures);
  sprite.autoUpdate = false;
  // Anchor from the manifest: horizontal centre of mass, vertical feet contact.
  sprite.anchor.set(initialClip.manifest.anchorX, initialClip.manifest.anchorY);
  let current: PlayerState = initial;
  let faceLeft = false;
  // Sub-frame accumulator. Pixi 8's `currentFrame` getter floors internally, so
  // reading it back would discard fractional progress — track elapsed frames here.
  let acc = 0;

  const apply = (state: PlayerState) => {
    // Preserve animation progress when the new state resolves to the SAME physical
    // clip (e.g. jump→fall both play the jump arc) — resetting would snap a
    // non-looping arc back to frame 0 at its apex.
    const sameClip = STATE_TO_CLIP[state] === STATE_TO_CLIP[current];
    const clip = clipFor(state);
    sprite.textures = clip.textures;
    sprite.animationSpeed = TIMING[state].fps / 60;
    sprite.loop = isLooping(state);
    sprite.anchor.set(clip.manifest.anchorX, clip.manifest.anchorY);
    if (!sameClip) {
      acc = 0;
      sprite.currentFrame = 0;
    }
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
      sprite.currentFrame = isLooping(current)
        ? Math.floor(((acc % count) + count) % count)
        : Math.min(count - 1, Math.floor(Math.max(0, acc)));
    },
    destroy() {
      sprite.destroy();
    },
  };
}
