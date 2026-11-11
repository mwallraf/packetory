import { expect, test } from "@playwright/test";

const CRYPTO_SENTENCE =
  "Secure random generation isn't available in this browser, so no password was generated.";

const POOL_RE = /^[A-Za-z0-9!@#$%^&*()\-_=+[\]{};:,.?]{20}$/;

test.describe("Password Generator (PWD-01, PWD-07, PWD-08, POUT-01)", () => {
  test("loads a fresh 20-character all-sets password", async ({ page }) => {
    await page.goto("/tools/password");

    const output = page.getByTestId("password-output");
    await expect(output).toBeVisible();
    const text = (await output.textContent()) ?? "";
    expect(text).toMatch(POOL_RE);
    expect(text).toMatch(/[A-Z]/);
    expect(text).toMatch(/[a-z]/);
    expect(text).toMatch(/[0-9]/);
    expect(text).toMatch(/[!@#$%^&*()\-_=+[\]{};:,.?]/);
  });

  test("two loads differ", async ({ page }) => {
    await page.goto("/tools/password");
    const output = page.getByTestId("password-output");
    await expect(output).toBeVisible();
    const first = await output.textContent();

    await page.reload();
    await expect(output).toBeVisible();
    expect(await output.textContent()).not.toBe(first);
  });

  test("Regenerate replaces the value", async ({ page }) => {
    await page.goto("/tools/password");
    const output = page.getByTestId("password-output");
    await expect(output).toBeVisible();
    const first = (await output.textContent()) ?? "";

    await page.getByTestId("password-regenerate").click();
    await expect.poll(async () => (await output.textContent()) ?? "").not.toBe(
      first,
    );
  });

  test("Copy writes the plain displayed string", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/tools/password");
    const output = page.getByTestId("password-output");
    await expect(output).toBeVisible();

    const copy = page.getByTestId("password-copy");
    await copy.click();
    await expect(copy).toContainText("Copied!");

    const displayed = (await output.textContent()) ?? "";
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe(displayed);
    expect(clipboard).toHaveLength(20);
  });

  test("fails closed without Web Crypto", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Crypto.prototype, "getRandomValues", {
        value: undefined,
        configurable: true,
      });
    });
    await page.goto("/tools/password");

    const error = page.getByTestId("password-error");
    await expect(error).toBeVisible();
    await expect(error.getByRole("alert")).toContainText(CRYPTO_SENTENCE);
    await expect(page.getByTestId("password-output")).toHaveCount(0);
    await expect(page.getByTestId("password-copy")).toHaveCount(0);
    await expect(page.getByTestId("password-regenerate")).toHaveCount(0);
  });
});
