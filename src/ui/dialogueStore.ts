/**
 * Dialogue store — the engine→HUD bridge for NPC conversations. The game loop
 * reports the nearest talkable NPC (or null) and, when the player interacts,
 * pushes the open dialogue here; the framed bottom text area subscribes and
 * renders the talk prompt + the speech lines. UI-layer store (useSyncExternalStore),
 * mirroring hudState — the engine only calls setters, never imports React.
 */
import type { DialogueScript } from "@sim/story/dialogue.ts";
import { useSyncExternalStore } from "react";

export interface DialogueSnapshot {
  /** dialogueId of the NPC in talk range (prompt shown), or null. */
  readonly promptId: string | null;
  /** The open conversation, or null when not talking. */
  readonly script: DialogueScript | null;
  /** Index of the current line within the open script. */
  readonly line: number;
}

let snapshot: DialogueSnapshot = { promptId: null, script: null, line: 0 };
const listeners = new Set<() => void>();

function set(next: DialogueSnapshot) {
  if (
    next.promptId === snapshot.promptId &&
    next.script === snapshot.script &&
    next.line === snapshot.line
  ) {
    return;
  }
  snapshot = next;
  for (const l of listeners) l();
}

export const dialogueStore = {
  get: (): DialogueSnapshot => snapshot,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Report the NPC currently in talk range (null clears the prompt). */
  setPrompt(promptId: string | null) {
    // Don't disturb an open conversation by clearing the prompt behind it.
    if (snapshot.script) return;
    set({ ...snapshot, promptId });
  },
  /** Open a conversation (resets to its first line). */
  open(script: DialogueScript) {
    set({ promptId: null, script, line: 0 });
  },
  /** Advance to the next line; closes the conversation past the last line. */
  advance() {
    if (!snapshot.script) return;
    const next = snapshot.line + 1;
    if (next >= snapshot.script.lines.length) set({ promptId: null, script: null, line: 0 });
    else set({ ...snapshot, line: next });
  },
  /** True while a conversation is open (the game should pause input meanwhile). */
  isTalking: (): boolean => snapshot.script !== null,
  /** Clear everything — call on game restart / level change so no stale prompt
   *  or half-finished conversation leaks across worlds. */
  reset() {
    set({ promptId: null, script: null, line: 0 });
  },
};

/** React hook: subscribe to the dialogue snapshot. */
export function useDialogue(): DialogueSnapshot {
  return useSyncExternalStore(dialogueStore.subscribe, dialogueStore.get, dialogueStore.get);
}
