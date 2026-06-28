/**
 * Shrine shape catalog — the third-act biome's SIGNATURE stamps. Unlike the cave
 * catalog (rects sliced from one packed sheet), these are whole transparent PNGs
 * generated for the shrine and isolated by scripts/prep-props.mjs: a golden idol
 * on its altar (the GOAL), a grand cracked staircase, blood-flamed braziers, and
 * broken carved pillars — all in the weathered green-stone / tarnished-gold /
 * blood-red key of cut-04-shrine.
 *
 * The shrine LEVEL composes these over the reused cave masonry (CAVE.brickWall*,
 * CAVE.beam*, CAVE_PROPS rock masses) so the inner sanctum reads as carved,
 * built architecture — ruined temple, not wild cave. Each stamp is the full
 * image (x/y 0, w/h = the trimmed PNG's native size); the level's `on()` helper
 * anchors it by its real height.
 */
import type { ShapeStamp } from "@render/composition.ts";
import { assetUrl } from "@/assetUrl.ts";

const DIR = assetUrl("assets/biomes/shrine");
/** A whole-image stamp (these props are individual transparent PNGs, not a sheet). */
const whole = (file: string, w: number, h: number): ShapeStamp => ({
  sheet: `${DIR}/${file}`,
  x: 0,
  y: 0,
  w,
  h,
});

export const SHRINE_PROPS = {
  /** The golden idol on its cracked stone altar — the level's GOAL centerpiece. */
  idol: whole("shrine-idol-altar.png", 311, 665),
  /** A stone candle-brazier with a blood-red flame — flanks the altar / lights the path. */
  brazier: whole("shrine-brazier.png", 281, 495),
  /** A broken fluted temple pillar — ruined columns framing the sanctum. */
  pillarBroken: whole("shrine-pillar-broken.png", 284, 717),
  /** The grand cracked staircase (gold-inlaid, lion-boss pillars) up to the idol. */
  steps: whole("shrine-steps.png", 443, 439),
} as const;

export type ShrinePropName = keyof typeof SHRINE_PROPS;
