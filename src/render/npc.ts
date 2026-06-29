/**
 * NPC factory — paper-doll character composition (browser-only).
 *
 * The `classes/npcs` pack is a layered character kit: skin / clothing / hair /
 * hand sheets that all share ONE grid (10 cols × 7 rows of 80×64 frames). An NPC
 * is built by stacking the chosen layer sheets in z-order into a single composite
 * texture (via a Pixi RenderTexture), then animating a chosen row through the
 * frame-source layer. This is how the story's townsfolk/quest-givers are made:
 * a handful of part choices → a unique, animated, transparent NPC sprite.
 *
 * Sheet layout (rows = animations, 0-indexed):
 *   0 idle  1 walk  2 run  3 jump  4 cheer  5 attack  6 crouch/fall
 */
import {
  type AnimatedSprite,
  Assets,
  Container,
  Rectangle,
  type Renderer,
  RenderTexture,
  Sprite,
  Texture,
} from "pixi.js";
import { loadBakedClip } from "@render/frameSource.ts";
import { assetUrl } from "@/assetUrl.ts";

export const NPC_FRAME_W = 80;
export const NPC_FRAME_H = 64;
export const NPC_COLS = 10;

/** Animation rows in the shared NPC grid. */
export const NPC_ROW = {
  idle: 0,
  walk: 1,
  run: 2,
  jump: 3,
  cheer: 4,
  attack: 5,
  fall: 6,
} as const;
export type NpcAnim = keyof typeof NPC_ROW;

const BASE = assetUrl("assets/classes/npcs");

/**
 * Paper-doll part slots, listed in BACK→FRONT paint order. The factory always
 * composites in this order regardless of how a spec is written, so layering is
 * correct by construction: skin first, worn items over it bottom-to-top, hair
 * over the head, a held item on top. Each slot is one sheet of the shared grid.
 */
export const NPC_SLOTS = [
  "skin", // base body
  "underwear", // worn first, under everything
  "legs", // pants / skirt
  "socks", // over legs, under shoes
  "feet", // boots / shoes
  "torso", // shirt / corset
  "hair", // over the head
  "hand", // held item (sword, etc.), frontmost
] as const;
export type NpcSlot = (typeof NPC_SLOTS)[number];

/**
 * A paper-doll spec: one optional sheet path per part slot (relative to the npcs
 * pack root), except `skin` which is required. The factory paints present slots
 * in NPC_SLOTS order — callers don't have to order them.
 */
export type NpcSpec = { readonly skin: string } & {
  readonly [K in Exclude<NpcSlot, "skin">]?: string;
};

/** Frame count per animation row (trailing columns are empty for shorter clips). */
export const NPC_ANIM_FRAMES: Record<NpcAnim, number> = {
  idle: 5,
  walk: 7,
  run: 8,
  jump: 4,
  cheer: 4,
  attack: 5,
  fall: 8,
};

/** Resolve a spec to its ordered list of layer sheet URLs (back → front). */
export function npcLayerUrls(spec: NpcSpec): string[] {
  const urls: string[] = [];
  for (const slot of NPC_SLOTS) {
    const part = spec[slot];
    if (!part) continue;
    // Skin sheets live in their own folder; other slots are pack-root-relative.
    urls.push(slot === "skin" ? `${BASE}/Character skin colors/${part}` : `${BASE}/${part}`);
  }
  return urls;
}

/**
 * Composite the layer sheets into one flattened texture the size of a single
 * sheet (800×448). Uses the app renderer to bake the stack; the result is sliced
 * per-frame like any other sheet.
 *
 * OWNERSHIP: the returned RenderTexture is a GPU allocation (FrameBuffer) the
 * CALLER owns. Destroy it with `sheet.destroy(true)` when the NPC is torn down,
 * AFTER its AnimatedSprite (whose frames share `sheet.source`) is destroyed —
 * else the FrameBuffer leaks across NPC rebuilds.
 */
export async function composeNpcSheet(renderer: Renderer, spec: NpcSpec): Promise<RenderTexture> {
  const urls = npcLayerUrls(spec);
  const sheets = await Promise.all(urls.map((u) => Assets.load<Texture>(u)));
  const base = sheets[0];
  if (!base) throw new Error("composeNpcSheet: empty layer stack");

  const stack = new Container();
  for (const tex of sheets) stack.addChild(new Sprite(tex));
  const rt = RenderTexture.create({ width: base.width, height: base.height });
  renderer.render({ container: stack, target: rt });
  stack.destroy({ children: true });
  return rt;
}

/** A composed NPC sprite + the GPU sheet it owns (destroy both on teardown). */
export interface NpcSprite {
  readonly sprite: AnimatedSprite;
  destroy(): void;
}

/**
 * Build a ready-to-place idle NPC sprite from a spec: composite the paper-doll
 * layers, slice the idle row, and return an AnimatedSprite (autoUpdate off — the
 * scene's frame loop advances it). The returned object OWNS the composite sheet;
 * `destroy()` tears down the sprite then the sheet (order matters — the sprite's
 * frames share the sheet source).
 */
export async function createNpcSprite(renderer: Renderer, spec: NpcSpec): Promise<NpcSprite> {
  const { AnimatedSprite } = await import("pixi.js");
  const sheet = await composeNpcSheet(renderer, spec);
  const sprite = new AnimatedSprite(npcAnimFrames(sheet, "idle"));
  sprite.autoUpdate = false;
  sprite.anchor.set(0.5, 1);
  return {
    sprite,
    destroy() {
      sprite.destroy();
      sheet.destroy(true);
    },
  };
}

/**
 * Build an NPC sprite from the 3D→WebP bake pipeline (assets/sprites/<base>/),
 * returning the same NpcSprite shape as the paper-doll path so callers don't branch.
 * NPCs ship idle + walk clips; defaults to idle.
 */
export async function createBakedNpcSprite(base: string, clip: "idle" | "walk" = "idle"): Promise<NpcSprite> {
  const { AnimatedSprite } = await import("pixi.js");
  const { textures, manifest } = await loadBakedClip(assetUrl(base), clip);
  const sprite = new AnimatedSprite(textures);
  sprite.autoUpdate = false;
  sprite.anchor.set(manifest.anchorX, manifest.anchorY);
  return {
    sprite,
    destroy() {
      sprite.destroy();
    },
  };
}

/** Slice one animation row of a composite NPC sheet into frame textures. */
export function npcAnimFrames(sheet: Texture, anim: NpcAnim): Texture[] {
  const row = NPC_ROW[anim];
  const frames = NPC_ANIM_FRAMES[anim];
  const out: Texture[] = [];
  for (let col = 0; col < frames; col++) {
    out.push(
      new Texture({
        source: sheet.source,
        frame: new Rectangle(col * NPC_FRAME_W, row * NPC_FRAME_H, NPC_FRAME_W, NPC_FRAME_H),
      }),
    );
  }
  return out;
}
