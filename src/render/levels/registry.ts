/**
 * Level registry — bundles each story level's SIM half (collision + spawns, a
 * GameLevel) with its RENDER half (painting placements + parallax stack + the
 * authored vertical frame). createGame looks a level up by id and wires the
 * renderer + sim from one entry, so the story can move village → cave → … by id.
 *
 * The painting and the collision are authored separately but to the same world
 * coordinates (GROUND_Y/FLOOR_Y 300); this registry is where the two halves of a
 * "level as a painting" are paired.
 */
import { CAVE_DESCENT, CAVE_DESCENT_FRAME } from "@render/levels/caveDescent.ts";
import { SHRINE_APPROACH, SHRINE_APPROACH_FRAME } from "@render/levels/shrineApproach.ts";
import { VILLAGE_APPROACH, VILLAGE_APPROACH_FRAME } from "@render/levels/villageApproach.ts";
import { CAVE_PARALLAX, OVERWORLD_PARALLAX, type ParallaxLayerSpec } from "@render/parallax.ts";
import type { Placement } from "@render/composition.ts";
import { type GameLevel, DESCENT, SHRINE, VILLAGE } from "@sim/world/gameLevel.ts";

export interface LevelBundle {
  readonly id: string;
  /** Sim half: collision tilemap + spawns + goal. */
  readonly sim: GameLevel;
  /** Render half: the painted composition. */
  readonly painting: readonly Placement[];
  /** Render half: the parallax depth stack. */
  readonly parallax: readonly ParallaxLayerSpec[];
  /** Authored vertical band (cover-scaled to fill the canvas height). */
  readonly frame: { readonly top: number; readonly bottom: number };
  /** Optional opaque ground fill (biomes with transparent ground brushes). */
  readonly groundFill?: { readonly color: number; readonly groundY: number; readonly width: number };
}

const REGISTRY: Record<string, LevelBundle> = {
  "village-approach": {
    id: "village-approach",
    sim: VILLAGE,
    painting: VILLAGE_APPROACH,
    parallax: OVERWORLD_PARALLAX,
    frame: VILLAGE_APPROACH_FRAME,
    // Overworld grass-topped dirt tiles are partly transparent — fill the floor
    // with a solid earth brown from the ground line down so no sky shows through.
    groundFill: { color: 0x2c1d10, groundY: 318, width: 2240 },
  },
  "cave-descent": {
    id: "cave-descent",
    sim: DESCENT,
    painting: CAVE_DESCENT,
    parallax: CAVE_PARALLAX,
    frame: CAVE_DESCENT_FRAME,
  },
  "shrine-approach": {
    id: "shrine-approach",
    sim: SHRINE,
    painting: SHRINE_APPROACH,
    // The shrine is deep underground — the cave depth stack reads as deep stone
    // behind the carved sanctum (the red glow comes from the props, not the bg).
    parallax: CAVE_PARALLAX,
    frame: SHRINE_APPROACH_FRAME,
  },
};

/** The level the story opens on (the overworld village, NOT the cave). */
export const FIRST_LEVEL_ID = "village-approach";

const FIRST_BUNDLE = REGISTRY[FIRST_LEVEL_ID] as LevelBundle;

/** Look up a level bundle by id (falls back to the first level if unknown). */
export function levelBundle(id: string): LevelBundle {
  return REGISTRY[id] ?? FIRST_BUNDLE;
}

/** The play order of the story's levels (drives "next level" after a cutscene). */
export const LEVEL_ORDER: readonly string[] = ["village-approach", "cave-descent", "shrine-approach"];

/** The level that follows `id` in the story (undefined if it's the last). */
export function nextLevelId(id: string): string | undefined {
  const i = LEVEL_ORDER.indexOf(id);
  return i >= 0 && i < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[i + 1] : undefined;
}
