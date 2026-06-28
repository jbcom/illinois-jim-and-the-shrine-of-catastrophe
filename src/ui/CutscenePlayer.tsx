/**
 * CutscenePlayer — full-screen 16-bit story cutscene. Shows the painted scene
 * image and advances through its narration lines on tap/click/Enter; calls
 * `onComplete` after the last line. Pixel-art crisp, letterboxed, brand-styled.
 */
import type { Cutscene } from "@sim/story/cutscenes.ts";
import { useCallback, useEffect, useState } from "react";

export interface CutscenePlayerProps {
  readonly cutscene: Cutscene;
  readonly onComplete: () => void;
}

export function CutscenePlayer({ cutscene, onComplete }: CutscenePlayerProps) {
  const [line, setLine] = useState(0);
  const last = line >= cutscene.lines.length - 1;

  const advance = useCallback(() => {
    if (last) onComplete();
    else setLine((n) => n + 1);
  }, [last, onComplete]);

  // Reset when the cutscene changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only on cutscene swap
  useEffect(() => setLine(0), [cutscene.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  return (
    <button
      type="button"
      onClick={advance}
      aria-label="Advance cutscene"
      className="absolute inset-0 flex h-full w-full flex-col items-center justify-center bg-black"
    >
      <img
        src={cutscene.image}
        alt=""
        className="absolute inset-0 h-full w-full object-contain"
        style={{ imageRendering: "pixelated" }}
      />
      {/* Narration box, bottom — letterbox-style. */}
      <div className="pointer-events-none absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent px-6 pt-16 pb-10 text-center">
        <p className="mx-auto max-w-2xl font-mono text-base text-[#f4e4c1] leading-relaxed drop-shadow md:text-lg">
          {cutscene.lines[line]}
        </p>
        <p className="mt-4 font-mono text-[#c9a14a] text-xs opacity-80">
          {last ? "▸ tap to continue" : "▸ tap for more"}
        </p>
      </div>
    </button>
  );
}
