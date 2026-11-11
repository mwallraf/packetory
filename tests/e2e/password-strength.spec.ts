import { expect, test } from "@playwright/test";
import { GUESS_RATE_LABELS } from "../../lib/password";

/**
 * Strength panel (STR-01..04): the figures come from the settings alone, so
 * Regenerate never changes them, and the attack scenario is display-only.
 */

test.describe("Strength panel (STR-01..04)", () => {
  test("default password figures and stability across five Regenerates", async ({
    page,
  }) => {
    await page.goto("/tools/password");
    const strength = page.getByTestId("password-strength");
    await expect(strength).toBeVisible();
    await expect(page.getByTestId("password-strength-label")).toHaveText(
      "Very strong · 128 bits",
    );
    await expect(page.getByTestId("password-strength-pool")).toHaveText(
      "85 chars · 128 bits",
    );
    await expect(page.getByTestId("password-crack-time")).toHaveText(
      "More than a trillion years to crack, on average",
    );
    await expect(page.getByTestId("password-crack-assumption")).toHaveText(
      GUESS_RATE_LABELS.fast,
    );

    const before = await strength.innerText();
    const hero = await page.getByTestId("password-output").textContent();
    for (let i = 0; i < 5; i++) {
      await page.getByTestId("password-regenerate").click();
    }
    await expect(page.getByTestId("password-output")).not.toHaveText(hero ?? "");
    expect(await strength.innerText()).toBe(before);
  });

  test("passphrase figures, stable across Regenerate", async ({ page }) => {
    await page.goto("/tools/password");
    await page.getByTestId("password-mode-passphrase").click();
    await expect(page.getByTestId("password-output")).toBeVisible();
    const strength = page.getByTestId("password-strength");
    await expect(page.getByTestId("password-strength-label")).toHaveText(
      "Strong · 77 bits",
    );
    await expect(page.getByTestId("password-strength-pool")).toHaveText(
      "7,776 words × 6 · 77 bits",
    );

    const before = await strength.innerText();
    for (let i = 0; i < 5; i++) {
      await page.getByTestId("password-regenerate").click();
    }
    expect(await strength.innerText()).toBe(before);
  });

  test("Slow hash changes the sentence and assumption, never the URL; Esc resets it", async ({
    page,
  }) => {
    await page.goto("/tools/password?mode=passphrase");
    await expect(page.getByTestId("password-output")).toBeVisible();
    await expect(page.getByTestId("password-crack-time")).toHaveText(
      "About 350 thousand years to crack, on average",
    );
    const urlBefore = page.url();

    await page.getByTestId("password-scenario-slow").click();
    await expect(page.getByTestId("password-crack-time")).toHaveText(
      "About 350 billion years to crack, on average",
    );
    await expect(page.getByTestId("password-crack-assumption")).toHaveText(
      GUESS_RATE_LABELS.slow,
    );
    expect(page.url()).toBe(urlBefore);

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("password-scenario-fast")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByTestId("password-crack-assumption")).toHaveText(
      GUESS_RATE_LABELS.fast,
    );
  });

  test("the strength panel is not a live region", async ({ page }) => {
    await page.goto("/tools/password");
    const strength = page.getByTestId("password-strength");
    await expect(strength).toBeVisible();
    await expect(strength).not.toHaveAttribute("aria-live", /.*/);
    await expect(strength.locator("[aria-live]")).toHaveCount(0);
  });
});
