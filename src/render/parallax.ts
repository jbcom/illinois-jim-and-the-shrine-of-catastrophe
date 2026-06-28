/**
 * Parallax background — a depth stack of horizontally-tiled layers that scroll at
 * fractional camera speed (deeper = slower) for a sense of depth. Browser-only.
 *
 * Each layer is a full-width image (e.g. the cave background1-4 set, 960×480).
 * We use two side-by-side TilingSprites... actually a single Pixi TilingSprite
 * per layer tiles infinitely and we just move its tilePosition by camera×factor,
 * so the cave wall repeats seamlessly as the player scrolls.
 */
import { Assets, Container, type Texture, TilingSprite } from "pixi.js";

export interface ParallaxLayerSpec {
  readonly url: string;
  /** 0 = fixed (sky), 1 = moves with the world. Deeper layers → smaller. */
  readonly factor: number;
}

export interface Parallax {
  readonly container: Container;
  /** Scroll the stack to follow the camera (world px). */
  update(cameraX: number, cameraY: number): void;
  /** Fit each layer to the view size (call on resize). */
  resize(viewW: number, viewH: number): void;
  destroy(): void;
}

export async function createParallax(specs: readonly ParallaxLayerSpec[]): Promise<Parallax> {
  const container = new Container();
  const layers: { sprite: TilingSprite; factor: number; texH: number }[] = [];

  for (const spec of specs) {
    const tex = await Assets.load<Texture>(spec.url);
    const sprite = new TilingSprite({ texture: tex, width: 1, height: 1 });
    container.addChild(sprite);
    layers.push({ sprite, factor: spec.factor, texH: tex.height });
  }

  return {
    container,
    update(cameraX, cameraY) {
      for (const l of layers) {
        // Tile offset opposite the camera, scaled by the layer's depth factor.
        l.sprite.tilePosition.x = -cameraX * l.factor;
        l.sprite.tilePosition.y = -cameraY * l.factor * 0.4;
      }
    },
    resize(viewW, viewH) {
      for (const l of layers) {
        l.sprite.width = viewW;
        l.sprite.height = viewH;
        // Scale the texture vertically to cover the view height.
        l.sprite.tileScale.set(viewH / l.texH);
      }
    },
    destroy() {
      container.destroy({ children: true });
    },
  };
}

/** The cave biome's background depth stack (deepest → nearest). */
export const CAVE_PARALLAX: readonly ParallaxLayerSpec[] = [
  { url: "/assets/biomes/caves/background1.png", factor: 0.1 },
  { url: "/assets/biomes/caves/background2.png", factor: 0.25 },
  { url: "/assets/biomes/caves/background3.png", factor: 0.45 },
  { url: "/assets/biomes/caves/background4a.png", factor: 0.7 },
];
