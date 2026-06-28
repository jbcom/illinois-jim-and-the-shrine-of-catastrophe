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
}

export type GameEvent =
  | { type: "START" }
  | { type: "WIN"; score: number }
  | { type: "LOSE"; score: number }
  | { type: "RESTART" }
  | { type: "TO_TITLE" };

export const gameMachine = createMachine({
  id: "game",
  initial: "title",
  context: { score: 0, bestScore: 0 },
  types: {} as { context: GameContext; events: GameEvent },
  states: {
    title: {
      on: { START: { target: "playing" } },
    },
    playing: {
      on: {
        WIN: {
          target: "won",
          actions: assign({
            score: ({ event }) => event.score,
            bestScore: ({ context, event }) => Math.max(context.bestScore, event.score),
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

export type GameStateValue = "title" | "playing" | "won" | "lost";
