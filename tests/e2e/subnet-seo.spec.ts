import { expect, test } from "@playwright/test";

test.describe("Subnet Calculator SEO metadata (SUBNET-04, SUBNET-05)", () => {
  test("metadata is unique and complete", async ({ page }) => {
    await page.goto("/tools/subnet");

    const title = await page.title();
    expect(title).toContain("IPv4");
    expect(title).toContain("IPv6");

    const canonicalLinks = page.locator('head link[rel="canonical"]');
    await expect(canonicalLinks).toHaveCount(1);
    await expect(canonicalLinks).toHaveAttribute("href", /\/tools\/subnet$/);

    const descriptionMeta = page.locator('head meta[name="description"]');
    await expect(descriptionMeta).toHaveCount(1);
    const descriptionContent = await descriptionMeta.getAttribute("content");
    expect(descriptionContent).toBeTruthy();
    expect(descriptionContent).toContain("CIDR");

    await expect(
      page.locator('head meta[property="og:title"]')
    ).toHaveCount(1);
    await expect(page.locator('head meta[property="og:url"]')).toHaveCount(
      1
    );
  });
});

test.describe("Subnet Calculator FAQ content (SUBNET-04, SUBNET-05)", () => {
  test("faq content is present and JSON-LD matches", async ({ page }) => {
    await page.goto("/tools/subnet");

    const faqItems = page.getByTestId("subnet-faq-item");
    const visibleCount = await faqItems.count();
    expect(visibleCount).toBeGreaterThanOrEqual(3);

    await expect(
      page.getByText("Why do /31 and /127 show both addresses as usable?")
    ).toBeVisible();
    await expect(
      page.getByText(
        "Can I share a specific subnet result with a teammate?"
      )
    ).toBeVisible();

    const jsonLdScript = page.locator('script[type="application/ld+json"]');
    await expect(jsonLdScript).toHaveCount(1);

    const jsonLdText = await jsonLdScript.textContent();
    expect(jsonLdText).toBeTruthy();
    const parsed = JSON.parse(jsonLdText!);

    expect(parsed["@type"]).toBe("FAQPage");
    expect(Array.isArray(parsed.mainEntity)).toBe(true);
    expect(parsed.mainEntity.length).toBe(visibleCount);
  });
});

test.describe("Subnet Calculator worked example (SUBNET-04, SUBNET-05)", () => {
  test("worked example shows a real IPv4 and IPv6 CIDR with computed fields", async ({
    page,
  }) => {
    await page.goto("/tools/subnet");

    const workedExample = page.getByTestId("subnet-worked-example");
    await expect(workedExample).toBeVisible();

    await expect(
      workedExample.getByText("192.168.1.0/24").first()
    ).toBeVisible();
    await expect(workedExample.getByText("192.168.1.255")).toBeVisible();

    await expect(
      workedExample.getByText("2001:db8::/32").first()
    ).toBeVisible();
    await expect(
      workedExample.getByText("2001:db8:ffff:ffff:ffff:ffff:ffff:ffff")
    ).toBeVisible();
  });
});
