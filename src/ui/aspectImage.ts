/**
 * Pick the right aspect variant of a multi-aspect GenAI image for the current
 * viewport. Each scene image (cutscenes, landing hero) is generated in three
 * crops — `<base>-16x9.png` (landscape), `<base>-9x16.png` (portrait), and
 * `<base>-1x1.png` (square middle-ground) — so the image is COMPOSED for the
 * shape it's shown in instead of being hard-cropped by object-cover.
 *
 * Choice by viewport aspect (w/h):
 *   ≥ 1.3 → landscape 16:9   ·   ≤ 0.77 → portrait 9:16   ·   else → square 1:1
 */
import { useEffect, useState } from "react";

export type AspectKey = "16x9" | "9x16" | "1x1";

export function aspectKeyFor(width: number, height: number): AspectKey {
  const ratio = width / Math.max(1, height);
  if (ratio >= 1.3) return "16x9";
  if (ratio <= 0.77) return "9x16";
  return "1x1";
}

/** Turn a base scene path ("assets/cutscenes/cut-01-village") into its variant. */
export function aspectImagePath(base: string, key: AspectKey): string {
  return `${base}-${key}.png`;
}

/** React hook: the current viewport's aspect key, updated on resize/rotate. */
export function useViewportAspect(): AspectKey {
  const [key, setKey] = useState<AspectKey>(() =>
    aspectKeyFor(window.innerWidth, window.innerHeight),
  );
  useEffect(() => {
    const sync = () => setKey(aspectKeyFor(window.innerWidth, window.innerHeight));
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);
  return key;
}
