/**
 * Enemy sprite catalog — maps each enemy kind + animation state to its strip
 * sheet (150×150 frames). Browser-only (builds PixiJS AnimatedSprites).
 *
 * Asset shape (public/assets/enemies/<Name>/<State>.png): Idle/Death/Take Hit =
 * 4 frames; Run/Walk/Attack/Flight = 8 frames. The walk-equivalent differs per
 * enemy (Goblin/Mushroom "Run", Skeleton "Walk", Flying eye "Flight").
 */

import { animatedFromStrip } from "@render/sprites.ts";
import type { AnimatedSprite } from "pixi.js";

export type EnemyKind = "goblin" | "skeleton" | "mushroom" | "flyingEye";
export type EnemyState = "idle" | "move" | "attack" | "hurt" | "death";

interface StateSheet {
  readonly file: string;
  readonly frames: number;
}

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
  return { url: `/assets/enemies/${def.dir}/${sheet.file}`, frames: sheet.frames };
}

/** Build an animated enemy sprite for the given kind + state. */
export function createEnemySprite(
  kind: EnemyKind,
  state: EnemyState = "move",
  fps = 10,
): Promise<AnimatedSprite> {
  const { url, frames } = enemySheetUrl(kind, state);
  return animatedFromStrip({ url, frames, fps });
}
