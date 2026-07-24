import { expect, test } from "@playwright/test";

test.describe("UUID Generator SEO metadata (QUAL-01)", () => {
  test("metadata is unique and complete", async ({ page }) => {
    await page.goto("/tools/uuid");

    const title = await page.title();
    expect(title).toContain("v4");
    expect(title).toContain("v7");

    const canonicalLinks = page.locator('head link[rel="canonical"]');
    await expect(canonicalLinks).toHaveCount(1);
    await expect(canonicalLinks).toHaveAttribute(
      "href",
      /\/tools\/uuid$/
    );

    const descriptionMeta = page.locator('head meta[name="description"]');
    await expect(descriptionMeta).toHaveCount(1);
    const descriptionContent = await descriptionMeta.getAttribute("content");
    expect(descriptionContent).toBeTruthy();
    expect(descriptionContent).toContain("v4");
    expect(descriptionContent).toContain("v7");

    await expect(
      page.locator('head meta[property="og:title"]')
    ).toHaveCount(1);
    await expect(page.locator('head meta[property="og:url"]')).toHaveCount(
      1
    );
  });
});

test.describe("UUID Generator FAQ content (QUAL-02)", () => {
  test("faq content is present and JSON-LD matches", async ({ page }) => {
    await page.goto("/tools/uuid");

    const faqItems = page.getByTestId("uuid-faq-item");
    const visibleCount = await faqItems.count();
    expect(visibleCount).toBeGreaterThanOrEqual(3);
    expect(visibleCount).toBeLessThanOrEqual(4);

    await expect(
      page.getByText("What's the difference between UUID v4 and v7?")
    ).toBeVisible();
    await expect(
      page.getByText("Are UUIDs guaranteed unique?")
    ).toBeVisible();
    await expect(
      page.getByText("Can I use a UUID as a database primary key?")
    ).toBeVisible();

    const jsonLdScript = page.locator(
      'script[type="application/ld+json"]'
    );
    await expect(jsonLdScript).toHaveCount(1);

    const jsonLdText = await jsonLdScript.textContent();
    expect(jsonLdText).toBeTruthy();
    const parsed = JSON.parse(jsonLdText!);

    expect(parsed["@type"]).toBe("FAQPage");
    expect(Array.isArray(parsed.mainEntity)).toBe(true);
    expect(parsed.mainEntity.length).toBe(visibleCount);
  });
});

test.describe("UUID Generator worked example (QUAL-02)", () => {
  test("worked example shows a real v4 and v7", async ({ page }) => {
    await page.goto("/tools/uuid");

    const v4Sample = page.getByTestId("uuid-worked-example-v4");
    await expect(v4Sample).toBeVisible();
    await expect(v4Sample).toHaveText(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    const v7Sample = page.getByTestId("uuid-worked-example-v7");
    await expect(v7Sample).toBeVisible();
    await expect(v7Sample).toHaveText(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
});
