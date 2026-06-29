import { devBootLevel, gameMachine } from "@ui/gameMachine.ts";
import { describe, expect, it } from "vitest";
import { createActor } from "xstate";

const boot = () => {
  const a = createActor(gameMachine);
  a.start();
  return a;
};

describe("gameMachine", () => {
  it("starts on the title screen", () => {
    const a = boot();
    expect(a.getSnapshot().value).toBe("title");
  });

  /**
   * The DEV `?level=` boot override is window-driven; with no DOM (unit/headless
   * context) it returns undefined, so the machine keeps the normal title flow.
   * This guards the production path: no stray dev jump when there's no query.
   */
  it("devBootLevel is undefined without a window (normal title flow preserved)", () => {
    expect(devBootLevel()).toBeUndefined();
  });

  /** START shows the intro cutscene; CUTSCENE_DONE enters the level. */
  const toPlaying = (a: ReturnType<typeof boot>) => {
    a.send({ type: "START" });
    a.send({ type: "CUTSCENE_DONE" });
  };

  it("START → intro cutscene → playing", () => {
    const a = boot();
    a.send({ type: "START" });
    expect(a.getSnapshot().value).toBe("cutscene");
    expect(a.getSnapshot().context.cutsceneId).toBe("intro");
    a.send({ type: "CUTSCENE_DONE" });
    expect(a.getSnapshot().value).toBe("playing");
  });

  /** Clear a level: WIN advances to the next story cutscene, then into its level. */
  const clearLevel = (a: ReturnType<typeof boot>, score: number) => {
    a.send({ type: "WIN", score });
    a.send({ type: "CUTSCENE_DONE" });
  };

  it("WIN on the first level plays the NEXT story beat, not the ending", () => {
    const a = boot();
    toPlaying(a); // in Halward's Reach (first level)
    a.send({ type: "WIN", score: 1200 });
    expect(a.getSnapshot().value).toBe("cutscene");
    // Halward leads into the jungle cutscene → the Whispering Jungle, NOT the ending.
    expect(a.getSnapshot().context.cutsceneId).toBe("jungle");
    a.send({ type: "CUTSCENE_DONE" });
    expect(a.getSnapshot().value).toBe("playing");
    expect(a.getSnapshot().context.levelId).toBe("the-whispering-jungle");
  });

  it("clearing the jungle plays the gorge beat and leads into the Rushing Gorge", () => {
    const a = boot();
    toPlaying(a); // halward
    clearLevel(a, 800); // → jungle
    a.send({ type: "WIN", score: 1000 }); // clear the jungle
    expect(a.getSnapshot().value).toBe("cutscene");
    expect(a.getSnapshot().context.cutsceneId).toBe("gorge");
    a.send({ type: "CUTSCENE_DONE" });
    expect(a.getSnapshot().value).toBe("playing");
    expect(a.getSnapshot().context.levelId).toBe("the-rushing-gorge");
  });

  it("the full arc chains halward → jungle → gorge → mine → crystal → cliffhanger", () => {
    const a = boot();
    toPlaying(a); // halward
    clearLevel(a, 100); // → jungle
    expect(a.getSnapshot().context.levelId).toBe("the-whispering-jungle");
    clearLevel(a, 200); // → gorge
    expect(a.getSnapshot().context.levelId).toBe("the-rushing-gorge");
    clearLevel(a, 300); // → mine
    expect(a.getSnapshot().context.levelId).toBe("the-abandoned-mine");
    clearLevel(a, 400); // → crystal
    expect(a.getSnapshot().context.levelId).toBe("the-crystal-cavern");
    // Crystal Cavern is the LAST chapter → the cliffhanger ending.
    a.send({ type: "WIN", score: 500 });
    expect(a.getSnapshot().context.cutsceneId).toBe("cliffhanger");
  });

  it("WIN on the LAST level (crystal cavern) → cliffhanger → won, records score", () => {
    const a = boot();
    toPlaying(a); // halward
    clearLevel(a, 800); // → jungle
    clearLevel(a, 1000); // → gorge
    clearLevel(a, 1100); // → mine
    clearLevel(a, 1150); // → crystal
    a.send({ type: "WIN", score: 1200 }); // clear the crystal cavern (last level)
    expect(a.getSnapshot().value).toBe("cutscene");
    expect(a.getSnapshot().context.cutsceneId).toBe("cliffhanger");
    a.send({ type: "CUTSCENE_DONE" });
    const s = a.getSnapshot();
    expect(s.value).toBe("won");
    expect(s.context.score).toBe(1200);
    expect(s.context.bestScore).toBe(1200);
  });

  it("LOSE → lost; bestScore keeps the max across runs", () => {
    const a = boot();
    toPlaying(a); // halward
    clearLevel(a, 900); // → jungle
    clearLevel(a, 0); // → gorge
    clearLevel(a, 0); // → mine
    clearLevel(a, 0); // → crystal
    a.send({ type: "WIN", score: 900 }); // clear crystal (last) → cliffhanger
    a.send({ type: "CUTSCENE_DONE" }); // → won
    a.send({ type: "RESTART" });
    a.send({ type: "LOSE", score: 300 });
    const s = a.getSnapshot();
    expect(s.value).toBe("lost");
    expect(s.context.score).toBe(300);
    expect(s.context.bestScore).toBe(900); // best preserved
  });

  it("RESTART from a result screen returns to playing", () => {
    const a = boot();
    toPlaying(a);
    a.send({ type: "LOSE", score: 100 });
    a.send({ type: "RESTART" });
    expect(a.getSnapshot().value).toBe("playing");
  });

  it("TO_TITLE returns to the title screen", () => {
    const a = boot();
    toPlaying(a); // halward
    clearLevel(a, 500); // → jungle
    clearLevel(a, 500); // → gorge
    clearLevel(a, 500); // → mine
    clearLevel(a, 500); // → crystal
    a.send({ type: "WIN", score: 500 }); // clear crystal (last) → cliffhanger
    a.send({ type: "CUTSCENE_DONE" }); // → won
    a.send({ type: "TO_TITLE" });
    expect(a.getSnapshot().value).toBe("title");
  });

  it("ignores gameplay events while on the title screen", () => {
    const a = boot();
    a.send({ type: "WIN", score: 999 });
    expect(a.getSnapshot().value).toBe("title");
  });

  it("SET_BEST seeds the persisted best score in any state", () => {
    const a = boot();
    a.send({ type: "SET_BEST", bestScore: 5000 }); // loaded from storage on mount
    expect(a.getSnapshot().context.bestScore).toBe(5000);
    // A lower run score never lowers the seeded best.
    a.send({ type: "START" });
    a.send({ type: "LOSE", score: 200 });
    expect(a.getSnapshot().context.bestScore).toBe(5000);
  });
});
