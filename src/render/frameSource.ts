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

/** The locomotion/action clips the bake pipeline produces per character. */
export type BakedClipName = "idle" | "walk" | "run" | "jump" | "attack" | "hurt" | "death";

/**
 * Manifest emitted by the Blender bake pipeline (scripts/bake/pack-sheet.ts) next to
 * each `<clip>.webp` sheet. Drives frame slicing, playback speed, and the feet anchor.
 */
export interface BakedClipManifest {
  readonly name: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frameCount: number;
  readonly fps: number;
  /** Anchor as a 0..1 fraction of a tile (horizontal centre, vertical feet). */
  readonly anchorX: number;
  readonly anchorY: number;
}

/** A loaded baked clip: its sliced frame textures plus its manifest. */
export interface BakedClip {
  readonly textures: Texture[];
  readonly manifest: BakedClipManifest;
}

/**
 * Load a baked sprite-sheet clip: fetch `<base>/<clip>.json`, slice the sibling
 * `<base>/<clip>.webp` into `frameCount` square frames, and return both. The sheet is
 * a horizontal strip (the bake renders square tiles left→right), so `sliceStrip` cuts
 * it directly.
 */
export async function loadBakedClip(base: string, clip: string): Promise<BakedClip> {
  // Fetch the manifest directly (not via Assets — it's plain JSON, not a Pixi
  // spritesheet atlas, so the Assets JSON parser's atlas detection doesn't apply).
  const res = await fetch(`${base}/${clip}.json`);
  if (!res.ok) throw new Error(`baked clip manifest ${clip}.json: ${res.status}`);
  const manifest = (await res.json()) as BakedClipManifest;
  // Validate at runtime — a bad bake (fps:0, no frames, NaN anchor) would otherwise
  // silently freeze the sprite at frame 0 or mis-anchor it with no error.
  if (!(manifest.frameCount > 0) || !(manifest.fps > 0)) {
    throw new Error(`baked clip ${clip}: invalid frameCount/fps in manifest`);
  }
  if (!Number.isFinite(manifest.anchorX) || !Number.isFinite(manifest.anchorY)) {
    throw new Error(`baked clip ${clip}: non-finite anchor in manifest`);
  }
  let sheet: Texture;
  try {
    sheet = await Assets.load<Texture>(`${base}/${clip}.webp`);
  } catch (e) {
    throw new Error(`baked clip ${clip}.webp failed to load: ${(e as Error).message}`);
  }
  // The sheet must be exactly frameWidth × frameCount or sliceStrip clips columns.
  if (sheet.width !== manifest.frameWidth * manifest.frameCount) {
    throw new Error(
      `baked clip ${clip}: sheet width ${sheet.width} ≠ frameWidth ${manifest.frameWidth} × ${manifest.frameCount}`,
    );
  }
  return { textures: sliceStrip(sheet, manifest.frameCount), manifest };
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
