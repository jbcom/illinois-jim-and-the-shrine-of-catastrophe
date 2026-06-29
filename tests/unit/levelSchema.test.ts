import { danglingArtRefs, type Level, LevelSchema, parseLevel } from "@sim/world/levelSchema.ts";
import { describe, expect, it } from "vitest";

/**
 * A complete, valid level — the reference shape Gemini emits per level. Doubles as
 * a worked example of the contract: art manifest → surfaces → entities by art key.
 */
const SAMPLE: unknown = {
  id: "whispering-jungle",
  title: "The Whispering Jungle",
  order: 2,
  biome: "deep-jungle",
  types: ["platformer", "multidirectional"],
  targetMinutes: 11,
  story: {
    beat: "The trail plunges into an ancient jungle that swallows sound.",
    narration: ["The canopy closes overhead.", "Something watches from the leaves."],
  },
  baselineY: 250,
  art: [
    { key: "jungle-sky", role: "parallax", isolation: "scene", prompt: "16-bit jungle canopy sky, far misty green light", aspect: "16:9", worldHeight: 400 },
    { key: "jungle-trunks", role: "parallax", isolation: "scene", prompt: "16-bit dense jungle tree trunks midground silhouette", aspect: "16:9", worldHeight: 400 },
    { key: "vine-platform", role: "structure", isolation: "transparent", prompt: "a single thick mossy vine-and-bough platform on a flat solid magenta background", worldHeight: 40 },
    { key: "snapping-plant", role: "obstacle", isolation: "transparent", prompt: "a single carnivorous snapping plant on a flat solid magenta background", worldHeight: 48 },
    { key: "relic-coin", role: "collectible", isolation: "transparent", prompt: "a single glowing golden relic coin on a flat solid magenta background", worldHeight: 16 },
    { key: "jungle-guardian", role: "npc", isolation: "transparent", prompt: "a single jungle-guardian villager character on a flat solid magenta background", worldHeight: 60 },
  ],
  parallax: [
    { art: "jungle-sky", factor: 0.1 },
    { art: "jungle-trunks", factor: 0.4 },
  ],
  surfaces: [
    { kind: "ground", length: 800 },
    { kind: "gap", length: 160 },
    { kind: "raised", length: 140, top: 80, anchorArt: "vine-platform" },
    { kind: "ground", length: 900 },
  ],
  placements: [{ art: "vine-platform", at: { surface: 2, t: 0 }, z: 3 }],
  enemies: [{ art: "snapping-plant", at: { surface: 0, t: 0.6 }, behavior: "patrol", range: 60 }],
  collectibles: [{ art: "relic-coin", at: { surface: 2, t: 0.5, dy: 24 }, value: 100 }],
  pots: [],
  npcs: [{ art: "jungle-guardian", at: { surface: 0, t: 0.2 }, dialogueId: "jungle-guardian" }],
  hazards: [],
  spawn: { surface: 0, t: 0.04 },
  goal: { surface: 3, t: 0.95 },
};

describe("levelSchema — the Gemini level contract", () => {
  it("validates a complete level and applies defaults", () => {
    const level = parseLevel(SAMPLE);
    expect(level.id).toBe("whispering-jungle");
    expect(level.types).toEqual(["platformer", "multidirectional"]);
    // defaulted fields are present.
    expect(level.enemies[0]!.at.dy).toBe(0);
    expect(level.collectibles[0]!.value).toBe(100);
  });

  it("a level can BLEND multiple types", () => {
    const level = parseLevel({ ...(SAMPLE as object), types: ["minecart", "chase", "autoscroller"] }) as Level;
    expect(level.types).toContain("chase");
  });

  it("rejects an empty types array (a level must have at least one mechanic)", () => {
    expect(() => parseLevel({ ...(SAMPLE as object), types: [] })).toThrow();
  });

  it("rejects a level whose art manifest is too small (needs the full kit)", () => {
    expect(() => parseLevel({ ...(SAMPLE as object), art: [(SAMPLE as { art: unknown[] }).art[0]] })).toThrow();
  });

  it("danglingArtRefs is empty for a self-consistent level", () => {
    expect(danglingArtRefs(parseLevel(SAMPLE))).toEqual([]);
  });

  it("danglingArtRefs catches an entity referencing a missing art key", () => {
    const broken = parseLevel({
      ...(SAMPLE as object),
      enemies: [{ art: "ghost-that-doesnt-exist", at: { surface: 0, t: 0.5 }, behavior: "chase" }],
    });
    expect(danglingArtRefs(broken)).toContain("ghost-that-doesnt-exist");
  });

  it("a raised surface requires an anchorArt reference that exists", () => {
    // anchorArt pointing at a missing key is a dangling ref (nothing to stand on).
    const broken = parseLevel({
      ...(SAMPLE as object),
      surfaces: [
        { kind: "ground", length: 800 },
        { kind: "raised", length: 100, top: 60, anchorArt: "no-such-platform" },
      ],
      goal: { surface: 1, t: 0.5 },
    });
    expect(danglingArtRefs(broken)).toContain("no-such-platform");
  });

  it("the schema exposes a describe() contract for every field (Gemini-facing)", () => {
    // The top-level schema is described, so the prompt builder can surface it.
    expect(LevelSchema.description).toBeTruthy();
  });
});
