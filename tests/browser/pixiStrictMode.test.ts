/**
 * Regression: React StrictMode double-mounts the App effect (mount → cleanup →
 * mount). The first mount's createGame()/createPaintingRenderer() initialises a
 * Pixi Application (acquiring a WebGL2 context on a canvas), then cleanup
 * destroys it. Pixi's GL teardown loses the context
 * (`WEBGL_lose_context.loseContext()`), and a WebGL context is bound to its
 * canvas ELEMENT for the element's lifetime: `getContext('webgl2')` on that same
 * element afterwards returns the *lost* context forever. `gl.createShader()`
 * then returns null, and `gl.shaderSource(null, …)` throws inside Pixi's
 * `GlLimitsSystem.contextChange → checkMaxIfStatementsInShader` — the black
 * canvas + `__gameErr` shaderSource stack the live app showed.
 *
 * The fix (src/render/paintingRenderer.ts): each renderer creates and OWNS its
 * own <canvas> inside a stable host container, and removes it on destroy. The
 * host div is reused across remounts; the canvas element never is — so every
 * Application boots onto a virgin, never-lost context. These tests pin that
 * contract: a destroyed renderer's canvas must be gone, and a second renderer on
 * the same host must mint a NEW, healthy canvas/context.
 */
import { CAVE_DESCENT } from "@render/levels/caveDescent.ts";
import { createPaintingRenderer } from "@render/paintingRenderer.ts";
import { CAVE_PARALLAX } from "@render/parallax.ts";
import { describe, expect, it } from "vitest";

const renderer = (host: HTMLElement) =>
  createPaintingRenderer(host, { parallax: CAVE_PARALLAX, painting: CAVE_DESCENT });

function makeHost(): HTMLDivElement {
  const host = document.createElement("div");
  host.style.width = "320px";
  host.style.height = "180px";
  document.body.appendChild(host);
  return host;
}

describe("Pixi renderer under StrictMode-style remounts", () => {
  it("reusing the host (not the canvas) across mounts yields a working renderer", async () => {
    const host = makeHost();

    // First mount: renderer mints its own canvas inside the host.
    const a = await renderer(host);
    expect(a.app.renderer).toBeTruthy();
    expect(a.canvas.parentElement).toBe(host);
    const firstCanvas = a.canvas;

    // StrictMode teardown: dispose the first app. Its canvas (and now-lost GL
    // context) must be removed from the host entirely.
    a.destroy();
    expect(firstCanvas.parentElement).toBeNull();

    // Second mount on the SAME host — must succeed on a brand-new canvas. Without
    // the fix this booted onto the first canvas's lost context and threw in
    // checkMaxIfStatementsInShader (createShader → null → shaderSource throws).
    const b = await renderer(host);
    expect(b.app.renderer).toBeTruthy();
    expect(b.canvas).not.toBe(firstCanvas);
    // A real, non-degenerate shader-if limit proves the GL context is healthy.
    expect(b.app.renderer.limits.maxBatchableTextures).toBeGreaterThan(0);
    // The new context is NOT lost.
    const gl = b.canvas.getContext("webgl2");
    expect(gl?.isContextLost()).toBe(false);

    b.destroy();
    host.remove();
  }, 15_000);

  it("a fresh host per mount is always safe", async () => {
    const host = makeHost();
    const r1 = await renderer(host);
    expect(r1.app.renderer).toBeTruthy();
    r1.destroy();
    host.remove();
  }, 15_000);
});
