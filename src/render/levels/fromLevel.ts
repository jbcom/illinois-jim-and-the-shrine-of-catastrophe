/**
 * RENDER a schema Level — the paint half of the GenAI pipeline. Given a validated
 * `Level` (Gemini's output) + its generated, isolated art (one PNG per art key at
 * public/assets/levels/<id>/<key>.webp), this produces the parallax spec + the
 * painting `Placement[]` the existing compositor draws, anchoring every structure/
 * prop/decor to the SAME surfaces buildFromLevel derives collision from (so art and
 * collision can't drift). Browser-agnostic data (returns specs, not Pixi objects).
 *
 * Each art asset is a whole transparent PNG; a placement scales it so its on-screen
 * HEIGHT equals the asset's authored worldHeight, then bottom-anchors it on its
 * surface (structures/props) or hangs the parallax behind everything.
 */
import type { ArtPlacement } from "@render/composition.ts";
import type { ParallaxLayerSpec } from "@render/parallax.ts";
import { resolveAnchor, resolveSurfaces } from "@sim/world/buildFromLevel.ts";
import type { Level, Surface } from "@sim/world/levelSchema.ts";
import { assetUrl } from "@/assetUrl.ts";

/** The directory a level's generated art is curated into. */
export function levelArtDir(levelId: string): string {
  return assetUrl(`assets/levels/${levelId}`);
}

/**
 * Structure/prop art keys whose Gemini 2D art was opaque-with-fake-checkerboard and is
 * replaced by a transparent baked-3D prop (public/assets/props/<name>.webp). Keyed by
 * the level's art key → baked prop name. Keys not listed keep their level art.
 * See the props-buildings-also-3d memory.
 */
const BAKED_PROP: Record<string, string> = {
  "pitched-house-1": "pitched-house",
  "pitched-house-2": "pitched-house-2",
  "market-stall": "market-stall",
  "cliff-ledge-structure": "cliff-ledge",
  "switch-lever": "switch-lever",
  "gate-trailhead": "gate-trailhead",
  "collectible-relic-coin": "relic-coin",
  "breakables-pot": "pot",
  "hazard-spikes": "hazard-spikes",
  "moving-platform-wood": "moving-platform",
  "secret-relic": "secret-relic",
  // Level 2 — The Whispering Jungle (keys match the prop names directly).
  "giant-root-platform": "giant-root-platform",
  "vine-tangle-gate": "vine-tangle-gate",
  "strangler-fig-platform": "strangler-fig-platform",
  "jungle-weight-lever": "jungle-weight-lever",
  "carnivorous-plant": "carnivorous-plant",
  "golden-orchid": "golden-orchid",
  "vine-bridge": "vine-bridge",
  "collapsing-log": "collapsing-log",
  "mushroom-shelf": "mushroom-shelf",
  "canopy-walkway": "canopy-walkway",
  "ancient-stone-foundation": "ancient-stone-foundation",
  "glow-fruit": "glow-fruit",
  "jungle-thorns": "jungle-thorns",
  "jungle-totem": "jungle-totem",
  "jungle-urn": "jungle-urn",
  // Level 3 — The Rushing Gorge (keys match the prop names directly).
  "wet-rock-ledge": "wet-rock-ledge",
  "static-log-raft": "static-log-raft",
  "log-raft-platform": "log-raft-platform",
  "floating-relic": "floating-relic",
  "sunken-lever": "sunken-lever",
  "crystal-wall-gate": "crystal-wall-gate",
  "runic-disk-key": "runic-disk-key",
  "floating-crate-pot": "floating-crate-pot",
  "sharp-river-rocks": "sharp-river-rocks",
  // Level 4 — The Abandoned Mine (switch-lever reuses Level 1's baked prop).
  // rail-straight is the rail SURFACE anchorArt (role:ground) — baked transparent so
  // the track reads as visible rails, not an opaque Gemini ground-texture rectangle.
  "rail-straight": "rail-straight",
  "mine-cart-rusted": "mine-cart-rusted",
  "support-beam-low": "support-beam-low",
  "falling-debris": "falling-debris",
  "dynamite-crate": "dynamite-crate",
  "gold-ore-chunk": "gold-ore-chunk",
  "relic-old-lantern": "relic-old-lantern",
  "gate-barricade": "gate-barricade",
  "pot-clay": "pot-clay",
  // Level 5 — The Crystal Cavern. Six baked crystal props; the remaining four reuse
  // existing baked props (a shard→secret-relic glow, the rare geode→the geode art, the
  // crystal spikes→the spike hazard, the crystal key→the runic disk key) so the level
  // ships complete without re-spend ([[no-blocking-on-asset-licensing]]).
  "crystal-platform-art": "crystal-platform-art",
  "fragile-bridge-art": "fragile-bridge-art",
  "geode-prop-art": "geode-prop-art",
  "light-receiver-switch-art": "light-receiver-switch-art",
  "lever-switch-art": "lever-switch-art",
  "crystal-gate-art": "crystal-gate-art",
  "glowing-shard-art": "secret-relic",
  "rare-geode-art": "geode-prop-art",
  "crystal-spikes-art": "hazard-spikes",
  "key-relic-art": "runic-disk-key",
};

/** Resolve an art key to its URL — a baked prop WebP if one exists, else level art. */
function artUrl(levelId: string, key: string): string {
  const baked = BAKED_PROP[key];
  return baked ? assetUrl(`assets/props/${baked}.webp`) : `${levelArtDir(levelId)}/${key}.webp`;
}

/** Look up an art asset by key (throws if missing — danglingArtRefs caught it earlier). */
function artByKey(level: Level, key: string): Level["art"][number] {
  const a = level.art.find((x: Level["art"][number]) => x.key === key);
  if (!a) throw new Error(`level ${level.id}: render references missing art "${key}"`);
  return a;
}

/** The parallax depth stack for a Level (deepest first), from its art + factors. */
export function parallaxFromLevel(level: Level): ParallaxLayerSpec[] {
  return level.parallax.map((p: Level["parallax"][number]) => ({
    url: `${levelArtDir(level.id)}/${p.art}.webp`,
    factor: p.factor,
  }));
}

/**
 * The painting for a Level: each raised surface's anchor object (top-aligned at the
 * standable line) + every authored placement (structures/props/decor, bottom-rested
 * on its surface). Anchored to the SAME resolved surfaces buildFromLevel uses, so
 * the visible art lines up with the collision. The renderer scales each to worldHeight.
 */
export function paintingFromLevel(level: Level): ArtPlacement[] {
  const resolved = resolveSurfaces(level);
  const out: ArtPlacement[] = [];
  const url = (key: string) => artUrl(level.id, key);

  for (const r of resolved) {
    const anchorArt = r.surface.anchorArt;
    if ((r.surface.kind === "raised" || r.surface.kind === "rail") && anchorArt && r.surfaceY !== undefined) {
      out.push({ url: url(anchorArt), x: r.x0, y: r.surfaceY, worldHeight: artByKey(level, anchorArt).worldHeight, z: 2, flipX: false, anchor: "top" });
    }
  }

  for (const p of level.placements) {
    const { x, y } = resolveAnchor(level, resolved, p.at);
    out.push({ url: url(p.art), x, y, worldHeight: artByKey(level, p.art).worldHeight, z: p.z, flipX: p.flipX, anchor: "base" });
  }

  // Problem-solving-layer art (hazards/switches/gates/platforms/secrets). These live in
  // their own schema arrays (not `placements`), so emit their baked art here, anchored
  // on their surface. Gates carry a `gate:<i>` key (faded open when passable) and
  // switches a `switch:<i>` key (brightened when latched on) so the renderer reflects state.
  const puzzle = (art: string, at: typeof level.spawn, key?: string) => {
    const { x, y } = resolveAnchor(level, resolved, at);
    out.push({ url: url(art), x, y, worldHeight: artByKey(level, art).worldHeight, z: 3, flipX: false, anchor: "base", ...(key ? { key } : {}) });
  };
  for (const h of level.hazards) puzzle(h.art, h.at);
  for (const [i, s] of level.switches.entries()) puzzle(s.art, s.at, `switch:${i}`);
  for (const [i, g] of level.gates.entries()) puzzle(g.art, g.at, `gate:${i}`);
  for (const m of level.movingPlatforms) puzzle(m.art, m.at);
  for (const s of level.secrets) puzzle(s.art, s.at);

  return out;
}

/** The authored vertical frame for a Level — sized like the village fix: frameTop
 *  above the highest standable surface, frameBottom just below the baseline grass,
 *  so the platform band owns the screen and the floor is a thin strip. */
export function frameFromLevel(level: Level): { top: number; bottom: number } {
  const tops = level.surfaces
    .filter((s: Surface) => s.kind !== "gap")
    .map((s: Surface) => level.baselineY - (s.top ?? 0));
  const highest = tops.length ? Math.min(...tops) : level.baselineY - 160;
  return { top: Math.min(highest - 40, level.baselineY - 160), bottom: level.baselineY + 40 };
}
