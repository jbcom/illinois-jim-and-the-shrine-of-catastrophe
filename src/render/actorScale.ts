/**
 * Actor scale table — the single source of truth for how big each actor draws.
 *
 * THE BUG THIS FIXES: sprites were scaled by an arbitrary factor on their FRAME
 * size (player frames 96², enemy frames 150²). But the visible creature fills a
 * very different fraction of each frame — the hero's content is 83px tall, a
 * goblin's only 36px — so equal-looking frame factors produced a 4× size
 * mismatch on screen (huge Jim, tiny enemies).
 *
 * THE FIX: scale by MEASURED content height to a deliberate target WORLD height.
 * `scaleFor(kind) = TARGET_WORLD_H[kind] / CONTENT_H[kind]`. Tune the *target*
 * (design intent: how tall the thing should be in the level) and the on-screen
 * ratio stays correct regardless of frame padding.
 *
 * CONTENT_H values are measured from the art (alpha bounding-box height of the
 * canonical standing pose) by scripts/measure-actors.mjs — re-run it if the art
 * changes. Pure data; no DOM.
 */

export type ActorKind = "player" | "goblin" | "skeleton" | "mushroom" | "flyingEye" | "npc";

/**
 * Measured visible-content height (px) of each actor's canonical standing pose,
 * within its native frame. Source: alpha bbox of the art (idle/flight frame).
 */
export const CONTENT_H: Record<ActorKind, number> = {
  // Baked 3D→WebP actors: alpha-bbox height of the idle frame in the 256² tile.
  player: 211, // baked jim/idle
  goblin: 159, // baked goblin/idle
  skeleton: 184, // baked skeleton/idle
  // Still on vendor strip art (non-humanoid) — original small-frame content heights.
  mushroom: 37, // 150² frame
  flyingEye: 31, // 150² frame
  npc: 212, // baked NPC idle (elder-mara), 256² tile
};

/**
 * Deliberate on-screen height (world px) each actor should occupy. The level's
 * authored band is ~380 world-px tall, so the hero at ~64px reads as a clear
 * focal figure; enemies are sized RELATIVE to the hero by design intent:
 *   goblin   chest-high menace    skeleton  about hero height
 *   mushroom small ground hazard  flyingEye mid-air, hero-ish span
 */
export const TARGET_WORLD_H: Record<ActorKind, number> = {
  player: 64,
  goblin: 52,
  skeleton: 62,
  mushroom: 46,
  flyingEye: 48,
  npc: 60, // villagers are adult humans — roughly the hero's height
};

/** The uniform sprite scale that renders `kind` at its target world height. */
export function scaleFor(kind: ActorKind): number {
  return TARGET_WORLD_H[kind] / CONTENT_H[kind];
}
