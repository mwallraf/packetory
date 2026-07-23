import { expect, test } from "@playwright/test";

test.describe("UUID Generator (UUID-01, UUID-06)", () => {
  test("loads a v4 UUID immediately", async ({ page }) => {
    await page.goto("/tools/uuid");

    const heroValue = page.getByTestId("uuid-hero-value");
    await expect(heroValue).toBeVisible();
    await expect(heroValue).toHaveText(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  test("copies the hero value with a visible + announced confirmation", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/tools/uuid");

    const copyButton = page.getByTestId("uuid-copy");
    await copyButton.click();

    await expect(page.getByTestId("uuid-copy-status")).toHaveText("Copied!");

    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText()
    );
    expect(clipboardText.length).toBeGreaterThan(0);
  });
});
