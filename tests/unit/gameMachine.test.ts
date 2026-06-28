import { gameMachine } from "@ui/gameMachine.ts";
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
    toPlaying(a); // in the village (first level)
    a.send({ type: "WIN", score: 1200 });
    expect(a.getSnapshot().value).toBe("cutscene");
    // The village leads into the descent cutscene → the cave, NOT the ending.
    expect(a.getSnapshot().context.cutsceneId).toBe("descent");
    a.send({ type: "CUTSCENE_DONE" });
    expect(a.getSnapshot().value).toBe("playing");
    expect(a.getSnapshot().context.levelId).toBe("cave-descent");
  });

  it("clearing the cave plays the ruins beat and leads into the shrine", () => {
    const a = boot();
    toPlaying(a); // village
    clearLevel(a, 800); // → cave
    a.send({ type: "WIN", score: 1000 }); // clear the cave
    expect(a.getSnapshot().value).toBe("cutscene");
    // The cave leads into the ruins cutscene → the shrine (the climax), NOT the end.
    expect(a.getSnapshot().context.cutsceneId).toBe("ruins");
    a.send({ type: "CUTSCENE_DONE" });
    expect(a.getSnapshot().value).toBe("playing");
    expect(a.getSnapshot().context.levelId).toBe("shrine-approach");
  });

  it("WIN on the LAST level (shrine) → ending cutscene → won, records score + bestScore", () => {
    const a = boot();
    toPlaying(a); // village
    clearLevel(a, 800); // → cave
    clearLevel(a, 1000); // → shrine
    a.send({ type: "WIN", score: 1200 }); // clear the shrine (last level)
    expect(a.getSnapshot().value).toBe("cutscene");
    expect(a.getSnapshot().context.cutsceneId).toBe("escape");
    a.send({ type: "CUTSCENE_DONE" });
    const s = a.getSnapshot();
    expect(s.value).toBe("won");
    expect(s.context.score).toBe(1200);
    expect(s.context.bestScore).toBe(1200);
  });

  it("LOSE → lost; bestScore keeps the max across runs", () => {
    const a = boot();
    toPlaying(a); // village
    clearLevel(a, 900); // → cave
    clearLevel(a, 0); // → shrine
    a.send({ type: "WIN", score: 900 }); // clear the shrine (last) → ending cutscene
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
    toPlaying(a); // village
    clearLevel(a, 500); // → cave
    clearLevel(a, 500); // → shrine
    a.send({ type: "WIN", score: 500 }); // clear the shrine (last) → ending cutscene
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
