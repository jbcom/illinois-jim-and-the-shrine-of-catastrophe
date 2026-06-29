/**
 * Enemy sprite catalog — maps each enemy kind + animation state to its sprite art.
 * Browser-only (builds PixiJS AnimatedSprites).
 *
 * Two art backends coexist:
 *  • BAKED — a 3D Meshy master baked to transparent WebP sheets + manifests under
 *    assets/sprites/<kind>/ (goblin). Loaded via loadBakedClip; the enemy state maps
 *    onto the baked clip names (idle/walk/run/attack), with hurt/death reusing idle
 *    until those clips are baked.
 *  • STRIP — the legacy vendor strip sheets (150×150) under assets/enemies/<Name>/
 *    (skeleton/mushroom/flyingEye), pending their own 3D bakes.
 */

import { type BakedClipName, loadBakedClip } from "@render/frameSource.ts";
import { animatedFromStrip } from "@render/sprites.ts";
import { assetUrl } from "@/assetUrl.ts";
import { AnimatedSprite } from "pixi.js";

export type EnemyKind = "goblin" | "skeleton" | "mushroom" | "flyingEye";
export type EnemyState = "idle" | "move" | "attack" | "hurt" | "death";

interface StateSheet {
  readonly file: string;
  readonly frames: number;
}

/** Enemies whose art comes from the 3D→WebP bake pipeline (assets/sprites/<base>/). */
const BAKED: Partial<Record<EnemyKind, { base: string; clip: Record<EnemyState, BakedClipName> }>> = {
  goblin: {
    base: "assets/sprites/goblin",
    clip: { idle: "idle", move: "run", attack: "attack", hurt: "idle", death: "idle" },
  },
  skeleton: {
    base: "assets/sprites/skeleton",
    // Skeletons shamble — map "move" to the walk clip, not run.
    clip: { idle: "idle", move: "walk", attack: "attack", hurt: "idle", death: "idle" },
  },
};

const SHEETS: Record<EnemyKind, { dir: string; states: Record<EnemyState, StateSheet> }> = {
  goblin: {
    dir: "Goblin",
    states: {
      idle: { file: "Idle.png", frames: 4 },
      move: { file: "Run.png", frames: 8 },
      attack: { file: "Attack.png", frames: 8 },
      hurt: { file: "Take Hit.png", frames: 4 },
      death: { file: "Death.png", frames: 4 },
    },
  },
  skeleton: {
    dir: "Skeleton",
    states: {
      idle: { file: "Idle.png", frames: 4 },
      move: { file: "Walk.png", frames: 4 },
      attack: { file: "Attack.png", frames: 8 },
      hurt: { file: "Take Hit.png", frames: 4 },
      death: { file: "Death.png", frames: 4 },
    },
  },
  mushroom: {
    dir: "Mushroom",
    states: {
      idle: { file: "Idle.png", frames: 4 },
      move: { file: "Run.png", frames: 8 },
      attack: { file: "Attack.png", frames: 8 },
      hurt: { file: "Take Hit.png", frames: 4 },
      death: { file: "Death.png", frames: 4 },
    },
  },
  flyingEye: {
    dir: "Flying eye",
    states: {
      idle: { file: "Flight.png", frames: 8 },
      move: { file: "Flight.png", frames: 8 },
      attack: { file: "Attack.png", frames: 8 },
      hurt: { file: "Take Hit.png", frames: 4 },
      death: { file: "Death.png", frames: 4 },
    },
  },
};

export const ENEMY_FRAME_SIZE = 150;

export function enemySheetUrl(kind: EnemyKind, state: EnemyState): { url: string; frames: number } {
  const def = SHEETS[kind];
  const sheet = def.states[state];
  return { url: assetUrl(`assets/enemies/${def.dir}/${sheet.file}`), frames: sheet.frames };
}

/** Build an animated enemy sprite for the given kind + state. */
export async function createEnemySprite(
  kind: EnemyKind,
  state: EnemyState = "move",
  fps = 10,
): Promise<AnimatedSprite> {
  const baked = BAKED[kind];
  if (baked) {
    // 3D→WebP baked enemy: load the mapped clip, feet-anchored from the manifest.
    // assetUrl() applies BASE_URL so the path resolves under the Pages subpath.
    const { textures, manifest } = await loadBakedClip(assetUrl(baked.base), baked.clip[state]);
    const sprite = new AnimatedSprite(textures);
    sprite.autoUpdate = false;
    sprite.anchor.set(manifest.anchorX, manifest.anchorY);
    sprite.animationSpeed = fps / 60;
    return sprite;
  }
  const { url, frames } = enemySheetUrl(kind, state);
  return animatedFromStrip({ url, frames, fps });
}
