/**
 * Breakable-pot rendering — slices a per-color pot sheet's smash sequence into
 * frame textures. Browser-only.
 *
 * Each color sheet (`breakable pots (<color>).png`) is a 4×4 grid of 32×32
 * frames; row 0 is the smash sequence: frame 0 = intact pot → frames 1-3 =
 * shattering. An intact pot shows frame 0; on smash the AnimatedSprite plays the
 * row once (non-looping) to scatter shards, matching the sim's POT_BREAK_TIME.
 */
import { Assets, Rectangle, Texture } from "pixi.js";

export const POT_FRAME = 32;
export const POT_SMASH_FRAMES = 4;

export type PotColor = "gray" | "red" | "white" | "yellow";

const FILE: Record<PotColor, string> = {
  gray: "breakable pots (gray).png",
  red: "breakable pots (red).png",
  white: "breakable pots (white).png",
  yellow: "breakable pots (yellow).png",
};

/** URL of a pot color's sheet. */
export function potSheetUrl(color: PotColor): string {
  return `/assets/breakables/pots/${FILE[color]}`;
}

/**
 * Load a pot's smash-row frames. The sheet is a 32px grid; we slice row 0's first
 * `POT_SMASH_FRAMES` cells — frame 0 is the intact pot, the rest are the smash.
 * (A plain horizontal-strip slice can't be used: the sheet is a multi-row grid,
 * so frame height must be the cell size, not the full sheet height.)
 */
export async function loadPotFrames(color: PotColor): Promise<Texture[]> {
  const base = await Assets.load<Texture>(potSheetUrl(color));
  const out: Texture[] = [];
  for (let col = 0; col < POT_SMASH_FRAMES; col++) {
    out.push(
      new Texture({
        source: base.source,
        frame: new Rectangle(col * POT_FRAME, 0, POT_FRAME, POT_FRAME),
      }),
    );
  }
  return out;
}
