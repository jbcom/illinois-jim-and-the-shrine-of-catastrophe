import { createPaintingRenderer } from "@render/paintingRenderer.ts";
import { levelBundle } from "@render/levels/registry.ts";
import {
  Collectible,
  Enemy,
  Facing,
  Gravity,
  Player,
  Position,
  Pot,
  Size,
  Velocity,
} from "@sim/ecs/traits.ts";
import { createCamera } from "@sim/world/camera.ts";
import { page } from "vitest/browser";
import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// The live painting renderer, driven by a real GenAI level bundle (The Whispering
// Jungle) — its baked-prop artPainting + parallax + sim spawns. Proves the renderer
// composes the painting and the sim sprites together in-engine.
const BUNDLE = levelBundle("the-whispering-jungle");

/** Build a sim world populated from the bundle's spawns. */
function buildJungleWorld() {
  const world = createWorld();
  world.spawn(
    Position({ x: BUNDLE.sim.spawnX, y: BUNDLE.sim.spawnY }),
    Velocity({ x: 0, y: 0 }),
    Size({ w: 12, h: 16 }),
    Facing({ dir: 1 }),
    Gravity({ scale: 1 }),
    Player({ grounded: true, coyote: 0, buffer: 0, whip: 0, dead: false }),
  );
  for (const c of BUNDLE.sim.collectibles) {
    world.spawn(Position({ x: c.x, y: c.y }), Size({ w: 10, h: 10 }), Collectible({ value: c.value, taken: false }));
  }
  for (const e of BUNDLE.sim.enemies) {
    world.spawn(
      Position({ x: e.x, y: e.y }),
      Velocity({ x: 0, y: 0 }),
      Size({ w: 14, h: 14 }),
      Facing({ dir: -1 }),
      Gravity({ scale: 1 }),
      Enemy({ kind: e.kind, speed: 40, minX: e.x - 48, maxX: e.x + 48, alive: true }),
    );
  }
  for (const p of BUNDLE.sim.pots) {
    world.spawn(Position({ x: p.x, y: p.y }), Size({ w: 16, h: 16 }), Pot({ color: p.color, drop: p.drop, broken: false, breakTimer: 0 }));
  }
  return world;
}

describe("painting renderer (in-game integration)", () => {
  let host: HTMLDivElement | undefined;
  let renderer: Awaited<ReturnType<typeof createPaintingRenderer>> | undefined;
  beforeEach(() => {
    host = document.createElement("div");
    host.style.width = "480px";
    host.style.height = "270px";
    document.body.appendChild(host);
  });
  afterEach(() => {
    renderer?.destroy();
    renderer = undefined;
    host?.remove();
  });

  it("renders the real game (baked painting + sim sprites) (visual proof)", async () => {
    renderer = await createPaintingRenderer(host!, {
      parallax: BUNDLE.parallax,
      painting: [],
      artPainting: BUNDLE.artPainting ?? [],
      frameTop: BUNDLE.frame.top,
      frameBottom: BUNDLE.frame.bottom,
    });
    const world = buildJungleWorld();
    // Camera in WORLD px: view height = the authored frame, width = aspect.
    const frameH = BUNDLE.frame.bottom - BUNDLE.frame.top;
    const camera = { ...createCamera(Math.round((frameH * 480) / 270), frameH), x: 60, y: BUNDLE.frame.top };
    const viewport = { scale: 1, offsetX: 0, offsetY: 0, viewW: 480, viewH: 270 };

    // Two renders: first creates the async actor sprites, second shows them once loaded.
    renderer.render({ world, camera, viewport, alpha: 0, prev: new Map() });
    await new Promise((r) => setTimeout(r, 300)); // let hero/enemy/pot textures resolve
    renderer.render({ world, camera, viewport, alpha: 0, prev: new Map() });

    await page.screenshot({ path: "game-jungle-live.png" });
    expect(renderer.app.stage.children.length).toBeGreaterThan(0);
    world.destroy();
  });

  it("portrait slice-wrap stacks bands seamlessly — no dark seam between them", async () => {
    // A TALL portrait host engages the slice-wrap. The regression: bands used to be
    // centered in their slot with vertical padding, leaving a dark gap (seam) between
    // consecutive bands. They must now tile edge-to-edge and cover the full height.
    host!.style.width = "390px";
    host!.style.height = "844px";
    renderer = await createPaintingRenderer(host!, {
      parallax: BUNDLE.parallax,
      painting: [],
      artPainting: BUNDLE.artPainting ?? [],
      frameTop: BUNDLE.frame.top,
      frameBottom: BUNDLE.frame.bottom,
    });
    const world = buildJungleWorld();
    const frameH = BUNDLE.frame.bottom - BUNDLE.frame.top;
    const camera = { ...createCamera(frameH, frameH), x: 60, y: BUNDLE.frame.top };
    const screenH = renderer.app.screen.height;
    const visibleBands = 3;
    const viewport = { scale: 1, offsetX: 0, offsetY: 0, viewW: 390, viewH: 844 };
    const portrait = { bandCount: 6, bandWidthWorld: frameH * 1.6, visibleBands, playerBand: 1.5 };

    renderer.render({ world, camera, viewport, alpha: 0, prev: new Map(), portrait });
    await new Promise((r) => setTimeout(r, 300));
    renderer.render({ world, camera, viewport, alpha: 0, prev: new Map(), portrait });

    // Inspect ONLY the band stack's sprites (not the parallax layers), top→bottom.
    const bands = (renderer.bandStack.children as { visible: boolean; y: number; height: number }[])
      .filter((s) => s.visible && s.height > 1)
      .sort((a, b) => a.y - b.y);

    expect(bands.length).toBeGreaterThanOrEqual(visibleBands);
    const bandScreenH = screenH / visibleBands;
    // Each band fills a full slot (no centered-with-padding shrink)…
    for (const s of bands) {
      expect(s.height).toBeGreaterThanOrEqual(bandScreenH - 2);
    }
    // …and consecutive bands abut with no gap (next.y ≈ prev.y + prev.height ± 1px).
    for (let i = 1; i < bands.length; i++) {
      const prev = bands[i - 1];
      const cur = bands[i];
      if (!prev || !cur) continue;
      const gap = cur.y - (prev.y + prev.height);
      expect(Math.abs(gap)).toBeLessThanOrEqual(2);
    }

    await page.screenshot({ path: "game-jungle-portrait-bands.png" });
    world.destroy();
  });
});
