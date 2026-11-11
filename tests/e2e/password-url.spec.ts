import { expect, test, type Page } from "@playwright/test";

const POOL_SYMBOLS = "!@#$%^&*()\\-_=+[\\]{};:,.?";

async function output(page: Page): Promise<string> {
  return (await page.getByTestId("password-output").textContent()) ?? "";
}

async function expectUrlClean(page: Page, shown: string) {
  const url = page.url();
  expect(url).not.toContain(shown);
  expect(url).not.toContain(encodeURIComponent(shown));
  expect(url).not.toContain("#");
}

test.describe("Password URL state (POUT-03, D-13)", () => {
  test("bookmark restore: /tools/password?len=32&u=0&amb=1 loads those options", async ({
    page,
  }) => {
    await page.goto("/tools/password?len=32&u=0&amb=1");
    await expect(page.getByTestId("password-output")).toBeVisible();

    const text = await output(page);
    expect(text).toHaveLength(32);
    expect(text).not.toMatch(/[A-Z]/);
    expect(text).not.toMatch(/[0Oo1lI|]/);
    await expect(page.getByTestId("password-set-uppercase")).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await expect(page.getByTestId("password-lookalikes")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByTestId("password-length")).toHaveValue("32");
    await expect(page.getByTestId("password-length-slider")).toHaveValue("32");
    expect(page.url()).toMatch(/\/tools\/password\?len=32&u=0&amb=1$/);
  });

  test("hostile URL loads clamped, with no error, and is rewritten canonically (UI E3-partial)", async ({
    page,
  }) => {
    await page.goto(
      "/tools/password?len=999&n=1e9&u=0&l=0&d=0&s=0&sym=%F0%9F%98%80abc&evil=1",
    );
    await expect(page.getByTestId("password-output")).toBeVisible();
    await expect.poll(() => page.url()).toMatch(/\/tools\/password\?len=128$/);

    const text = await output(page);
    expect(text).toHaveLength(128);
    expect(text).toMatch(/[A-Z]/);
    expect(text).toMatch(/[a-z]/);
    expect(text).toMatch(/[0-9]/);
    expect(text).toMatch(new RegExp(`[${POOL_SYMBOLS}]`));
    expect(text).toMatch(new RegExp(`^[A-Za-z0-9${POOL_SYMBOLS}]{128}$`));
    await expect(page.getByTestId("password-error")).toHaveCount(0);
    await expect(page.getByTestId("password-batch")).toHaveCount(0);
    for (const key of ["uppercase", "lowercase", "digits", "symbols"]) {
      await expect(page.getByTestId(`password-set-${key}`)).toHaveAttribute(
        "aria-checked",
        "true",
      );
    }
  });

  test("options update the address bar and a reload restores them", async ({
    page,
  }) => {
    await page.goto("/tools/password");
    await expect(page.getByTestId("password-output")).toBeVisible();
    expect(new URL(page.url()).search).toBe("");
    const historyLength = await page.evaluate(() => history.length);

    await page.getByTestId("password-set-digits").click();
    await expect.poll(() => page.url()).toMatch(/\/tools\/password\?d=0$/);
    await expectUrlClean(page, await output(page));

    await page.getByTestId("password-length").fill("64");
    await expect
      .poll(() => page.url())
      .toMatch(/\/tools\/password\?len=64&d=0$/);
    await expectUrlClean(page, await output(page));

    await page.getByTestId("password-regenerate").click();
    await expectUrlClean(page, await output(page));

    expect(await page.evaluate(() => history.length)).toBe(historyLength);

    await page.reload();
    await expect(page.getByTestId("password-output")).toBeVisible();
    const text = await output(page);
    expect(text).toHaveLength(64);
    expect(text).not.toMatch(/[0-9]/);
    await expect(page.getByTestId("password-length")).toHaveValue("64");
    expect(page.url()).toMatch(/\/tools\/password\?len=64&d=0$/);
  });

  test("mount rewrite of a canonical URL leaves it unchanged and adds no history entry", async ({
    page,
  }) => {
    await page.goto("/tools/password?len=40&u=0");
    await expect(page.getByTestId("password-output")).toBeVisible();
    expect(page.url()).toMatch(/\/tools\/password\?len=40&u=0$/);
    const historyLength = await page.evaluate(() => history.length);
    await page.getByTestId("password-set-digits").click();
    await page.getByTestId("password-set-symbols").click();
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
  });

  test("history.state is null or Next internals only and never holds the password (Pitfall 1)", async ({
    page,
  }) => {
    await page.goto("/tools/password");
    await expect(page.getByTestId("password-output")).toBeVisible();
    await page.getByTestId("password-set-digits").click();
    await page.getByTestId("password-length").fill("48");
    await page.getByTestId("password-regenerate").click();

    const shown = await output(page);
    const state = await page.evaluate(() => history.state);
    if (state !== null) {
      expect(typeof state).toBe("object");
      const allowed = ["__NA", "__PRIVATE_NEXTJS_INTERNALS_TREE"];
      for (const key of Object.keys(state as object)) {
        expect(allowed).toContain(key);
      }
    }
    expect(JSON.stringify(state ?? null)).not.toContain(shown);
    await expectUrlClean(page, shown);
  });
});
