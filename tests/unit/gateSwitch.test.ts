import { gateSwitchSystem } from "@sim/ecs/systems.ts";
import { Gate, Player, Position, Size, Switch } from "@sim/ecs/traits.ts";
import { createWorld, type World } from "koota";
import { describe, expect, it } from "vitest";

/**
 * The gate/switch puzzle layer: a player overlapping a Switch latches it on (and stays
 * on); a Gate opens once its switch fires; a CLOSED gate blocks the player's rect.
 */
function spawnPlayer(world: World, x: number, y: number) {
  return world.spawn(
    Position({ x, y }),
    Size({ w: 12, h: 16 }),
    Player({ grounded: true, coyote: 0, buffer: 0, whip: 0, dead: false }),
  );
}

describe("gateSwitchSystem", () => {
  it("latches a switch on when the player overlaps it, and stays on after leaving", () => {
    const world = createWorld();
    const player = spawnPlayer(world, 100, 100);
    world.spawn(Position({ x: 100, y: 100 }), Size({ w: 20, h: 24 }), Switch({ id: "lever-a", on: false }));

    const flipped = gateSwitchSystem(world);
    expect(flipped).toBe(true);
    const sw = world.query(Switch)[0]?.get(Switch);
    expect(sw?.on).toBe(true);

    // Player walks away — the switch latches on.
    player.set(Position, { x: 400, y: 100 });
    gateSwitchSystem(world);
    expect(world.query(Switch)[0]?.get(Switch)?.on).toBe(true);
  });

  it("opens a gate once its switch fires", () => {
    const world = createWorld();
    spawnPlayer(world, 100, 100);
    world.spawn(Position({ x: 100, y: 100 }), Size({ w: 20, h: 24 }), Switch({ id: "lever-a", on: false }));
    world.spawn(Position({ x: 300, y: 100 }), Gate({ opensWith: "lever-a", open: false, x0: 290, x1: 320, top: 60, bottom: 120 }));

    gateSwitchSystem(world);
    expect(world.query(Gate)[0]?.get(Gate)?.open).toBe(true);
  });

  it("a closed gate pushes the player back out of its rect", () => {
    const world = createWorld();
    // Player approaching from the LEFT, just overlapping the closed gate's left edge.
    const player = spawnPlayer(world, 286, 90);
    world.spawn(Position({ x: 300, y: 90 }), Gate({ opensWith: "lever-z", open: false, x0: 290, x1: 320, top: 60, bottom: 120 }));

    gateSwitchSystem(world);
    const px = player.get(Position)?.x ?? 0;
    // Pushed back to the left side of the gate (player center was left of gate center).
    expect(px).toBeLessThan(290);
  });

  it("an open gate does not block", () => {
    const world = createWorld();
    const player = spawnPlayer(world, 300, 90);
    world.spawn(Position({ x: 300, y: 90 }), Gate({ opensWith: "x", open: true, x0: 290, x1: 320, top: 60, bottom: 120 }));
    gateSwitchSystem(world);
    expect(player.get(Position)?.x).toBe(300); // unmoved
  });
});
