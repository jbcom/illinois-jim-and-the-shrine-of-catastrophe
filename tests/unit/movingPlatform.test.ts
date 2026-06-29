import { movingPlatformSystem } from "@sim/ecs/systems.ts";
import { MovingPlatform, Player, Position, Size } from "@sim/ecs/traits.ts";
import { createWorld } from "koota";
import { describe, expect, it } from "vitest";

/** A moving platform oscillates along its axis and carries a player standing on top. */
describe("movingPlatformSystem", () => {
  it("advances the platform along its horizontal path", () => {
    const world = createWorld();
    const e = world.spawn(
      Position({ x: 100, y: 200 }),
      Size({ w: 64, h: 12 }),
      MovingPlatform({ originX: 100, originY: 200, axis: "horizontal", distance: 80, speed: 40, width: 64, phase: 0 }),
    );
    movingPlatformSystem(world, 0.5); // 0.5s at 40px/s = 20px along the path
    const pos = e.get(Position);
    expect(pos!.x).toBeGreaterThan(100);
    expect(pos!.y).toBe(200); // horizontal axis: y fixed
  });

  it("carries the player standing on the platform top", () => {
    const world = createWorld();
    world.spawn(
      Position({ x: 100, y: 200 }),
      Size({ w: 64, h: 12 }),
      MovingPlatform({ originX: 100, originY: 200, axis: "horizontal", distance: 80, speed: 40, width: 64, phase: 0 }),
    );
    // Player resting on the platform's top (player bottom == platform y).
    const player = world.spawn(
      Position({ x: 120, y: 200 - 16 }),
      Size({ w: 12, h: 16 }),
      Player({ grounded: true, coyote: 0, buffer: 0, whip: 0, dead: false }),
    );
    const startX = player.get(Position)!.x;
    movingPlatformSystem(world, 0.25);
    expect(player.get(Position)!.x).toBeGreaterThan(startX); // carried right with the platform
  });

  it("does not carry a player who isn't on top", () => {
    const world = createWorld();
    world.spawn(
      Position({ x: 100, y: 200 }),
      Size({ w: 64, h: 12 }),
      MovingPlatform({ originX: 100, originY: 200, axis: "horizontal", distance: 80, speed: 40, width: 64, phase: 0 }),
    );
    const player = world.spawn(
      Position({ x: 500, y: 100 }), // far away, in the air
      Size({ w: 12, h: 16 }),
      Player({ grounded: false, coyote: 0, buffer: 0, whip: 0, dead: false }),
    );
    movingPlatformSystem(world, 0.25);
    expect(player.get(Position)!.x).toBe(500); // unmoved
  });
});
