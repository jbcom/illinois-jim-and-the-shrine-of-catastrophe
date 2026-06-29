/**
 * Painting FROM a LevelSpec — derives the render `Placement[]` from the SAME
 * surface segments the collision is built from (src/sim/world/levelSpec.ts), so a
 * prop authored "on segment 3" sits exactly on the collision surface there. No
 * absolute world coords, no parallel hand-authoring: props anchor RELATIVE to the
 * ground, the same way spawns do.
 *
 * A `PropPlacement` names a stamp + a surface anchor + how it sits (its base on
 * the surface by default, or hanging from the ceiling). The builder resolves each
 * to a `Placement` (top-left x/y in world px) the existing compositor consumes.
 */
import type { Placement, ShapeStamp } from "@render/composition.ts";
import { type Anchor, type LevelSpec, resolveAnchor, resolveSegments } from "@sim/world/levelSpec.ts";

/** How a prop attaches vertically to its anchor point. */
export type PropAlign =
  | "base" // the stamp's BOTTOM edge sits on the surface (default — props, pillars)
  | "ceiling"; // the stamp hangs from the top of the frame (stalactites), flipY

export interface PropPlacement {
  readonly stamp: ShapeStamp;
  /** Which surface segment + where along it (the prop's base x is the anchor x). */
  readonly at: Anchor;
  readonly scale?: number;
  readonly z?: number;
  readonly flipX?: boolean;
  /** Default `base`. `ceiling` hangs it (flipY) from `ceilingTop`. */
  readonly align?: PropAlign;
  /**
   * For `ceiling` props: the world-Y the stamp hangs from (its top edge). Use the
   * level frame top region. Ignored for `base`.
   */
  readonly ceilingTop?: number;
  /** Horizontal nudge in px (to center a wide prop over its anchor, etc). */
  readonly dx?: number;
}

/**
 * Resolve prop placements against a spec into render `Placement[]`. A `base` prop
 * is anchored so its BOTTOM sits on the segment surface at the anchor (its top-left
 * y = surfaceY - h*scale); a `ceiling` prop hangs from `ceilingTop` with flipY.
 */
export function paintingFromSpec(spec: LevelSpec, props: readonly PropPlacement[]): Placement[] {
  const resolved = resolveSegments(spec);
  return props.map((p): Placement => {
    const scale = p.scale ?? 1;
    const { x, y } = resolveAnchor(spec, resolved, p.at);
    const left = x + (p.dx ?? 0);
    if (p.align === "ceiling") {
      const top = p.ceilingTop ?? spec.baselineY - spec.rows * spec.tileSize;
      return { stamp: p.stamp, x: left, y: top, scale, z: p.z ?? 0, flipX: p.flipX ?? false, flipY: true };
    }
    // `base`: bottom edge of the stamp rests on the surface at (x,y).
    return { stamp: p.stamp, x: left, y: y - p.stamp.h * scale, scale, z: p.z ?? 0, flipX: p.flipX ?? false };
  });
}
