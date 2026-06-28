import { DIALOGUE } from "@sim/story/dialogue.ts";
import { dialogueStore } from "@ui/dialogueStore.ts";
import { beforeEach, describe, expect, it } from "vitest";

describe("dialogueStore", () => {
  beforeEach(() => {
    // Reset to a clean closed state between tests.
    while (dialogueStore.isTalking()) dialogueStore.advance();
    dialogueStore.setPrompt(null);
  });

  it("shows + clears the talk prompt when no conversation is open", () => {
    dialogueStore.setPrompt("elder-mara");
    expect(dialogueStore.get().promptId).toBe("elder-mara");
    dialogueStore.setPrompt(null);
    expect(dialogueStore.get().promptId).toBeNull();
  });

  it("opens a conversation, advances line by line, then closes", () => {
    const script = DIALOGUE["elder-mara"];
    if (!script) throw new Error("missing elder-mara dialogue");
    dialogueStore.open(script);
    expect(dialogueStore.isTalking()).toBe(true);
    expect(dialogueStore.get().line).toBe(0);
    expect(dialogueStore.get().promptId).toBeNull();

    // Walk every line; the last advance closes the conversation.
    for (let i = 1; i < script.lines.length; i++) {
      dialogueStore.advance();
      expect(dialogueStore.get().line).toBe(i);
    }
    dialogueStore.advance();
    expect(dialogueStore.isTalking()).toBe(false);
    expect(dialogueStore.get().script).toBeNull();
  });

  it("does not let a stray prompt overwrite an open conversation", () => {
    const script = DIALOGUE["watchman-pell"];
    if (!script) throw new Error("missing watchman dialogue");
    dialogueStore.open(script);
    dialogueStore.setPrompt("ferryman-cole"); // engine reports another NPC nearby
    expect(dialogueStore.get().script).toBe(script); // conversation undisturbed
    expect(dialogueStore.get().promptId).toBeNull();
  });
});
