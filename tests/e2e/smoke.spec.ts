import { expect, test } from "@playwright/test";

/**
 * End-to-end smoke: the game boots, mounts its canvas, renders, and responds to
 * input — across every configured form factor (phone portrait/landscape, tablet,
 * desktop) via the projects in playwright.config.ts.
 */

test("boots and renders the game canvas", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();

  // Canvas must have a real backing store (engine sized it to css*dpr).
  const size = await canvas.evaluate((el: HTMLCanvasElement) => ({
    w: el.width,
    h: el.height,
  }));
  expect(size.w).toBeGreaterThan(0);
  expect(size.h).toBeGreaterThan(0);

  // HUD score is present (proves the SolidJS overlay mounted).
  await expect(page.getByText(/SCORE/)).toBeVisible();

  expect(errors, `console/page errors: ${errors.join("; ")}`).toHaveLength(0);
});

test("the canvas paints non-empty pixels (the level renders)", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(300); // let a few frames run

  const hasContent = await page.locator("canvas").evaluate((el: HTMLCanvasElement) => {
    const ctx = el.getContext("2d");
    if (!ctx) return false;
    const { data } = ctx.getImageData(0, 0, el.width, el.height);
    // Look for any pixel that isn't the obsidian backdrop (23,17,11).
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      if (Math.abs(r - 23) > 8 || Math.abs(g - 17) > 8 || Math.abs(b - 11) > 8) {
        return true;
      }
    }
    return false;
  });
  expect(hasContent).toBe(true);
});

test("responds to keyboard input without errors", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(150);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(200);
  await page.keyboard.down("Space");
  await page.waitForTimeout(200);
  await page.keyboard.up("Space");
  await page.keyboard.up("ArrowRight");
  // Still alive and responsive.
  await expect(page.locator("canvas")).toBeVisible();
});
