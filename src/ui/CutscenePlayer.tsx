/**
 * CutscenePlayer — full-screen 16-bit story cutscene.
 *
 * Layout: the painted scene fills the upper screen edge-to-edge (cover, no
 * letterbox), with a solid 16-bit text BAR pinned to the bottom where the
 * narration reads prominently. Each narration beat FADES IN, HOLDS for a read-
 * appropriate dwell, then FADES OUT before the next; a tap/click/Enter advances
 * immediately (skipping the remaining dwell, or moving to the next beat). After
 * the last beat it calls `onComplete`. Typography is the game's curated display
 * + body faces (see src/ui/fonts.css), not system fonts.
 *
 * Cutscenes are presentation, not simulation — wall-clock timing is fine here
 * (they're never part of a deterministic replay).
 */
import { aspectImagePath, useViewportAspect } from "@ui/aspectImage.ts";
import type { Cutscene } from "@sim/story/cutscenes.ts";
import { useCallback, useEffect, useRef, useState } from "react";

export interface CutscenePlayerProps {
  readonly cutscene: Cutscene;
  readonly onComplete: () => void;
}

/** Per-beat timing (ms). Dwell scales with line length so long lines hold longer. */
const FADE_MS = 600;
const DWELL_BASE_MS = 1400;
const DWELL_PER_CHAR_MS = 28;

type Phase = "in" | "hold" | "out";

function dwellFor(line: string): number {
  return DWELL_BASE_MS + line.length * DWELL_PER_CHAR_MS;
}

export function CutscenePlayer({ cutscene, onComplete }: CutscenePlayerProps) {
  const [line, setLine] = useState(0);
  const [phase, setPhase] = useState<Phase>("in");
  const aspect = useViewportAspect();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const last = line >= cutscene.lines.length - 1;
  const text = cutscene.lines[line] ?? "";

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  /** Move to the next beat, or finish after the last. */
  const next = useCallback(() => {
    clear();
    if (last) onComplete();
    else {
      setLine((n) => n + 1);
      setPhase("in");
    }
  }, [last, onComplete, clear]);

  // Reset to the first beat whenever the cutscene changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only on cutscene swap
  useEffect(() => {
    clear();
    setLine(0);
    setPhase("in");
  }, [cutscene.id, clear]);

  // Drive the fade-in → hold → fade-out cycle for the current beat.
  useEffect(() => {
    clear();
    if (phase === "in") {
      timer.current = setTimeout(() => setPhase("hold"), FADE_MS);
    } else if (phase === "hold") {
      timer.current = setTimeout(() => setPhase("out"), dwellFor(text));
    } else {
      timer.current = setTimeout(next, FADE_MS);
    }
    return clear;
  }, [phase, text, next, clear]);

  // A tap/click/Enter skips ahead: finish a dwell early, else jump to the next beat.
  const skip = useCallback(() => {
    if (phase === "in" || phase === "hold") setPhase("out");
    else next();
  }, [phase, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        skip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [skip]);

  const textVisible = phase === "hold" || phase === "in";

  return (
    <button
      type="button"
      onClick={skip}
      aria-label="Advance cutscene"
      data-phase={phase}
      className="absolute inset-0 flex h-full w-full flex-col bg-black"
    >
      {/* Scene image — the aspect variant composed for this viewport, filling the
          upper region edge-to-edge (so portrait shows the portrait crop, etc.). */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <img
          src={aspectImagePath(cutscene.image, aspect)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ imageRendering: "pixelated" }}
        />
        {/* Soft seam so the image melts into the text bar instead of a hard cut. */}
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-24 bg-gradient-to-t from-[#1a120b] to-transparent" />
      </div>

      {/* Narration BAR — solid, prominent, pinned to the bottom. Safe-area
          padding so the text + hint never clip under the home bar on phones. */}
      <div
        className="relative z-10 border-[#c9a14a]/40 border-t-2 bg-[#1a120b] pt-7 text-center shadow-[0_-8px_24px_rgba(0,0,0,0.6)]"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 1.75rem)",
          // Landscape phones put the notch/home-indicator on the SIDES — pad
          // left/right so the narration never slips under them.
          paddingLeft: "max(env(safe-area-inset-left), 1.5rem)",
          paddingRight: "max(env(safe-area-inset-right), 1.5rem)",
        }}
      >
        <p
          className="cutscene-text mx-auto max-w-3xl text-[#f4e4c1] text-lg leading-relaxed transition-opacity md:text-2xl"
          style={{ opacity: textVisible ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
        >
          {text}
        </p>
        <p className="cutscene-hint mt-4 text-[#c9a14a] text-xs opacity-70">
          {last ? "▸ tap to begin" : "▸ tap to continue"}
        </p>
      </div>
    </button>
  );
}
