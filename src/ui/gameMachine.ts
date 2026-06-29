/**
 * Game-state machine (xstate v5): title → playing → won/lost → restart.
 *
 * Pure UI/flow logic — the deterministic sim runs independently inside the
 * engine loop; this machine governs which SCREEN is shown and when the engine
 * is allowed to run. Context tracks the final score for the result screens.
 */
import { CLIFFHANGER_ID } from "@sim/story/campaign.ts";
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
 * DEV-only boot override: `?level=<id>` jumps straight into `playing` on that
 * level, skipping the title + cutscene chain. Lets us live-verify any single
 * level (e.g. the-whispering-jungle) without playing the whole story up to it.
 * Returns `undefined` in production or when no (valid) param is present, so the
 * normal title → intro flow is untouched.
 */
export function devBootLevel(): string | undefined {
  if (!import.meta.env.DEV) return undefined;
  if (typeof window === "undefined") return undefined;
  const id = new URLSearchParams(window.location.search).get("level");
  return id && id.trim() ? id.trim() : undefined;
}

/**
 * The cutscene to play AFTER clearing a level — the next story beat. It's the
 * cutscene whose `nextLevel` is the level that FOLLOWS the one just cleared, so
 * cutscene → level → cutscene → level chains automatically. Falls back to the
 * CLIFFHANGER ending when the cleared level is the last campaign chapter.
 */
function cutsceneAfterLevel(levelId: string): string {
  const next = nextLevelId(levelId);
  if (!next) return CLIFFHANGER_ID;
  const beat = CUTSCENES.find((c) => c.nextLevel === next);
  return beat?.id ?? CLIFFHANGER_ID;
}

const BOOT_LEVEL = devBootLevel();

export const gameMachine = createMachine({
  id: "game",
  // DEV `?level=<id>` boots straight into that level; otherwise the title screen.
  initial: BOOT_LEVEL ? "playing" : "title",
  context: { score: 0, bestScore: 0, cutsceneId: "intro", levelId: BOOT_LEVEL ?? FIRST_LEVEL_ID },
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
    // to the win screen (the CLIFFHANGER ending cutscene after the last chapter).
    cutscene: {
      on: {
        CUTSCENE_DONE: [
          { guard: ({ context }) => context.cutsceneId === CLIFFHANGER_ID, target: "won" },
          {
            target: "playing",
            // Load the level this cutscene leads into (intro→halward, jungle→…).
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
