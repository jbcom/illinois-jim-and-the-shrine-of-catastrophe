/**
 * HP / lives bar — the pixel-art status gauge (ux/hp_bar pack). Browser-only.
 *
 * Composites the frame (`Hp bar.png`: portrait orb + segmented meter) with a
 * colored fill bar clipped to the current HP fraction, plus a small lives count.
 * Exposed as a self-contained Pixi container with `setHp(fraction)` /
 * `setLives(n)` so it can sit as a HUD overlay over the game canvas.
 *
 * The fill is masked (not scaled) so the meter empties from the right edge
 * without distorting the bar's pixels.
 */
import { Assets, Container, Graphics, Sprite, type Texture, TilingSprite } from "pixi.js";
import { assetUrl } from "@/assetUrl.ts";

const BASE = assetUrl("assets/ux/hp_bar");

/**
 * Meter rectangle inside the 116×64 frame where the fill bar sits (px). Measured
 * from the frame art: the segmented pill spans x≈72–114, y≈52–58.
 */
const METER = { x: 73, y: 52, w: 40, h: 6 } as const;

/** Ring center where the portrait orb sits (measured from the frame art). */
const RING = { cx: 27, cy: 28 } as const;

export interface HpBar {
  readonly container: Container;
  /** Set HP as a 0..1 fraction; the fill clips from the right. */
  setHp(fraction: number): void;
  /** Set the lives count shown beside the bar. */
  setLives(n: number): void;
  destroy(): void;
}

/** Build the HP/lives bar. `fillColor` picks the meter fill sheet. */
export async function createHpBar(fillColor: "Blue" | "yellow" = "Blue"): Promise<HpBar> {
  const [frameTex, fillTex, orbTex] = await Promise.all([
    Assets.load<Texture>(`${BASE}/Hp bar.png`),
    Assets.load<Texture>(`${BASE}/${fillColor} bar.png`),
    Assets.load<Texture>(`${BASE}/red bar.png`),
  ]);

  const container = new Container();

  // Portrait orb sits IN the ring, behind the frame so the ring border overlaps.
  const orb = new Sprite(orbTex);
  orb.anchor.set(0.5);
  orb.position.set(RING.cx, RING.cy);
  const frame = new Sprite(frameTex);

  // Fill: a tiling sprite covering the meter, revealed by a clip mask whose width
  // tracks HP. Tiling keeps the bar's pixel pattern crisp at any width.
  const fill = new TilingSprite({ texture: fillTex, width: METER.w, height: METER.h });
  fill.position.set(METER.x, METER.y);
  const clip = new Graphics();
  fill.mask = clip;

  // Lives pips (small gold squares) below the meter.
  const lives = new Container();
  lives.position.set(METER.x, METER.y + METER.h + 3);

  container.addChild(orb, frame, fill, clip, lives);

  const drawClip = (fraction: number) => {
    const f = Math.max(0, Math.min(1, fraction));
    clip.clear();
    clip.rect(METER.x, METER.y, METER.w * f, METER.h).fill(0xffffff);
  };
  const drawLives = (n: number) => {
    for (const c of lives.removeChildren()) c.destroy();
    for (let i = 0; i < Math.max(0, n); i++) {
      const pip = new Graphics();
      pip.rect(i * 6, 0, 4, 4).fill(0xf2c14e);
      lives.addChild(pip);
    }
  };

  drawClip(1);
  drawLives(3);

  return {
    container,
    setHp: drawClip,
    setLives: drawLives,
    destroy() {
      container.destroy({ children: true });
    },
  };
}
