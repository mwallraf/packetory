import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_SYMBOLS } from "../../lib/password";

/** Counts every Web Crypto fill so a test can prove how many generations ran. */
async function installCryptoCounter(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __grvCalls: number };
    w.__grvCalls = 0;
    const original = Crypto.prototype.getRandomValues;
    Crypto.prototype.getRandomValues = function (this: Crypto, ...args: [never]) {
      w.__grvCalls += 1;
      return original.apply(this, args);
    } as typeof Crypto.prototype.getRandomValues;
  });
}

function calls(page: Page): Promise<number> {
  return page.evaluate(
    () => (window as unknown as { __grvCalls: number }).__grvCalls,
  );
}

test.describe("Password keyboard shortcuts (POUT-04, D-14)", () => {
  test("/ focuses and selects Length", async ({ page }) => {
    await page.goto("/tools/password");
    await expect(page.getByTestId("password-output")).toBeVisible();
    await page.getByRole("heading", { level: 1 }).click();
    await page.keyboard.press("/");

    const length = page.getByTestId("password-length");
    await expect(length).toBeFocused();
    const selection = await length.evaluate((el: HTMLInputElement) => [
      el.selectionStart,
      el.selectionEnd,
      el.value.length,
    ]);
    expect(selection).toEqual([0, selection[2], selection[2]]);
    expect(selection[2]).toBeGreaterThan(0);
  });

  test("Enter regenerates from the page", async ({ page }) => {
    await page.goto("/tools/password");
    const output = page.getByTestId("password-output");
    await expect(output).toBeVisible();
    const first = (await output.textContent()) ?? "";
    await page.getByRole("heading", { level: 1 }).click();
    await page.keyboard.press("Enter");
    await expect
      .poll(async () => (await output.textContent()) ?? "")
      .not.toBe(first);
    await expect(page.getByTestId("password-status")).toHaveText(
      "New password generated",
    );
  });

  test("Enter on a focused button or switch never double-fires", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await installCryptoCounter(page);
    await page.goto("/tools/password?d=0&s=0");
    const output = page.getByTestId("password-output");
    await expect(output).toBeVisible();

    // Regenerate button: one generation, never two.
    let before = (await output.textContent()) ?? "";
    let base = await calls(page);
    await page.getByTestId("password-regenerate").focus();
    await page.keyboard.press("Enter");
    await expect
      .poll(async () => (await output.textContent()) ?? "")
      .not.toBe(before);
    let delta = (await calls(page)) - base;
    expect(delta).toBeGreaterThanOrEqual(20);
    expect(delta).toBeLessThanOrEqual(39);

    // Avoid look-alikes switch: toggles once and generates once.
    before = (await output.textContent()) ?? "";
    base = await calls(page);
    const lookalikes = page.getByTestId("password-lookalikes");
    await lookalikes.focus();
    await page.keyboard.press("Enter");
    await expect(lookalikes).toHaveAttribute("aria-checked", "true");
    await expect
      .poll(async () => (await output.textContent()) ?? "")
      .not.toBe(before);
    delta = (await calls(page)) - base;
    expect(delta).toBeGreaterThanOrEqual(20);
    expect(delta).toBeLessThanOrEqual(39);

    // Copy button: copies, never generates.
    base = await calls(page);
    const copy = page.getByTestId("password-copy");
    await copy.focus();
    await page.keyboard.press("Enter");
    await expect(copy).toContainText("Copied!");
    expect((await calls(page)) - base).toBe(0);

    // Length input: Enter regenerates once.
    before = (await output.textContent()) ?? "";
    base = await calls(page);
    await page.getByTestId("password-length").focus();
    await page.keyboard.press("Enter");
    await expect
      .poll(async () => (await output.textContent()) ?? "")
      .not.toBe(before);
    delta = (await calls(page)) - base;
    expect(delta).toBeGreaterThanOrEqual(20);
    expect(delta).toBeLessThanOrEqual(39);
  });

  test("Esc resets every option and keeps focus", async ({ page }) => {
    await page.goto("/tools/password?len=40&d=0&n=3");
    await expect(page.getByTestId("password-batch")).toBeVisible();
    const symbols = page.getByTestId("password-symbols");
    await symbols.focus();
    await symbols.fill("#");
    await page.keyboard.press("Escape");

    await expect(page).toHaveURL(/\/tools\/password$/);
    await expect(page.getByTestId("password-length")).toHaveValue("20");
    await expect(page.getByTestId("password-set-digits")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(symbols).toHaveValue(DEFAULT_SYMBOLS);
    await expect(page.getByTestId("password-hero")).toBeVisible();
    await expect(symbols).toBeFocused();
  });

  test("Ctrl/Cmd+C copies the single result", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/tools/password");
    const output = page.getByTestId("password-output");
    await expect(output).toBeVisible();
    const displayed = (await output.textContent()) ?? "";

    await page.getByRole("heading", { level: 1 }).click();
    await page.keyboard.press("ControlOrMeta+c");

    await expect(page.getByTestId("password-copy")).toHaveAccessibleName(
      "Copied!",
    );
    await expect(page.getByTestId("password-status")).toHaveText("Copied");
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe(displayed);
  });

  test("Ctrl/Cmd+C does nothing for a batch", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/tools/password?n=3");
    await expect(page.getByTestId("password-batch")).toBeVisible();
    await page.evaluate(() => navigator.clipboard.writeText("sentinel-value"));

    await page.getByRole("heading", { level: 1 }).click();
    await page.keyboard.press("ControlOrMeta+c");

    await expect(page.getByTestId("password-status")).toHaveText("");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "sentinel-value",
    );
  });

  test("Ctrl/Cmd+C leaves a user selection alone", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/tools/password");
    const output = page.getByTestId("password-output");
    await expect(output).toBeVisible();
    const displayed = (await output.textContent()) ?? "";
    await page.evaluate(() => navigator.clipboard.writeText("sentinel-value"));

    await page.getByRole("heading", { level: 1 }).click({ clickCount: 3 });
    await page.keyboard.press("ControlOrMeta+c");

    // Either the sentinel or the selected heading text, depending on the native
    // copy, but never the password.
    await expect(page.getByTestId("password-status")).toHaveText("");
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).not.toBe(displayed);
  });
});
