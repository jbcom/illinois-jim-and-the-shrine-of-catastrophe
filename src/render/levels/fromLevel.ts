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
  const url = (key: string) => `${levelArtDir(level.id)}/${key}.webp`;

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
