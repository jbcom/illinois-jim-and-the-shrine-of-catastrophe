import { expect, test, type Page } from "@playwright/test";

interface Rect {
  x: number;
  y: number;
  right: number;
  bottom: number;
}

async function assertLandingFitsViewport(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "PLAY" })).toBeVisible();

  const details = await page.evaluate(() => {
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const app = document.getElementById("app");
    const section = document.querySelector("section");
    const wordmark = section?.querySelector(`img[alt="Illinois Jim and the Shrine of Catastrophe"]`) ?? null;
    const blurb = section?.querySelector("p") ?? null;
    const play = section?.querySelector(`button[type="button"]`) ?? null;
    const padding = app ? getComputedStyle(app) : null;

    const rect = (el: Element | null): Rect | null => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
    };

    return {
      viewportWidth,
      viewportHeight,
      appPadding: padding
        ? [padding.paddingTop, padding.paddingRight, padding.paddingBottom, padding.paddingLeft]
        : null,
      section: rect(section),
      wordmark: rect(wordmark),
      blurb: rect(blurb),
      play: rect(play),
    };
  });

  expect(details.appPadding).toEqual(["0px", "0px", "0px", "0px"]);
  expect(details.section).not.toBeNull();
  expect(details.wordmark).not.toBeNull();
  expect(details.blurb).not.toBeNull();
  expect(details.play).not.toBeNull();

  const mustFit = [details.section, details.wordmark, details.blurb, details.play] as Rect[];
  for (const r of mustFit) {
    expect(r.x).toBeGreaterThanOrEqual(-1);
    expect(r.y).toBeGreaterThanOrEqual(-1);
    expect(r.right).toBeLessThanOrEqual(details.viewportWidth + 1);
    expect(r.bottom).toBeLessThanOrEqual(details.viewportHeight + 1);
  }
}

test("landing remains fully visible on configured viewport profiles", async ({ page }) => {
  await assertLandingFitsViewport(page);
});

test("landing remains fully visible after foldable orientation flip", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("foldable-unfolded-"), "foldable projects only");

  await assertLandingFitsViewport(page);

  const initial = page.viewportSize();
  expect(initial).not.toBeNull();
  if (!initial) return;
  await page.setViewportSize({ width: initial.height, height: initial.width });
  await page.waitForTimeout(150);

  await assertLandingFitsViewport(page);
});
