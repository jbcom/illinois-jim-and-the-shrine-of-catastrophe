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
import { ESCAPE_RUN, ESCAPE_RUN_FRAME } from "@render/levels/escapeRun.ts";
import { SHRINE_APPROACH, SHRINE_APPROACH_FRAME } from "@render/levels/shrineApproach.ts";
import { SHRINE_HEART, SHRINE_HEART_FRAME } from "@render/levels/shrineHeart.ts";
import { VILLAGE_APPROACH, VILLAGE_APPROACH_FRAME } from "@render/levels/villageApproach.ts";
import { frameFromLevel, paintingFromLevel, parallaxFromLevel } from "@render/levels/fromLevel.ts";
import { CAVE_PARALLAX, OVERWORLD_PARALLAX, type ParallaxLayerSpec } from "@render/parallax.ts";
import type { ArtPlacement, Placement } from "@render/composition.ts";
import { buildFromLevel } from "@sim/world/buildFromLevel.ts";
import { parseLevel } from "@sim/world/levelSchema.ts";
import halwardJson from "@/levels/halward-s-reach.level.json";
import {
  type EnemySpawn,
  type GameLevel,
  DESCENT,
  ESCAPE_RUN as ESCAPE_RUN_SIM,
  SHRINE,
  SHRINE_HEART as SHRINE_HEART_SIM,
  VILLAGE,
} from "@sim/world/gameLevel.ts";

export interface LevelBundle {
  readonly id: string;
  /** Sim half: collision tilemap + spawns + goal. */
  readonly sim: GameLevel;
  /** Render half: the painted composition (legacy shape-stamp levels). */
  readonly painting: readonly Placement[];
  /**
   * Render half (GenAI levels): whole transparent baked-prop art on the surfaces.
   * When set, the renderer uses this instead of `painting` (which stays []).
   */
  readonly artPainting?: readonly ArtPlacement[];
  /** Render half: the parallax depth stack. */
  readonly parallax: readonly ParallaxLayerSpec[];
  /** Authored vertical band (cover-scaled to fill the canvas height). */
  readonly frame: { readonly top: number; readonly bottom: number };
  /** Optional opaque ground fill (biomes with transparent ground brushes). */
  readonly groundFill?: { readonly color: number; readonly groundY: number; readonly width: number };
}

/**
 * Adapt a validated GenAI schema Level into a live LevelBundle: collision + spawns
 * from buildFromLevel (mapped to the GameLevel shape), the baked-prop art painting,
 * the parallax + frame. Enemy `behavior`→`kind`; the schema's free-form enemy/npc art
 * is mapped to the baked visual kinds + dialogue roster ids the renderer expects.
 */
/** Schema enemy `art` key → the runtime visual sprite kind. Default flyingEye. */
const ENEMY_VISUAL: Record<string, EnemySpawn["visual"]> = {
  "enemy-crow": "flyingEye",
  "enemy-goblin": "goblin",
  "enemy-skeleton": "skeleton",
  "enemy-mushroom": "mushroom",
};

/** Schema NPC dialogueId → baked roster id. Unmapped ids pass through (warned). */
const NPC_ALIAS: Record<string, string> = {
  mara_farewell: "elder-mara",
  watchman_warning: "watchman-pell",
  ferryman_tip: "ferryman-cole",
};

function genaiBundle(json: unknown): LevelBundle {
  const level = parseLevel(json);
  const built = buildFromLevel(level);
  const sim: GameLevel = {
    id: built.id,
    map: built.map,
    spawnX: built.spawnX,
    spawnY: built.spawnY,
    // Secrets are rich hidden pickups — spawned via the same collectible path.
    collectibles: [
      ...built.collectibles.map((c) => ({ x: c.x, y: c.y, value: c.value })),
      ...built.secrets.map((s) => ({ x: s.x, y: s.y, value: s.value })),
    ],
    // Route each enemy to its visual by art key (crow→flyingEye, etc.).
    enemies: built.enemies.map((e) => ({
      x: e.x,
      y: e.y,
      kind: e.behavior,
      visual: ENEMY_VISUAL[e.art] ?? "flyingEye",
    })),
    pots: built.pots.map((p) => ({ x: p.x, y: p.y, color: "gray" as const, drop: p.drop })),
    switches: built.switches.map((s) => ({ x: s.x, y: s.y, id: s.id })),
    gates: built.gates.map((g) => ({ x: g.x, y: g.y, opensWith: g.opensWith, x0: g.x0, x1: g.x1, top: g.top, bottom: g.bottom })),
    movingPlatforms: built.movingPlatforms.map((m) => ({ x: m.x, y: m.y, axis: m.axis, distance: m.distance, speed: m.speed, width: m.width })),
    npcs: built.npcs.map((n) => {
      const aliased = NPC_ALIAS[n.dialogueId];
      if (!aliased) {
        console.warn(`[level ${built.id}] NPC dialogueId "${n.dialogueId}" has no baked roster alias — falling back to a generic villager.`);
      }
      return { x: n.x, y: n.y, dialogueId: aliased ?? n.dialogueId };
    }),
    goalX: built.goalX,
  };
  return {
    id: level.id,
    sim,
    painting: [],
    artPainting: paintingFromLevel(level),
    parallax: parallaxFromLevel(level),
    frame: frameFromLevel(level),
  };
}

const HALWARD = genaiBundle(halwardJson);

const REGISTRY: Record<string, LevelBundle> = {
  [HALWARD.id]: HALWARD,
  "village-approach": {
    id: "village-approach",
    sim: VILLAGE,
    painting: VILLAGE_APPROACH,
    parallax: OVERWORLD_PARALLAX,
    frame: VILLAGE_APPROACH_FRAME,
    // Overworld grass-topped dirt tiles are partly transparent — fill the floor
    // with a solid earth brown from the ground line down so no sky shows through.
    // A slim crafted-earth band directly under the grass cap (grass top 250, cap
    // ~34px) — a warm soil tone, not flat black. The frame bottom is just below it
    // so the floor is a thin strip, never a dark void.
    groundFill: { color: 0x6b4a2a, groundY: 276, width: 2240 },
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
  "shrine-heart": {
    id: "shrine-heart",
    sim: SHRINE_HEART_SIM,
    painting: SHRINE_HEART,
    parallax: CAVE_PARALLAX,
    frame: SHRINE_HEART_FRAME,
  },
  "escape-run": {
    id: "escape-run",
    sim: ESCAPE_RUN_SIM,
    painting: ESCAPE_RUN,
    parallax: CAVE_PARALLAX,
    frame: ESCAPE_RUN_FRAME,
  },
};

/** The level the story opens on (the overworld village, NOT the cave). */
export const FIRST_LEVEL_ID = HALWARD.id;

const FIRST_BUNDLE = REGISTRY[FIRST_LEVEL_ID] as LevelBundle;

/** Look up a level bundle by id (falls back to the first level if unknown). */
export function levelBundle(id: string): LevelBundle {
  return REGISTRY[id] ?? FIRST_BUNDLE;
}

/** The play order of the story's levels (drives "next level" after a cutscene). */
export const LEVEL_ORDER: readonly string[] = [
  "village-approach",
  "cave-descent",
  "shrine-approach",
  "shrine-heart",
  "escape-run",
];

/** The level that follows `id` in the story (undefined if it's the last). */
export function nextLevelId(id: string): string | undefined {
  const i = LEVEL_ORDER.indexOf(id);
  return i >= 0 && i < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[i + 1] : undefined;
}
