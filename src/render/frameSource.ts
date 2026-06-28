/**
 * Frame sources — the one abstraction the renderer uses to get an ordered list
 * of frame `Texture`s for an animation, regardless of how the art was authored.
 *
 * Two author formats are first-class and interchangeable:
 *
 *   • STRIP  — N equal-width frames packed in one horizontal sheet (the enemy
 *     and Kenney-style assets). Sliced with `sliceStrip`.
 *   • FRAMES — one transparent PNG per pose, listed in play order (the Imagen-
 *     generated hero poses). Each file is its own whole texture.
 *
 * A renderer asks for `loadFrames(source)` and gets `Texture[]` either way — it
 * never branches on the asset format. `animatedFrom` wraps the result in a
 * deterministic (autoUpdate-off) AnimatedSprite, same as the strip path.
 *
 * Browser-only (loads textures via Pixi Assets).
 */
import { AnimatedSprite, Assets, type Texture } from "pixi.js";
import { sliceStrip } from "@render/sprites.ts";

/** A horizontal strip sheet: `frames` equal-width cells in one image. */
export interface StripSource {
  readonly kind: "strip";
  readonly url: string;
  readonly frames: number;
}

/** A list of single-image frames (one transparent PNG per pose), in play order. */
export interface FramesSource {
  readonly kind: "frames";
  readonly urls: readonly string[];
}

export type FrameSource = StripSource | FramesSource;

/** Convenience: build a strip source. */
export function strip(url: string, frames: number): StripSource {
  return { kind: "strip", url, frames };
}

/** Convenience: build a single-image-frames source. */
export function frames(urls: readonly string[]): FramesSource {
  return { kind: "frames", urls };
}

/** Resolve any frame source to an ordered array of frame textures. */
export async function loadFrames(source: FrameSource): Promise<Texture[]> {
  if (source.kind === "strip") {
    const base = await Assets.load<Texture>(source.url);
    return sliceStrip(base, source.frames);
  }
  // Single-image frames load independently and stay in declared order.
  return Promise.all(source.urls.map((u) => Assets.load<Texture>(u)));
}

export interface AnimOptions {
  /** Playback frames per second (advanced against a 60fps tick). */
  readonly fps?: number;
  /** Whether the animation loops (default true). */
  readonly loop?: boolean;
}

/**
 * Build a deterministic AnimatedSprite from any frame source. `autoUpdate` is
 * OFF — drive frame advance from the fixed sim clock so animation stays in
 * lockstep with the simulation.
 */
export async function animatedFrom(
  source: FrameSource,
  opts: AnimOptions = {},
): Promise<AnimatedSprite> {
  const textures = await loadFrames(source);
  const sprite = new AnimatedSprite(textures);
  sprite.animationSpeed = (opts.fps ?? 12) / 60;
  sprite.autoUpdate = false;
  sprite.loop = opts.loop ?? true;
  // No play() — autoUpdate is off, so frame advance is driven by the caller's
  // update()/currentFrame from the fixed sim clock; play() would be a no-op.
  return sprite;
}
