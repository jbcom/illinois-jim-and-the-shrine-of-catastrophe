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
import { frameFromLevel, paintingFromLevel, parallaxFromLevel } from "@render/levels/fromLevel.ts";
import type { ParallaxLayerSpec } from "@render/parallax.ts";
import type { ArtPlacement, Placement } from "@render/composition.ts";
import { buildFromLevel } from "@sim/world/buildFromLevel.ts";
import { parseLevel } from "@sim/world/levelSchema.ts";
import halwardJson from "@/levels/halward-s-reach.level.json";
import whisperingJungleJson from "@/levels/the-whispering-jungle.level.json";
import rushingGorgeJson from "@/levels/the-rushing-gorge.level.json";
import abandonedMineJson from "@/levels/the-abandoned-mine.level.json";
import crystalCavernJson from "@/levels/the-crystal-cavern.level.json";
import { campaignLevelOrder, firstLevelId, nextCampaignLevelId } from "@sim/story/campaign.ts";
import type { EnemySpawn, GameLevel } from "@sim/world/gameLevel.ts";

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
  // Level 2 — The Whispering Jungle. The canopy panther is a ground melee beast
  // (goblin's chase/whip cadence reads closest); the carnivorous plant is a
  // rooted snapping ambusher (mushroom's stationary-bob visual). Dedicated baked
  // jungle-enemy characters are a tracked forward item, not this bundle's scope.
  "canopy-panther": "goblin",
  "carnivorous-plant": "mushroom",
  // Level 3 — The Rushing Gorge. The river serpent is a sinuous water threat;
  // the flyingEye's floating/weaving visual reads closest until a baked serpent.
  "river-serpent": "flyingEye",
  // Level 4 — The Abandoned Mine. The cave bat is a flying cave creature — the
  // flyingEye's hovering visual is an exact fit.
  "cave-bat": "flyingEye",
  // Level 5 — The Crystal Cavern. The crystal spider is a scuttling ground predator;
  // the goblin's chase/melee gait reads closest until a baked spider.
  "crystal-spider-art": "goblin",
};

/** Schema NPC dialogueId → baked roster id. Unmapped ids pass through (warned). */
const NPC_ALIAS: Record<string, string> = {
  mara_farewell: "elder-mara",
  watchman_warning: "watchman-pell",
  ferryman_tip: "ferryman-cole",
  // Level 2 — the jungle guardian who warns Jim at the ruin gate.
  guardian_warning: "elder-mara",
  "guardian-warning": "elder-mara",
  // Level 3 — the stranded boatman who tips Jim off about the gorge crossing.
  boatman_help: "ferryman-cole",
  "boatman-help": "ferryman-cole",
  // Level 5 — the lost miner who warns Jim about the singing crystals.
  lost_miner_warning: "watchman-pell",
  "lost-miner-warning": "watchman-pell",
};

function genaiBundle(json: unknown, groundFill?: LevelBundle["groundFill"]): LevelBundle {
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
    // Route each enemy to its visual by art key (crow→flyingEye, etc.) and carry the
    // authored patrol range so wide-pacing foes read as designed (not a fixed ±3-4 tiles).
    enemies: built.enemies.map((e) => ({
      x: e.x,
      y: e.y,
      kind: e.behavior,
      visual: ENEMY_VISUAL[e.art] ?? "flyingEye",
      range: e.range,
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
    ...(groundFill ? { groundFill } : {}),
  };
}

const HALWARD = genaiBundle(halwardJson);
// The jungle floor is a solid damp-earth band under the grass line, not a stamped
// tile sprite — Gemini's opaque ground-tile only works as the parallax floor, so the
// foreground floor is filled like the village. baselineY 250, map 332 tiles × 16px.
const WHISPERING_JUNGLE = genaiBundle(whisperingJungleJson, { color: 0x2c3a22, groundY: 276, width: 5312 });
// The gorge floor is the dark river itself — a deep blue-green band below the
// waterline (the riverbed/water-surface art are parallax/ground textures, never
// foreground sprites). baselineY 250, map 300 tiles × 16px.
const RUSHING_GORGE = genaiBundle(rushingGorgeJson, { color: 0x1b3a44, groundY: 276, width: 4800 });
// The mine floor is dark rock — a near-black warm-brown band (the rocky/rail
// textures are ground/parallax, never sprites). baselineY 250, map 305 tiles × 16px.
const ABANDONED_MINE = genaiBundle(abandonedMineJson, { color: 0x231a14, groundY: 276, width: 4880 });
// The crystal cavern floor is a deep indigo-violet rock band (the crystal-ground-tile
// is a ground texture, never a sprite). baselineY 250, map 293 tiles × 16px.
const CRYSTAL_CAVERN = genaiBundle(crystalCavernJson, { color: 0x1e1830, groundY: 276, width: 4688 });

const REGISTRY: Record<string, LevelBundle> = {
  [HALWARD.id]: HALWARD,
  [WHISPERING_JUNGLE.id]: WHISPERING_JUNGLE,
  [RUSHING_GORGE.id]: RUSHING_GORGE,
  [ABANDONED_MINE.id]: ABANDONED_MINE,
  [CRYSTAL_CAVERN.id]: CRYSTAL_CAVERN,
};

/**
 * The level the story opens on + the play order + "next level" all DERIVE from the
 * CAMPAIGN (src/sim/story/campaign.ts), the single source of truth. Appending a
 * chapter there extends the game with no edits here.
 */
export const FIRST_LEVEL_ID = firstLevelId();

const FIRST_BUNDLE = REGISTRY[FIRST_LEVEL_ID] as LevelBundle;

/** Look up a level bundle by id (falls back to the first level if unknown). */
export function levelBundle(id: string): LevelBundle {
  return REGISTRY[id] ?? FIRST_BUNDLE;
}

/** The play order of the campaign's levels (drives "next level" after a cutscene). */
export const LEVEL_ORDER: readonly string[] = campaignLevelOrder();

/** The level that follows `id` in the campaign (undefined if it's the last). */
export function nextLevelId(id: string): string | undefined {
  return nextCampaignLevelId(id);
}
