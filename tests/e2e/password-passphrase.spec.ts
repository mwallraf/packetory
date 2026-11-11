import { expect, test } from "@playwright/test";
import { EFF_HYPHENATED_WORDS } from "../../lib/password";
import { splitPassphrase } from "./helpers/passphrase";

/**
 * Passphrase mode tracer (PHR-01, PHR-03): choosing Passphrase lazy-loads the
 * EFF list, shows a 6-word passphrase and mirrors only the mode into the URL.
 */

const WORD_RE = new RegExp(
  `^(?:[a-z]+|${EFF_HYPHENATED_WORDS.join("|")})$`,
);

test.describe("Passphrase mode (PHR-01, PHR-03)", () => {
  test("Passphrase shows 6 EFF words joined by -", async ({ page }) => {
    await page.goto("/tools/password");
    await expect(page.getByTestId("password-output")).toBeVisible();

    await page.getByTestId("password-mode-passphrase").click();

    const output = page.getByTestId("password-output");
    await expect(output).toBeVisible();
    const value = ((await output.textContent()) ?? "").trim();
    const tokens = splitPassphrase(value, "-");
    expect(tokens).toHaveLength(6);
    for (const t of tokens) expect(t).toMatch(WORD_RE);
    expect(new URL(page.url()).search).toBe("?mode=passphrase");
    await expect(page.getByTestId("password-mode-passphrase")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByTestId("password-mode-password")).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  test("clicking the selected mode changes nothing", async ({ page }) => {
    await page.goto("/tools/password");
    await page.getByTestId("password-mode-passphrase").click();
    const output = page.getByTestId("password-output");
    await expect(output).toBeVisible();
    const before = await output.textContent();
    const urlBefore = page.url();

    await page.getByTestId("password-mode-passphrase").click();

    await expect(output).toHaveText(before ?? "");
    expect(page.url()).toBe(urlBefore);
    await expect(
      page.locator('[data-testid^="password-mode-"][aria-checked="true"]'),
    ).toHaveCount(1);
  });

  test("both modes keep their own settings", async ({ page }) => {
    await page.goto("/tools/password");
    const output = page.getByTestId("password-output");
    await expect(output).toBeVisible();
    await page.getByTestId("password-length").fill("32");
    await expect(output).toHaveText(/^.{32}$/);

    await page.getByTestId("password-mode-passphrase").click();
    await expect(page.getByTestId("password-mode-passphrase")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(output).toHaveText(/^[a-z-]+$/);

    await page.getByTestId("password-mode-password").click();
    await expect(output).toHaveText(/^.{32}$/);
    expect(new URL(page.url()).search).toBe("?len=32");
  });

  test("a second Passphrase activation uses the cached list", async ({
    page,
  }) => {
    await page.goto("/tools/password");
    await page.getByTestId("password-mode-passphrase").click();
    const output = page.getByTestId("password-output");
    await expect(output).toBeVisible();

    await page.getByTestId("password-mode-password").click();
    await expect(output).toHaveText(/^.{20}$/);

    const loading = page.getByTestId("password-wordlist-loading");
    await page.getByTestId("password-mode-passphrase").click();
    // The cached list renders synchronously: the loading block never exists.
    await expect(loading).toHaveCount(0);
    await expect(output).toBeVisible();
    expect(
      splitPassphrase(((await output.textContent()) ?? "").trim(), "-"),
    ).toHaveLength(6);
  });
});
