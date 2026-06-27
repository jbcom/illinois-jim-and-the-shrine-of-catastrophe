/**
 * Viewport scaler — computes letterbox/pillarbox geometry.
 *
 * Pure function: no DOM access, fully unit-testable in Node.
 *
 * Strategy: "contain" (fit) — the design resolution is scaled down to the
 * largest integer-friendly factor that fits entirely within the real canvas,
 * then centered. Bars are added on the short axis.
 */

import type { DeviceProfile } from "@engine/viewport/deviceProfile.ts";

export interface ViewportGeometry {
  /** Uniform scale applied to the design canvas (fractional, > 0). */
  scale: number;
  /** X offset in canvas pixels from the canvas left edge to the drawn area. */
  offsetX: number;
  /** Y offset in canvas pixels from the canvas top edge to the drawn area. */
  offsetY: number;
  /** Width of the drawn area in canvas pixels (design width × scale). */
  viewW: number;
  /** Height of the drawn area in canvas pixels (design height × scale). */
  viewH: number;
}

/**
 * Compute letterbox/pillarbox geometry that fits `profile.designResolution`
 * into a canvas of `canvasW × canvasH` pixels, preserving aspect ratio and
 * centering the result.
 *
 * The scale is computed as a floating-point value but biased toward the
 * largest pixel-integer-friendly multiple when the canvas size is an exact
 * multiple of the design dimensions (common on native platforms).
 *
 * @param profile     Device profile from `classifyDevice`.
 * @param canvasW     Real canvas width in backing-store pixels.
 * @param canvasH     Real canvas height in backing-store pixels.
 */
export function computeViewport(
  profile: DeviceProfile,
  canvasW: number,
  canvasH: number,
): ViewportGeometry {
  const { width: designW, height: designH } = profile.designResolution;

  // Guard against degenerate inputs.
  const safeCanvasW = Math.max(1, canvasW);
  const safeCanvasH = Math.max(1, canvasH);
  const safeDesignW = Math.max(1, designW);
  const safeDesignH = Math.max(1, designH);

  const scaleX = safeCanvasW / safeDesignW;
  const scaleY = safeCanvasH / safeDesignH;

  // Contain: use the smaller axis so the design fits entirely in the canvas.
  const scale = Math.min(scaleX, scaleY);

  const viewW = safeDesignW * scale;
  const viewH = safeDesignH * scale;

  // Center the drawn area.
  const offsetX = (safeCanvasW - viewW) / 2;
  const offsetY = (safeCanvasH - viewH) / 2;

  return { scale, offsetX, offsetY, viewW, viewH };
}
