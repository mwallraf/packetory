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

test.describe("Password batch and copy (POUT-01, POUT-02, D-11)", () => {
  test("a bookmarked batch restores, copies one per line and per row, and resizes", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/tools/password?n=5");

    const rows = page.getByTestId("password-row");
    await expect(rows).toHaveCount(5);
    await expect(
      page.getByTestId("password-batch").getByText("5 passwords"),
    ).toBeVisible();

    const values = await page.getByTestId("password-row-value").allTextContents();
    expect(values).toHaveLength(5);
    for (const v of values) {
      expect(v).toHaveLength(20);
      expect(v).toMatch(/[A-Z]/);
      expect(v).toMatch(/[a-z]/);
      expect(v).toMatch(/[0-9]/);
      expect(v).toMatch(/[!@#$%^&*()\-_=+[\]{};:,.?]/);
    }

    await page.getByTestId("password-copy-all").click();
    await expect(page.getByTestId("password-copy-all")).toHaveAccessibleName(
      "Copied!",
    );
    const all = await page.evaluate(() => navigator.clipboard.readText());
    expect(all).toBe(values.join("\n"));
    expect(all.split("\n")).toHaveLength(5);
    expect(all.endsWith("\n")).toBe(false);
    await expect(page.getByTestId("password-status")).toHaveText(
      "Copied all passwords",
    );

    const copyButtons = page.getByTestId("password-row-copy");
    await copyButtons.nth(2).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      values[2],
    );
    await expect(copyButtons.nth(2)).toHaveAccessibleName("Copied!");
    await expect(copyButtons.nth(0)).toHaveAccessibleName("Copy password 1");
    await expect(copyButtons.nth(1)).toHaveAccessibleName("Copy password 2");
    await expect(copyButtons.nth(3)).toHaveAccessibleName("Copy password 4");
    await expect(copyButtons.nth(4)).toHaveAccessibleName("Copy password 5");

    await page.getByTestId("password-batch-count").fill("3");
    await expect(rows).toHaveCount(3);
    await expect(page.getByTestId("password-status")).toHaveText(
      "3 new passwords generated",
    );

    await page.getByTestId("password-batch-count").fill("1");
    await expect(page.getByTestId("password-hero")).toBeVisible();
    await expect(page.getByTestId("password-batch")).toHaveCount(0);
  });
});
