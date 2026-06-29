import { paintingFromLevel } from "@render/levels/fromLevel.ts";
import { parseLevel } from "@sim/world/levelSchema.ts";
import { describe, expect, it } from "vitest";
import levelJson from "../../src/levels/halward-s-reach.level.json";

/**
 * paintingFromLevel must emit baked art for the problem-solving layer too
 * (hazards/switches/gates/platforms/secrets live in their own schema arrays, NOT in
 * `placements`), and tag each gate with a `gate:<i>` key so the renderer can fade an
 * open gate. Pure data — no DOM.
 */
describe("paintingFromLevel — problem-solving-layer art", () => {
  const level = parseLevel(levelJson);
  const art = paintingFromLevel(level);
  const urls = art.map((a) => a.url);

  it("paints the baked hazard, switch, gate, platform, and secret art", () => {
    expect(urls.some((u) => u.includes("hazard-spikes"))).toBe(true);
    expect(urls.some((u) => u.includes("switch-lever"))).toBe(true);
    expect(urls.some((u) => u.includes("gate-trailhead"))).toBe(true);
    expect(urls.some((u) => u.includes("moving-platform"))).toBe(true);
    expect(urls.some((u) => u.includes("secret-relic"))).toBe(true);
  });

  it("tags each gate with a gate:<index> key for the renderer to fade", () => {
    const gateKeys = art.map((a) => a.key).filter((k): k is string => !!k && k.startsWith("gate:"));
    expect(gateKeys.length).toBe(level.gates.length);
    expect(gateKeys).toContain("gate:0");
  });
});
