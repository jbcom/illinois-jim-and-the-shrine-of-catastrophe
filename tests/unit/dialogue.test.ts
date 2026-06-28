import { npcInteractionSystem } from "@sim/ecs/systems.ts";
import { Npc, Player, Position, Size } from "@sim/ecs/traits.ts";
import { dialogueById, DIALOGUE } from "@sim/story/dialogue.ts";
import { createWorld } from "koota";
import { afterEach, describe, expect, it } from "vitest";

describe("dialogue registry", () => {
  it("resolves every script by its own id", () => {
    for (const [id, script] of Object.entries(DIALOGUE)) {
      expect(script.id).toBe(id);
      expect(dialogueById(id)).toBe(script);
    }
  });

  it("every line has a non-empty speaker and text", () => {
    for (const script of Object.values(DIALOGUE)) {
      expect(script.name.length).toBeGreaterThan(0);
      expect(script.lines.length).toBeGreaterThan(0);
      for (const line of script.lines) {
        expect(line.speaker.length).toBeGreaterThan(0);
        expect(line.text.length).toBeGreaterThan(0);
      }
    }
  });

  it("returns undefined for an unknown id", () => {
    expect(dialogueById("nobody")).toBeUndefined();
  });
});

describe("npcInteractionSystem", () => {
  const worlds: ReturnType<typeof createWorld>[] = [];
  const mk = () => {
    const w = createWorld();
    worlds.push(w);
    return w;
  };
  afterEach(() => {
    for (const w of worlds.splice(0)) w.destroy();
  });

  const addPlayer = (w: ReturnType<typeof createWorld>, x: number) =>
    w.spawn(Player, Position({ x, y: 0 }), Size({ w: 12, h: 16 }));
  const addNpc = (w: ReturnType<typeof createWorld>, x: number, id: string, range = 28) =>
    w.spawn(Npc({ dialogueId: id, range, talked: false }), Position({ x, y: 0 }), Size({ w: 16, h: 24 }));

  it("returns null when no NPC is in range", () => {
    const w = mk();
    addPlayer(w, 0);
    addNpc(w, 500, "elder-mara");
    expect(npcInteractionSystem(w)).toBeNull();
  });

  it("targets an NPC within range and exposes its dialogueId", () => {
    const w = mk();
    addPlayer(w, 100);
    addNpc(w, 108, "elder-mara");
    const t = npcInteractionSystem(w);
    expect(t?.dialogueId).toBe("elder-mara");
  });

  it("picks the nearest NPC when several are in range", () => {
    const w = mk();
    addPlayer(w, 100);
    addNpc(w, 120, "ferryman-cole", 60);
    addNpc(w, 104, "elder-mara", 60);
    expect(npcInteractionSystem(w)?.dialogueId).toBe("elder-mara");
  });
});
