/**
 * Game-state machine (xstate v5): title → playing → won/lost → restart.
 *
 * Pure UI/flow logic — the deterministic sim runs independently inside the
 * engine loop; this machine governs which SCREEN is shown and when the engine
 * is allowed to run. Context tracks the final score for the result screens.
 */
import { assign, createMachine } from "xstate";

export interface GameContext {
  score: number;
  bestScore: number;
  /** The cutscene to show while in the `cutscene` state. */
  cutsceneId: string;
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

export const gameMachine = createMachine({
  id: "game",
  initial: "title",
  context: { score: 0, bestScore: 0, cutsceneId: "intro" },
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
          { target: "playing" },
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
            cutsceneId: () => "escape",
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
