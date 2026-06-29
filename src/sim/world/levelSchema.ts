/**
 * LEVEL SCHEMA — the Zod-backed language Gemini speaks an ENTIRE level in, start
 * to finish: its story beat, every image it needs (generated, not vendor packs),
 * the surface layout, and every entity placed on it. One `Level` object fully
 * describes one playable level; the engine builds collision + spawns from it and
 * the renderer paints the generated art onto the same surfaces.
 *
 * This schema is the CONTRACT and the PROMPT: every field carries `.describe()` so
 * Gemini knows exactly what to emit, and the validated object drops straight into
 * the build pipeline (scripts/genai-level.mjs generates the art manifest's images,
 * then the engine consumes the layout). Pure data + Zod — no DOM, no engine imports.
 *
 * DESIGN LESSONS BAKED IN:
 *  - RELATIVE surface positioning: a level is a left-to-right list of SURFACES;
 *    art and entities anchor to a surface by {surface, t} — never absolute coords,
 *    so collision and art can't drift.
 *  - NARRATIVE ANCHORING: a raised/overlay platform is always a real object (its
 *    art key); nothing floats.
 *  - ART BY KEY: entities/structures reference generated images by `art` key; the
 *    manifest defines each image's prompt + how it's isolated. The hero pipeline
 *    (Imagen → magenta-key flood → transparent PNG) generalised to everything.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Art manifest — every image the level needs, generated + isolated by key.
// ---------------------------------------------------------------------------

/** How a generated image is turned into a usable asset. */
export const IsolationSchema = z
  .enum(["transparent", "scene", "tileable"])
  .describe(
    "How to process the generated image: 'transparent' = a single object on a flat " +
      "magenta field, flood-filled to alpha (props, NPCs, obstacles, collectibles); " +
      "'scene' = a full painted backdrop kept as-is (parallax layers, cutscene art); " +
      "'tileable' = a horizontally-seamless strip (ground, repeating walls).",
  );

export const ArtRoleSchema = z
  .enum(["parallax", "structure", "prop", "npc", "obstacle", "collectible", "ground", "decor"])
  .describe(
    "What this art is FOR in the level: parallax (far background layer), structure " +
      "(midground building / cave formation), prop (set dressing), npc (a character), " +
      "obstacle (a hazard/foreground blocker), collectible (a pickup), ground (the " +
      "walkable surface strip), decor (foreground flourish).",
  );

export const ArtAssetSchema = z
  .object({
    key: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]*$/)
      .describe("Unique kebab-case id for this image; entities reference it by this key."),
    role: ArtRoleSchema,
    isolation: IsolationSchema,
    prompt: z
      .string()
      .min(20)
      .describe(
        "The full Imagen prompt for this image, in the game's 16-bit SNES/Genesis " +
          "pulp-adventure art style. For 'transparent' isolation, describe ONE object " +
          "on a FLAT SOLID MAGENTA (#FF00FF) edge-to-edge background, no border.",
      ),
    aspect: z
      .enum(["1:1", "16:9", "9:16", "4:3", "3:4"])
      .default("1:1")
      .describe("Imagen aspect ratio. Parallax/scene art is usually 16:9; props 1:1 or 3:4."),
    /** Intended on-screen height in world px (the renderer scales the art to this). */
    worldHeight: z
      .number()
      .positive()
      .describe("Target on-screen HEIGHT in world px; the loader scales the isolated art to it."),
  })
  .describe("One generated image + how to make and size it.");

// ---------------------------------------------------------------------------
// Surfaces — the left-to-right floor profile (collision + art anchor both derive).
// ---------------------------------------------------------------------------

export const SurfaceSchema = z
  .object({
    kind: z
      .enum(["ground", "raised", "gap", "rail"])
      .describe(
        "ground = solid floor; raised = a standable surface above the baseline (a real " +
          "object: roof/ledge/beam — give its art via anchorArt); gap = a chasm (fall = " +
          "death); rail = a mine-cart rail segment the cart rides.",
      ),
    length: z.number().positive().describe("Length of this surface in world px, laid left-to-right."),
    top: z
      .number()
      .default(0)
      .describe("For raised/rail: surface height in px ABOVE the ground baseline (0 = baseline)."),
    anchorArt: z
      .string()
      .optional()
      .describe("For a raised/rail surface: the art `key` of the real object you stand on (required for raised)."),
  })
  .describe("One surface segment in the level's floor profile.");

/** Where a thing sits: on a surface, a fraction along it, optionally raised. */
export const AnchorSchema = z
  .object({
    surface: z.number().int().nonnegative().describe("Index into the surfaces array."),
    t: z.number().min(-0.2).max(1.2).describe("Fraction along the surface (0 = left edge, 1 = right edge)."),
    dy: z.number().default(0).describe("Px ABOVE the surface (a hovering enemy, a coin over a platform)."),
  })
  .describe("A surface-relative placement.");

// ---------------------------------------------------------------------------
// Entities — everything placed on the surfaces, referencing art by key.
// ---------------------------------------------------------------------------

export const EnemySchema = z
  .object({
    art: z.string().describe("Art key (role:npc/obstacle) for this enemy's sprite."),
    at: AnchorSchema,
    behavior: z
      .enum(["patrol", "chase"])
      .describe("patrol = walks a fixed beat; chase = homes on the player."),
    range: z.number().default(96).describe("Patrol half-width in px (ignored for chase)."),
  })
  .describe("A placed enemy.");

export const CollectibleSchema = z
  .object({
    art: z.string().describe("Art key for the pickup sprite."),
    at: AnchorSchema,
    value: z.number().int().positive().default(100).describe("Score awarded."),
  })
  .describe("A placed collectible.");

export const PotSchema = z
  .object({
    art: z.string().describe("Art key for the breakable's sprite."),
    at: AnchorSchema,
    drop: z.enum(["relic", "health", "secret"]).describe("What smashing it yields."),
  })
  .describe("A breakable that drops a reward when hit.");

export const NpcSchema = z
  .object({
    art: z.string().describe("Art key for the NPC sprite."),
    at: AnchorSchema,
    dialogueId: z.string().describe("Key into the dialogue script for this NPC's lines."),
  })
  .describe("A story NPC the player can talk to.");

export const HazardSchema = z
  .object({
    art: z.string().describe("Art key for the hazard's sprite."),
    at: AnchorSchema,
    width: z.number().positive().default(32).describe("Hazard width in px (contact = damage/death)."),
  })
  .describe("A placed hazard (spikes, lava, a pit edge).");

/** A decorative or structural art placement (parallax handled separately). */
export const PlacementSchema = z
  .object({
    art: z.string().describe("Art key (role: structure/prop/decor/ground)."),
    at: AnchorSchema,
    z: z.number().int().default(2).describe("Paint order; higher = nearer the camera."),
    flipX: z.boolean().default(false),
  })
  .describe("A painted art placement anchored to a surface.");

// ---------------------------------------------------------------------------
// The whole level.
// ---------------------------------------------------------------------------

export const LevelSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]*$/)
      .describe("Unique kebab-case level id (matches its cutscene's nextLevel)."),
    title: z.string().describe("The level's display name (e.g. 'The Mine-Cart Plunge')."),
    order: z.number().int().min(1).max(10).describe("Position in the 10-level story spine (1-10)."),
    biome: z
      .string()
      .min(3)
      .describe(
        "The level's biome/setting — FREE-FORM, since Gemini paints the art, so the " +
          "adventure can range widely: e.g. 'clifftop-village', 'deep-jungle', " +
          "'rushing-river-gorge', 'collapsing-mine', 'crystal-cavern', 'sunken-ruins', " +
          "'lava-temple', 'shrine-of-catastrophe', 'storm-peaks'. Drives palette + parallax. " +
          "Aim for TEN DISTINCT biomes across the campaign — no two levels feel the same.",
      ),
    types: z
      .array(
        z.enum([
          "platformer", // run / jump / whip (the base)
          "autoscroller", // the camera forces forward at a fixed pace; keep up or die
          "minecart", // ride a cart on rails — gaps to jump, beams to duck, switches
          "swim", // water traversal — currents, dive/surface, buoyancy
          "chase", // flee a pursuing wall/foe; forced scroll, no stopping
          "boss", // a setpiece foe with phases
          "puzzle", // challenge is a puzzle (light-beams, switches, block-pushing, water-level)
          "run-and-gun", // heavier combat — waves of foes, projectiles (Contra/Metal-Slug flavour)
          "cinematic", // deliberate, weighty traversal — ledge-grabs, trial-and-error trap rooms
          "multidirectional", // scrolls vertically too (climb / descend a tall space, Strider-style)
        ]),
      )
      .min(1)
      .describe(
        "The level's mechanics, as a SET — a level can BLEND types (e.g. " +
          "['platformer','autoscroller'] or ['minecart','chase']), and the campaign can " +
          "repeat a type across levels when it's fun. Vary the mix so the 10 levels stay " +
          "fresh; the first listed type is the dominant feel. Researched archetypes: " +
          "platformer, autoscroller, minecart, swim, chase, boss, puzzle, run-and-gun, " +
          "cinematic, multidirectional.",
      ),
    /** Target play length in minutes — pace the content (surfaces/length) to it. */
    targetMinutes: z
      .number()
      .min(5)
      .max(15)
      .default(10)
      .describe(
        "Intended play time for this level in minutes (5-15, most ~10; the 10-level " +
          "campaign targets ~120 min total). Size the level LENGTH + density to fill it.",
      ),
    story: z
      .object({
        beat: z.string().describe("One-paragraph story beat this level tells (the spine)."),
        narration: z.array(z.string()).describe("Lines shown in the bottom dialogue bar as in-level narration."),
      })
      .describe("The level's place in the story."),
    baselineY: z.number().default(250).describe("World-Y of the ground surface (the walk line)."),
    /** The art the level generates — Gemini's image manifest. */
    art: z.array(ArtAssetSchema).min(3).describe("Every image to generate for this level."),
    /** Far→near parallax layers, by art key (each a role:parallax, isolation:scene). */
    parallax: z
      .array(z.object({ art: z.string(), factor: z.number().min(0).max(1).describe("Scroll speed vs camera (0=fixed sky, 1=foreground).") }))
      .min(2)
      .describe("The parallax depth stack, deepest first."),
    surfaces: z.array(SurfaceSchema).min(1).describe("The left-to-right floor profile."),
    placements: z.array(PlacementSchema).describe("Painted structures/props/decor anchored to surfaces."),
    enemies: z.array(EnemySchema).default([]),
    collectibles: z.array(CollectibleSchema).default([]),
    pots: z.array(PotSchema).default([]),
    npcs: z.array(NpcSchema).default([]),
    hazards: z.array(HazardSchema).default([]),
    spawn: AnchorSchema.describe("Where the player starts."),
    goal: AnchorSchema.describe("Reaching this world-x clears the level."),
  })
  .describe("A complete, playable level — story + generated art + layout + entities.");

export type Level = z.infer<typeof LevelSchema>;
export type ArtAsset = z.infer<typeof ArtAssetSchema>;
export type Surface = z.infer<typeof SurfaceSchema>;
export type Anchor = z.infer<typeof AnchorSchema>;
export type Placement = z.infer<typeof PlacementSchema>;
export type LevelEnemy = z.infer<typeof EnemySchema>;

/**
 * Validate a raw object (e.g. parsed from Gemini's JSON) into a typed Level. Throws
 * a ZodError with precise paths if Gemini's output doesn't conform — the retry loop
 * feeds that back so the model fixes its own output.
 */
export function parseLevel(raw: unknown): Level {
  return LevelSchema.parse(raw);
}

/** Every art key referenced by the level's entities/placements/parallax must exist
 *  in the art manifest. Returns the list of dangling references (empty = valid). */
export function danglingArtRefs(level: Level): string[] {
  const have = new Set(level.art.map((a) => a.key));
  const refs: string[] = [];
  const check = (key: string) => {
    if (!have.has(key)) refs.push(key);
  };
  for (const p of level.parallax) check(p.art);
  for (const p of level.placements) check(p.art);
  for (const e of level.enemies) check(e.art);
  for (const c of level.collectibles) check(c.art);
  for (const p of level.pots) check(p.art);
  for (const n of level.npcs) check(n.art);
  for (const h of level.hazards) check(h.art);
  for (const s of level.surfaces) if (s.anchorArt) check(s.anchorArt);
  return [...new Set(refs)];
}
