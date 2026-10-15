import { expect, test } from "@playwright/test";

test.describe("Hash Generator FAQ content (INTG-02)", () => {
  test("FAQ is present and the FAQPage JSON-LD matches it exactly", async ({
    page,
  }) => {
    await page.goto("/tools/hash");

    const faqItems = page.getByTestId("hash-faq-item");
    await expect(faqItems).toHaveCount(5);

    const jsonLdScript = page.locator('script[type="application/ld+json"]');
    await expect(jsonLdScript).toHaveCount(1);

    const jsonLdText = await jsonLdScript.textContent();
    expect(jsonLdText).toBeTruthy();
    const parsed = JSON.parse(jsonLdText!);

    expect(parsed["@type"]).toBe("FAQPage");
    expect(Array.isArray(parsed.mainEntity)).toBe(true);
    expect(parsed.mainEntity).toHaveLength(5);

    for (let i = 0; i < 5; i++) {
      const paragraphs = faqItems.nth(i).locator("p");
      const question = (await paragraphs.nth(0).textContent())?.trim();
      const answer = (await paragraphs.nth(1).textContent())?.trim();
      expect(parsed.mainEntity[i].name).toBe(question);
      expect(parsed.mainEntity[i].acceptedAnswer.text).toBe(answer);
    }
  });
});

test.describe("Hash Generator SEO metadata (INTG-02)", () => {
  test("metadata is unique and complete", async ({ page }) => {
    await page.goto("/tools/hash");

    const title = await page.title();
    expect(title).toContain("Hash Generator");
    expect(title).toContain("SHA-256");

    const canonicalLinks = page.locator('head link[rel="canonical"]');
    await expect(canonicalLinks).toHaveCount(1);
    await expect(canonicalLinks).toHaveAttribute("href", /\/tools\/hash$/);

    const descriptionMeta = page.locator('head meta[name="description"]');
    await expect(descriptionMeta).toHaveCount(1);
    const description = await descriptionMeta.getAttribute("content");
    expect(description).toBeTruthy();
    expect(description).toContain("SHA-256");
    expect(description!.toLowerCase()).not.toContain("tracking");

    await expect(page.locator('head meta[property="og:title"]')).toHaveCount(1);
    await expect(
      page.locator('head meta[property="og:description"]')
    ).toHaveCount(1);
    await expect(page.locator('head meta[property="og:url"]')).toHaveCount(1);
  });

  test("canonical has no query string when opened with ?text=", async ({
    page,
  }) => {
    await page.goto("/tools/hash?text=secret");

    const canonicalLinks = page.locator('head link[rel="canonical"]');
    await expect(canonicalLinks).toHaveCount(1);
    await expect(canonicalLinks).toHaveAttribute("href", /\/tools\/hash$/);
    const href = await canonicalLinks.getAttribute("href");
    expect(href).not.toContain("text=");
    expect(href).not.toContain("?");
  });
});

test.describe("Hash Generator worked example (INTG-02)", () => {
  const SHA256_HELLO =
    "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9";
  const SHA256_ECHO =
    "a948904f2f0f479b8f8197694b30184b0d2ed1c1cd2a1ec0fb85d299a192a447";

  test("worked example shows the pinned digests and the echo difference", async ({
    page,
  }) => {
    await page.goto("/tools/hash");

    await expect(page.getByTestId("hash-worked-example-sha256")).toHaveText(
      SHA256_HELLO
    );

    const printf = page.getByTestId("hash-worked-example-printf");
    await expect(printf).toContainText(SHA256_HELLO);
    await expect(printf).toContainText("(matches this tool)");

    const echo = page.getByTestId("hash-worked-example-echo");
    await expect(echo).toContainText(SHA256_ECHO);
    await expect(echo).toContainText("(differs: echo appends a newline)");
  });

  test("worked example has no forbidden privacy wording (D-27)", async ({
    page,
  }) => {
    await page.goto("/tools/hash");

    const text = (
      (await page.getByTestId("hash-worked-example").textContent()) ?? ""
    ).toLowerCase();
    expect(text.length).toBeGreaterThan(0);
    for (const phrase of [
      "tracking",
      "never leaves",
      "never stored",
      "never sent",
      "private",
      "100%",
    ]) {
      expect(text).not.toContain(phrase);
    }
  });

  test("worked example does not overflow at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/tools/hash");

    const example = page.getByTestId("hash-worked-example");
    await expect(example).toBeVisible();
    const overflow = await example.evaluate(
      (el) => el.scrollWidth - el.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
