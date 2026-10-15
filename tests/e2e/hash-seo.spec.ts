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
