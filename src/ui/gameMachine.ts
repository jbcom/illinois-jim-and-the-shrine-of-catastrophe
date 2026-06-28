/**
 * Game-state machine (xstate v5): title → playing → won/lost → restart.
 *
 * Pure UI/flow logic — the deterministic sim runs independently inside the
 * engine loop; this machine governs which SCREEN is shown and when the engine
 * is allowed to run. Context tracks the final score for the result screens.
 */
import { CUTSCENES, cutsceneById } from "@sim/story/cutscenes.ts";
import { FIRST_LEVEL_ID, nextLevelId } from "@render/levels/registry.ts";
import { assign, createMachine } from "xstate";

export interface GameContext {
  score: number;
  bestScore: number;
  /** The cutscene to show while in the `cutscene` state. */
  cutsceneId: string;
  /** The level to load when entering `playing` (set from the cutscene's nextLevel). */
  levelId: string;
}

export type GameEvent =
  | { type: "START" }
  | { type: "WIN"; score: number }
  | { type: "LOSE"; score: number }
  | { type: "RESTART" }
  | { type: "TO_TITLE" }
  /** Advance past the current cutscene (player tapped through the last line). */
  | { type: "CUTSCENE_DONE" }
  /** Seed the persisted best score (loaded from storage on mount). */
  | { type: "SET_BEST"; bestScore: number };

/** The level a finished cutscene leads into (its `nextLevel`, or the first). */
function levelAfterCutscene(cutsceneId: string): string {
  return cutsceneById(cutsceneId)?.nextLevel ?? FIRST_LEVEL_ID;
}

/**
 * The cutscene to play AFTER clearing a level — the next story beat. It's the
 * cutscene whose `nextLevel` is the level that FOLLOWS the one just cleared, so
 * the sequence cutscene → level → cutscene → level chains automatically. Falls
 * back to the "escape" ending when the cleared level is the last one.
 */
function cutsceneAfterLevel(levelId: string): string {
  const next = nextLevelId(levelId);
  if (!next) return "escape";
  const beat = CUTSCENES.find((c) => c.nextLevel === next);
  return beat?.id ?? "escape";
}

export const gameMachine = createMachine({
  id: "game",
  initial: "title",
  context: { score: 0, bestScore: 0, cutsceneId: "intro", levelId: FIRST_LEVEL_ID },
  types: {} as { context: GameContext; events: GameEvent },
  // Available in any state: seed the best score from persistence on mount.
  on: {
    SET_BEST: {
      actions: assign({
        bestScore: ({ context, event }) => Math.max(context.bestScore, event.bestScore),
      }),
    },
  },
  states: {
    title: {
      // PLAY → the opening (intro) cutscene, then into the level.
      on: { START: { target: "cutscene", actions: assign({ cutsceneId: () => "intro" }) } },
    },
    // Full-screen story cutscene; CUTSCENE_DONE advances to the level (intro) or
    // to the win screen (the ending "escape" cutscene).
    cutscene: {
      on: {
        CUTSCENE_DONE: [
          { guard: ({ context }) => context.cutsceneId === "escape", target: "won" },
          {
            target: "playing",
            // Load the level this cutscene leads into (intro→village, descent→cave…).
            actions: assign({ levelId: ({ context }) => levelAfterCutscene(context.cutsceneId) }),
          },
        ],
      },
    },
    playing: {
      on: {
        // Winning the level plays the ending cutscene before the win screen.
        WIN: {
          target: "cutscene",
          actions: assign({
            score: ({ event }) => event.score,
            bestScore: ({ context, event }) => Math.max(context.bestScore, event.score),
            // Play the next story beat (or the "escape" ending after the last level).
            cutsceneId: ({ context }) => cutsceneAfterLevel(context.levelId),
          }),
        },
        LOSE: {
          target: "lost",
          actions: assign({
            score: ({ event }) => event.score,
            bestScore: ({ context, event }) => Math.max(context.bestScore, event.score),
          }),
        },
      },
    },
    won: {
      on: { RESTART: { target: "playing" }, TO_TITLE: { target: "title" } },
    },
    lost: {
      on: { RESTART: { target: "playing" }, TO_TITLE: { target: "title" } },
    },
  },
});

export type GameStateValue = "title" | "cutscene" | "playing" | "won" | "lost";
