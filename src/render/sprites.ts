/**
 * Sprite-sheet → PixiJS AnimatedSprite helpers. Browser-only.
 *
 * The asset sheets are horizontal strips: one row of N frames of equal width.
 * `sliceStrip` cuts a loaded base texture into frame textures; `animatedFromStrip`
 * builds a ready-to-play Pixi AnimatedSprite. Frame advance is driven explicitly
 * (we set `autoUpdate=false` and tick from the fixed sim clock for determinism).
 */
import { AnimatedSprite, Assets, Rectangle, Texture } from "pixi.js";

/** Cut a horizontal strip texture into `frames` equal-width frame textures. */
export function sliceStrip(base: Texture, frames: number): Texture[] {
  const fw = Math.floor(base.width / frames);
  const fh = base.height;
  const out: Texture[] = [];
  for (let i = 0; i < frames; i++) {
    out.push(
      new Texture({
        source: base.source,
        frame: new Rectangle(i * fw, 0, fw, fh),
      }),
    );
  }
  return out;
}

export interface StripSpec {
  /** Public URL of the strip sheet (e.g. /assets/player/run_right.png). */
  readonly url: string;
  /** Number of equal-width frames in the strip. */
  readonly frames: number;
  /** Playback frames per second. */
  readonly fps?: number;
}

/**
 * Load a strip sheet and build an AnimatedSprite. autoUpdate is OFF — call
 * `update(deltaFrames)` (or drive `.currentFrame`) from the game clock so the
 * animation stays in lockstep with the deterministic sim.
 */
export async function animatedFromStrip(spec: StripSpec): Promise<AnimatedSprite> {
  const base = await Assets.load<Texture>(spec.url);
  const textures = sliceStrip(base, spec.frames);
  const sprite = new AnimatedSprite(textures);
  sprite.animationSpeed = (spec.fps ?? 12) / 60; // frames advanced per 60fps tick
  sprite.autoUpdate = false;
  // No play() — autoUpdate is off; the caller drives frame advance from the
  // fixed sim clock, so play() (a Ticker registration) would be a no-op.
  return sprite;
}
