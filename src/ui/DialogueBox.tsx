/**
 * DialogueBox — the dedicated bottom text area of the HUD frame. It is the ONE
 * home for in-world words: a "talk" prompt when an NPC is in range, and the
 * speech lines (speaker + text) once a conversation opens. Pinned to the bottom,
 * styled like a 16-bit message window, safe-area padded. Tapping it advances the
 * conversation; tapping the prompt opens it.
 */
import { DIALOGUE } from "@sim/story/dialogue.ts";
import { dialogueStore, useDialogue } from "@ui/dialogueStore.ts";

export function DialogueBox() {
  const { promptId, script, line } = useDialogue();

  // A conversation is open — show the current speech line.
  if (script) {
    const current = script.lines[line];
    const last = line >= script.lines.length - 1;
    return (
      <button
        type="button"
        onClick={() => dialogueStore.advance()}
        aria-label="Advance dialogue"
        className="pointer-events-auto absolute right-0 bottom-0 left-0 z-30 border-[#c9a14a]/50 border-t-2 bg-[#1a120b]/95 px-6 pt-4 text-left shadow-[0_-8px_24px_rgba(0,0,0,0.6)]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1.25rem)" }}
      >
        <div className="font-pixel mb-1 text-[#e3b341] text-sm tracking-wide">
          {current?.speaker ?? script.name}
        </div>
        <p className="font-body max-w-3xl text-[#f3e9d2] text-lg leading-snug md:text-xl">
          {current?.text ?? ""}
        </p>
        <div className="font-pixel mt-2 text-[#c9a14a] text-xs opacity-70">
          {last ? "▸ tap to close" : "▸ tap to continue"}
        </div>
      </button>
    );
  }

  // An NPC is in range but we're not talking yet — show the talk prompt.
  if (promptId) {
    const who = DIALOGUE[promptId]?.name ?? "someone";
    return (
      <button
        type="button"
        onClick={() => {
          const s = DIALOGUE[promptId];
          if (s) dialogueStore.open(s);
        }}
        aria-label={`Talk to ${who}`}
        className="pointer-events-auto absolute right-0 bottom-0 left-0 z-30 border-[#c9a14a]/40 border-t-2 bg-[#1a120b]/85 px-6 py-4 text-center"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1.25rem)" }}
      >
        <span className="font-pixel text-[#e3b341] text-base tracking-wide">
          ▸ Talk to {who}
        </span>
      </button>
    );
  }

  return null;
}
