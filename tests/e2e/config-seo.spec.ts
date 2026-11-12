import { expect, test } from "@playwright/test";
import { openAbout } from "./helpers/about";

test.describe("Config Highlighter SEO metadata (CFG-02)", () => {
  test("metadata is unique and complete", async ({ page }) => {
    await page.goto("/tools/config");

    expect(await page.title()).toContain("Config Syntax Highlighter");

    const canonicalLinks = page.locator('head link[rel="canonical"]');
    await expect(canonicalLinks).toHaveCount(1);
    await expect(canonicalLinks).toHaveAttribute("href", /\/tools\/config$/);

    const descriptionMeta = page.locator('head meta[name="description"]');
    await expect(descriptionMeta).toHaveCount(1);
    expect(await descriptionMeta.getAttribute("content")).toBeTruthy();

    await expect(page.locator('head meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('head meta[property="og:url"]')).toHaveCount(1);
  });
});

test.describe("Config Highlighter FAQ content (CFG-02)", () => {
  test("faq is closed on load, has 4-6 items and the JSON-LD matches it item for item", async ({
    page,
  }) => {
    await page.goto("/tools/config");
    await expect(page.locator("details[open]")).toHaveCount(0);

    const items = page.getByTestId("config-faq-item");
    const n = await items.count();
    expect(n).toBeGreaterThanOrEqual(4);
    expect(n).toBeLessThanOrEqual(6);

    const jsonLdScript = page.locator('script[type="application/ld+json"]');
    await expect(jsonLdScript).toHaveCount(1);
    const jsonLdText = await jsonLdScript.textContent();
    expect(jsonLdText).toBeTruthy();
    const parsed = JSON.parse(jsonLdText!);

    expect(parsed["@type"]).toBe("FAQPage");
    expect(parsed.mainEntity.length).toBe(n);

    for (let i = 0; i < n; i++) {
      const question = (
        await items.nth(i).locator("p").nth(0).textContent()
      )?.trim();
      const answer = (
        await items.nth(i).locator("p").nth(1).textContent()
      )?.trim();
      expect(parsed.mainEntity[i].name).toBe(question);
      expect(parsed.mainEntity[i].acceptedAnswer.text).toBe(answer);
    }

    await openAbout(page, "config", ["faq"]);
    await expect(
      page.getByText("Is my configuration uploaded anywhere?")
    ).toBeVisible();
  });
});

test.describe("Config Highlighter worked example (CFG-01)", () => {
  test("worked example shows the highlighted RFC 5737 sample", async ({
    page,
  }) => {
    await page.goto("/tools/config");
    await openAbout(page, "config", ["worked-example"]);

    const preview = page.getByTestId("config-worked-example-preview");
    await expect(preview).toBeVisible();
    await expect(preview).toContainText("hostname edge-rtr-01");
    await expect(preview).toContainText("192.0.2.1");

    for (const kind of [
      "comment",
      "command",
      "keyword",
      "interface",
      "address",
      "number",
      "string",
    ]) {
      await expect(
        preview.locator(`[data-token="${kind}"]`).first()
      ).toBeVisible();
    }

    await expect(page.getByTestId("config-preview")).toHaveText(
      "Your highlighted preview will appear here."
    );
  });

  // The overflow checks are scoped to the About section rather than
  // documentElement because Config's tool island at 320px has no prior
  // page-level assertion and no Phase 10 plan owns it; main is `w-full`
  // inside the flex-column body, so the section's width and right edge
  // isolate the pane's contribution.
  test("example pane scrolls inside itself at 320px without widening the About area", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/tools/config");
    await openAbout(page, "config");

    const pane = page.getByTestId("config-worked-example-preview");
    const paneOverflows = await pane.evaluate(
      (el) => el.scrollWidth > el.clientWidth
    );
    expect(paneOverflows).toBe(true);

    const details = page.getByTestId("config-worked-example");
    const detailsFits = await details.evaluate(
      (el) => el.scrollWidth <= el.clientWidth + 1
    );
    expect(detailsFits).toBe(true);

    const section = page.getByTestId("about-tool");
    const sectionMetrics = await section.evaluate((el) => ({
      fits: el.scrollWidth <= el.clientWidth + 1,
      right: el.getBoundingClientRect().right,
      viewport: document.documentElement.clientWidth,
    }));
    expect(sectionMetrics.fits).toBe(true);
    expect(sectionMetrics.right).toBeLessThanOrEqual(sectionMetrics.viewport + 1);

    const whiteSpace = await pane
      .locator("pre")
      .evaluate((el) => getComputedStyle(el).whiteSpace);
    expect(whiteSpace).toBe("pre");

    await pane.focus();
    await expect(pane).toBeFocused();
  });
});
