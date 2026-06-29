import { frameFromLevel, paintingFromLevel, parallaxFromLevel } from "@render/levels/fromLevel.ts";
import { createPaintingRenderer } from "@render/paintingRenderer.ts";
import { buildFromLevel } from "@sim/world/buildFromLevel.ts";
import { parseLevel } from "@sim/world/levelSchema.ts";
import { Enemy, Facing, Gravity, Player, Position, Size, Velocity } from "@sim/ecs/traits.ts";
import { createCamera } from "@sim/world/camera.ts";
import { page } from "vitest/browser";
import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import levelJson from "../../src/levels/halward-s-reach.level.json";

/**
 * The GenAI Level 1 running through the REAL painting renderer (the same path the
 * live game uses via gameEcs) — proving createPaintingRenderer's new artPainting
 * branch composites the baked transparent props + parallax + sim-driven baked actors.
 * This is the interactive loop, not the static-compose test (level1Scene).
 */
describe("Level 1 live through the painting renderer (GenAI art path)", () => {
  let host: HTMLDivElement | undefined;
  let renderer: Awaited<ReturnType<typeof createPaintingRenderer>> | undefined;
  beforeEach(() => {
    host = document.createElement("div");
    host.style.width = "640px";
    host.style.height = "360px";
    document.body.appendChild(host);
  });
  afterEach(() => {
    renderer?.destroy();
    renderer = undefined;
    host?.remove();
  });

  it("renders the GenAI Level 1 (baked props + sim actors) (visual proof)", async () => {
    const level = parseLevel(levelJson);
    const built = buildFromLevel(level);
    const frame = frameFromLevel(level);

    renderer = await createPaintingRenderer(host!, {
      parallax: parallaxFromLevel(level),
      painting: [], // GenAI path uses artPainting instead
      artPainting: paintingFromLevel(level),
      frameTop: frame.top,
      frameBottom: frame.bottom,
    });

    // Sim world: Jim at the level spawn + one goblin enemy nearby.
    const world = createWorld();
    world.spawn(
      Position({ x: built.spawnX, y: built.spawnY }),
      Velocity({ x: 0, y: 0 }),
      Size({ w: 12, h: 16 }),
      Facing({ dir: 1 }),
      Gravity({ scale: 1 }),
      Player({ grounded: true, coyote: 0, buffer: 0, whip: 0, dead: false }),
    );
    world.spawn(
      Position({ x: built.spawnX + 90, y: built.spawnY }),
      Velocity({ x: 0, y: 0 }),
      Size({ w: 14, h: 14 }),
      Facing({ dir: -1 }),
      Gravity({ scale: 1 }),
      Enemy({ kind: "patrol", visual: "goblin", speed: 40, minX: built.spawnX, maxX: built.spawnX + 180, alive: true }),
    );

    const camera = { ...createCamera(640, frame.bottom - frame.top), x: built.spawnX - 40, y: 0 };
    const viewport = { scale: 1, offsetX: 0, offsetY: 0, viewW: 640, viewH: 360 };

    // Two renders: first kicks off async actor sprite loads, second shows them.
    renderer.render({ world, camera, viewport, alpha: 0, prev: new Map() });
    await new Promise((r) => setTimeout(r, 300));
    renderer.render({ world, camera, viewport, alpha: 0, prev: new Map() });

    await page.screenshot({ path: "level1-live.png" });
    expect(renderer.app.stage.children.length).toBeGreaterThan(0);

    // The composited scene must have real pixels (parallax + baked props + actors).
    const { pixels } = renderer.app.renderer.extract.pixels(renderer.app.stage);
    let opaque = 0;
    for (let i = 3; i < pixels.length; i += 4) if ((pixels[i] ?? 0) > 16) opaque++;
    expect(opaque).toBeGreaterThan(50_000);

    world.destroy();
  });
});
