import { expect, type APIRequestContext, type Page } from "@playwright/test";

/**
 * The one copy of the JavaScript-disabled About assertions (INFO-01, INFO-02,
 * INFO-03). Shared by tests/e2e/about.spec.ts (next dev) and the production
 * build spec so the two runs cannot drift.
 *
 * The caller's context must use `javaScriptEnabled: false`. Page scripts do
 * not run, so this helper uses only locators, the `request` fixture and plain
 * string checks on the fetched HTML, with no in-page script evaluation.
 */
export async function expectServerAboutParity(
  page: Page,
  request: APIRequestContext,
  slug: string
): Promise<void> {
  // Raw server HTML: count the literal tag opening, not the bare type string,
  // because the RSC flight payload also carries the JSON-LD props as a string.
  const res = await request.get(`/tools/${slug}`);
  expect(res.ok()).toBe(true);
  const html = await res.text();
  expect(html.match(/<script type="application\/ld\+json"/g) ?? []).toHaveLength(
    1
  );
  expect(html).not.toMatch(/<details\b[^>]*\sopen\b/);
  const exampleAt = html.indexOf(`data-testid="${slug}-worked-example"`);
  const faqAt = html.indexOf(`data-testid="${slug}-faq"`);
  expect(exampleAt).toBeGreaterThanOrEqual(0);
  expect(exampleAt).toBeLessThan(faqAt);

  await page.goto(`/tools/${slug}`);

  await expect(page.getByTestId("about-tool")).toHaveCount(1);
  await expect(page.locator("#about-heading")).toHaveCount(1);
  await expect(page.getByTestId(`${slug}-worked-example`)).toHaveCount(1);
  await expect(page.getByTestId(`${slug}-faq`)).toHaveCount(1);
  await expect(
    page.locator('main > [data-testid="about-tool"]:last-child')
  ).toHaveCount(1);
  await expect(
    page.locator(
      `[data-testid="${slug}-worked-example"] ~ [data-testid="${slug}-faq"]`
    )
  ).toHaveCount(1);
  await expect(page.locator("details[open]")).toHaveCount(0);

  const jsonLdScript = page.locator('script[type="application/ld+json"]');
  await expect(jsonLdScript).toHaveCount(1);
  const jsonLdText = await jsonLdScript.textContent();
  expect(jsonLdText).toBeTruthy();
  const parsed = JSON.parse(jsonLdText!);
  expect(parsed["@type"]).toBe("FAQPage");

  const faqItems = page.getByTestId(`${slug}-faq-item`);
  const n = await faqItems.count();
  expect(n).toBeGreaterThanOrEqual(4);
  expect(parsed.mainEntity).toHaveLength(n);
  for (let i = 0; i < n; i++) {
    const paragraphs = faqItems.nth(i).locator("p");
    const question = (await paragraphs.nth(0).textContent())?.trim();
    const answer = (await paragraphs.nth(1).textContent())?.trim();
    expect(parsed.mainEntity[i].name).toBe(question);
    expect(parsed.mainEntity[i].acceptedAnswer.text).toBe(answer);
  }

  const example = page.getByTestId(`${slug}-worked-example`);
  const exampleText = (await example.textContent())?.trim() ?? "";
  expect(exampleText.length).toBeGreaterThan(20);

  // A native toggle needs no JavaScript.
  const faq = page.getByTestId(`${slug}-faq`);
  await faq.locator("summary").click();
  await expect(faq).toHaveAttribute("open", "");
}
