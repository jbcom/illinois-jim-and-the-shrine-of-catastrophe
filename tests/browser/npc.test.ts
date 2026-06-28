import {
  composeNpcSheet,
  NPC_ANIM_FRAMES,
  NPC_FRAME_H,
  NPC_FRAME_W,
  npcAnimFrames,
  npcLayerUrls,
  type NpcSpec,
} from "@render/npc.ts";
import { page } from "vitest/browser";
import { AnimatedSprite, Application } from "pixi.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/** Three distinct townsfolk built from different part choices (named slots). */
const TOWNSFOLK: NpcSpec[] = [
  {
    skin: "Male Skin1.png",
    legs: "Male Clothing/Green Pants.png",
    torso: "Male Clothing/Shirt.png",
    feet: "Male Clothing/Boots.png",
    hair: "Male Hair/Male Hair1.png",
    hand: "Male Hand/Male Sword.png",
  },
  {
    skin: "Female Skin3.png",
    legs: "Female Clothing/Skirt.png",
    torso: "Female Clothing/Green Corset.png",
    feet: "Female Clothing/Boots.png",
    hair: "Female Hair/Female Hair2.png",
  },
  {
    skin: "Male Skin4.png",
    legs: "Male Clothing/Purple Pants.png",
    torso: "Male Clothing/Blue Shirt v2.png",
    feet: "Male Clothing/Shoes.png",
    hair: "Male Hair/Male Hair3.png",
  },
];

describe("NPC factory (paper-doll composite)", () => {
  it("orders layer urls back (skin) → front (hand)", () => {
    const urls = npcLayerUrls(TOWNSFOLK[0]!);
    expect(urls[0]).toContain("Character skin colors/Male Skin1.png");
    expect(urls.at(-1)).toContain("Male Sword.png");
    expect(urls.length).toBe(6); // skin + 3 clothing + hair + hand
  });

  let app: Application | undefined;
  let canvas: HTMLCanvasElement | undefined;
  beforeEach(() => {
    canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 120;
    document.body.appendChild(canvas);
  });
  afterEach(() => {
    app?.destroy({ removeView: false }, { children: true });
    app = undefined;
    canvas?.remove();
  });

  it("builds the paper-doll up layer by layer (visual + diagnostic proof)", async () => {
    app = new Application();
    await app.init({ canvas: canvas!, width: 480, height: 120, background: "#17110b" });

    // Cumulative specs: skin → +legs → +torso → +feet → +hair → +hand. Built by
    // dropping one trailing slot at a time so types stay exact (no undefined).
    const full = TOWNSFOLK[0]!;
    const stages: NpcSpec[] = [
      { skin: full.skin },
      { skin: full.skin, legs: full.legs },
      { skin: full.skin, legs: full.legs, torso: full.torso },
      { skin: full.skin, legs: full.legs, torso: full.torso, feet: full.feet },
      { skin: full.skin, legs: full.legs, torso: full.torso, feet: full.feet, hair: full.hair },
      full,
    ].map((s) => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined)) as NpcSpec);

    let x = 36;
    let prevOpaque = -1;
    for (const spec of stages) {
      const sheet = await composeNpcSheet(app.renderer, spec);
      const frames = await npcAnimFrames(sheet, "idle");
      // Diagnostic: each added layer should add opaque coverage to the idle pose.
      const px = app.renderer.extract.pixels(frames[0]!);
      let opaque = 0;
      for (let i = 3; i < px.pixels.length; i += 4) if (px.pixels[i]! > 16) opaque++;
      // eslint-disable-next-line no-console
      console.log(`[npc] layers=${npcLayerUrls(spec).length} idle-opaque-px=${opaque}`);
      expect(opaque).toBeGreaterThanOrEqual(prevOpaque); // monotonic: layers add, never remove
      prevOpaque = opaque;

      const sprite = new AnimatedSprite(frames);
      sprite.autoUpdate = false;
      sprite.anchor.set(0.5, 1);
      sprite.scale.set(1.2);
      sprite.x = x;
      sprite.y = 116;
      app.stage.addChild(sprite);
      x += 76;
    }
    app.render();

    await page.screenshot({ path: "npc-layer-buildup.png" });
    expect(app.stage.children.length).toBe(stages.length);
  });

  it("composites distinct NPCs and slices their idle row (visual proof)", async () => {
    app = new Application();
    await app.init({ canvas: canvas!, width: 480, height: 120, background: "#17110b" });

    let x = 60;
    for (const spec of TOWNSFOLK) {
      const sheet = await composeNpcSheet(app.renderer, spec);
      const frames = await npcAnimFrames(sheet, "idle");
      expect(frames.length).toBe(NPC_ANIM_FRAMES.idle);
      expect(frames[0]?.frame.width).toBe(NPC_FRAME_W);
      expect(frames[0]?.frame.height).toBe(NPC_FRAME_H);

      const sprite = new AnimatedSprite(frames);
      sprite.autoUpdate = false;
      sprite.currentFrame = 0;
      sprite.anchor.set(0.5, 1);
      sprite.scale.set(1.4);
      sprite.x = x;
      sprite.y = 116;
      app.stage.addChild(sprite);
      x += 150;
    }
    app.render();

    await page.screenshot({ path: "npc-townsfolk.png" });
    expect(app.stage.children.length).toBe(3);
  });
});
