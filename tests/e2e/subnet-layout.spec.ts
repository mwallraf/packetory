import { expect, test, type Page } from "@playwright/test";

/**
 * Phase 11 layout gate for SUBNET-08/09/10. Measurements are Chromium-only,
 * taken after the client island replaces the skeleton and `document.fonts.ready`
 * resolves. 1366x650 models a 1366x768 laptop minus browser chrome; 1280x600
 * is the stress size.
 */

const TOOL_SELECTOR = '[data-testid="subnet-tool"]';

async function gotoSettled(page: Page, query = "") {
  await page.goto(`/tools/subnet${query}`);
  await expect(page.getByTestId("subnet-tool")).toBeVisible();
  await expect(page.getByTestId("subnet-tool-skeleton")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}

async function measureLayout(page: Page) {
  return page.evaluate((toolSelector) => {
    const r = (n: number) => Math.round(n);
    const rect = (el: Element | null | undefined) =>
      el ? el.getBoundingClientRect() : null;
    const tool = document.querySelector(toolSelector);
    const header = document.querySelector("header");
    const h1 = document.querySelector("h1");
    const cidr = document.querySelector('[data-testid="subnet-cidr-input"]')
      ?.parentElement;
    const hero = document.querySelector('[data-testid="subnet-hero"]');
    const grid =
      document.querySelector('[data-testid="subnet-ipv4-grid"]') ??
      document.querySelector('[data-testid="subnet-ipv6-grid"]');
    return {
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      scrollY: r(window.scrollY),
      innerHeight: window.innerHeight,
      headerBottom: r(rect(header)?.bottom ?? -1),
      h1Top: r(rect(h1)?.top ?? -1),
      h1Bottom: r(rect(h1)?.bottom ?? -1),
      cidrTop: r(rect(cidr)?.top ?? -1),
      cidrBottom: r(rect(cidr)?.bottom ?? -1),
      heroTop: r(rect(hero)?.top ?? -1),
      heroBottom: r(rect(hero)?.bottom ?? -1),
      gridTop: r(rect(grid)?.top ?? -1),
      gridBottom: r(rect(grid)?.bottom ?? -1),
      toolBottom: r(rect(tool)?.bottom ?? -1),
      cardBottoms: grid
        ? Array.from(grid.children).map((c) => ({
            id: c.getAttribute("data-testid") ?? "",
            bottom: r(c.getBoundingClientRect().bottom),
          }))
        : [],
    };
  }, TOOL_SELECTOR);
}

test.describe("Subnet layout: full output without scrolling at laptop sizes (SUBNET-08, SUBNET-09)", () => {
  for (const [w, h] of [
    [1366, 650],
    [1280, 600],
  ] as const) {
    test(`IPv4 /24 default at ${w}x${h}: full output inside the viewport, page unscrolled (SUBNET-08)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: w, height: h });
      await gotoSettled(page);
      const m = await measureLayout(page);
      console.log(`[subnet-layout] ${JSON.stringify(m)}`);
      expect(m.scrollY).toBe(0);
      expect(m.cardBottoms).toHaveLength(9);
      expect(m.toolBottom, JSON.stringify(m)).toBeLessThanOrEqual(m.innerHeight);
      for (const card of m.cardBottoms) {
        expect(card.bottom, `${card.id} ${JSON.stringify(m)}`).toBeLessThanOrEqual(
          m.innerHeight,
        );
      }
    });
  }
});
