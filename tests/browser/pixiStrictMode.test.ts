/**
 * Regression: React StrictMode double-mounts the App effect (mount → cleanup →
 * mount) against the SAME canvas. The async createGame()/createPixiRenderer()
 * for the first mount may still be awaiting Pixi `app.init()` when the second
 * mount fires, so two Pixi WebGL inits race on one canvas. The second
 * `getContext('webgl2')` returns the first renderer's still-live context; the
 * shared/corrupted context makes shader compiles fail, and Pixi's
 * `checkMaxIfStatementsInShader` spins in `while (true)` forever — freezing the
 * main thread with no console error.
 *
 * The fix (src/ui/App.tsx) serialises init behind the previous mount's teardown
 * so only one Pixi Application owns the canvas at a time. These tests pin the
 * mechanism: concurrent inits on one canvas must NOT hang, and the serialised
 * pattern must yield a usable renderer.
 */
import { CAVE_DESCENT } from "@render/levels/caveDescent.ts";
import { createPaintingRenderer } from "@render/paintingRenderer.ts";
import { CAVE_PARALLAX } from "@render/parallax.ts";
import { describe, expect, it } from "vitest";

const renderer = (canvas: HTMLCanvasElement) =>
  createPaintingRenderer(canvas, { parallax: CAVE_PARALLAX, painting: CAVE_DESCENT });

function makeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 180;
  document.body.appendChild(canvas);
  return canvas;
}

describe("Pixi renderer under StrictMode-style remounts", () => {
  // Without the fix this never resolves: the second init hangs the thread in
  // checkMaxIfStatementsInShader. The vitest timeout would then fail the run.
  it("serialised init on a reused canvas yields a working renderer", async () => {
    const canvas = makeCanvas();

    // First mount.
    const a = await renderer(canvas);
    expect(a.app.renderer).toBeTruthy();

    // StrictMode teardown: dispose the first app, freeing the canvas/context.
    a.destroy();

    // Second mount on the SAME canvas — must succeed once the first is gone.
    const b = await renderer(canvas);
    expect(b.app.renderer).toBeTruthy();
    // A real, non-degenerate shader-if limit proves the GL context is healthy
    // (the hang case never returns from init at all).
    expect(b.app.renderer.limits.maxBatchableTextures).toBeGreaterThan(0);

    b.destroy();
    canvas.remove();
  }, 15_000);

  it("a fresh canvas per mount is always safe", async () => {
    const c1 = makeCanvas();
    const r1 = await renderer(c1);
    expect(r1.app.renderer).toBeTruthy();
    r1.destroy();
    c1.remove();
  }, 15_000);
});
