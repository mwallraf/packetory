import { expect, test } from "@playwright/test";

test.describe("DNS Lookup SEO metadata (DNS-07, DNS-09)", () => {
  test("metadata is unique and complete", async ({ page }) => {
    await page.goto("/tools/dns");

    const title = await page.title();
    expect(title).toContain("DNS Lookup");

    const canonicalLinks = page.locator('head link[rel="canonical"]');
    await expect(canonicalLinks).toHaveCount(1);
    await expect(canonicalLinks).toHaveAttribute("href", /\/tools\/dns$/);

    const descriptionMeta = page.locator('head meta[name="description"]');
    await expect(descriptionMeta).toHaveCount(1);
    const descriptionContent = await descriptionMeta.getAttribute("content");
    expect(descriptionContent).toBeTruthy();
    expect(descriptionContent).toContain("DNS-over-HTTPS");

    await expect(
      page.locator('head meta[property="og:title"]')
    ).toHaveCount(1);
    await expect(page.locator('head meta[property="og:description"]')).toHaveCount(
      1
    );
    await expect(page.locator('head meta[property="og:url"]')).toHaveCount(1);
  });
});

test.describe("DNS Lookup FAQ content and resolver disclosure (DNS-09, D-02)", () => {
  test("faq content discloses Cloudflare/Google resolvers and JSON-LD matches", async ({
    page,
  }) => {
    await page.goto("/tools/dns");

    const faqItems = page.getByTestId("dns-faq-item");
    const visibleCount = await faqItems.count();
    expect(visibleCount).toBeGreaterThanOrEqual(3);

    await expect(
      page.getByText("Where do my DNS lookups go?")
    ).toBeVisible();

    const disclosureItem = faqItems.filter({
      hasText: "Where do my DNS lookups go?",
    });
    await expect(disclosureItem).toContainText("Cloudflare");
    await expect(disclosureItem).toContainText("Google");
    await expect(disclosureItem).toContainText("never stored or sent anywhere else");

    await expect(
      page.getByText("Why does this tool use two different DNS resolvers?")
    ).toBeVisible();

    const jsonLdScript = page.locator('script[type="application/ld+json"]');
    await expect(jsonLdScript).toHaveCount(1);

    const jsonLdText = await jsonLdScript.textContent();
    expect(jsonLdText).toBeTruthy();
    const parsed = JSON.parse(jsonLdText!);

    expect(parsed["@type"]).toBe("FAQPage");
    expect(Array.isArray(parsed.mainEntity)).toBe(true);
    expect(parsed.mainEntity.length).toBe(visibleCount);

    const jsonLdQuestions = parsed.mainEntity
      .map((item: { name: string }) => item.name)
      .sort();
    const onPageQuestions = (
      await faqItems.evaluateAll((nodes) =>
        nodes.map((node) => node.querySelector("p")?.textContent ?? "")
      )
    ).sort();
    expect(jsonLdQuestions).toEqual(onPageQuestions);
  });
});

test.describe("DNS Lookup worked example (DNS-07)", () => {
  test("worked example shows a real cloudflare.com A-record lookup", async ({
    page,
  }) => {
    await page.goto("/tools/dns");

    const workedExample = page.getByTestId("dns-worked-example");
    await expect(workedExample).toBeVisible();

    await expect(
      workedExample.getByText("cloudflare.com").first()
    ).toBeVisible();
    await expect(workedExample.getByText("104.16.133.229")).toBeVisible();
    await expect(workedExample.getByText("Primary resolver")).toBeVisible();
  });
});
