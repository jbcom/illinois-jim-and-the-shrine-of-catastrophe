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

  it("START → playing", () => {
    const a = boot();
    a.send({ type: "START" });
    expect(a.getSnapshot().value).toBe("playing");
  });

  it("WIN → won and records score + bestScore", () => {
    const a = boot();
    a.send({ type: "START" });
    a.send({ type: "WIN", score: 1200 });
    const s = a.getSnapshot();
    expect(s.value).toBe("won");
    expect(s.context.score).toBe(1200);
    expect(s.context.bestScore).toBe(1200);
  });

  it("LOSE → lost; bestScore keeps the max across runs", () => {
    const a = boot();
    a.send({ type: "START" });
    a.send({ type: "WIN", score: 900 });
    a.send({ type: "RESTART" });
    a.send({ type: "LOSE", score: 300 });
    const s = a.getSnapshot();
    expect(s.value).toBe("lost");
    expect(s.context.score).toBe(300);
    expect(s.context.bestScore).toBe(900); // best preserved
  });

  it("RESTART from a result screen returns to playing", () => {
    const a = boot();
    a.send({ type: "START" });
    a.send({ type: "LOSE", score: 100 });
    a.send({ type: "RESTART" });
    expect(a.getSnapshot().value).toBe("playing");
  });

  it("TO_TITLE returns to the title screen", () => {
    const a = boot();
    a.send({ type: "START" });
    a.send({ type: "WIN", score: 500 });
    a.send({ type: "TO_TITLE" });
    expect(a.getSnapshot().value).toBe("title");
  });

  it("ignores gameplay events while on the title screen", () => {
    const a = boot();
    a.send({ type: "WIN", score: 999 });
    expect(a.getSnapshot().value).toBe("title");
  });
});
