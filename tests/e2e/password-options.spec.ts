import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_SYMBOLS, LOOK_ALIKES } from "../../lib/password";

async function output(page: Page): Promise<string> {
  return (await page.getByTestId("password-output").textContent()) ?? "";
}

async function load(page: Page, path = "/tools/password") {
  await page.goto(path);
  await expect(page.getByTestId("password-output")).toBeVisible();
}

test.describe("Password options change the output (PWD-02, PWD-03, PWD-05, PWD-06)", () => {
  test("the slider sets the length and syncs the number input", async ({
    page,
  }) => {
    await load(page);
    await page.getByTestId("password-length-slider").fill("64");
    await expect.poll(async () => (await output(page)).length).toBe(64);
    await expect(page.getByTestId("password-length")).toHaveValue("64");
  });

  test("typing a length regenerates; an invalid one is explained, not applied, and blur clamps", async ({
    page,
  }) => {
    await load(page);
    const length = page.getByTestId("password-length");

    await length.fill("12");
    await expect.poll(async () => (await output(page)).length).toBe(12);
    await expect(page.getByTestId("password-length-slider")).toHaveValue("12");

    await length.fill("200");
    await expect(page.getByTestId("password-length-hint")).toBeVisible();
    expect((await output(page)).length).toBe(12);

    await length.blur();
    await expect(length).toHaveValue("128");
    await expect.poll(async () => (await output(page)).length).toBe(128);
    await expect(page.getByTestId("password-length-hint")).toHaveCount(0);
  });

  test("switching digits and symbols off removes them from the output", async ({
    page,
  }) => {
    await load(page, "/tools/password?len=128");
    await page.getByTestId("password-set-digits").click();
    await expect.poll(async () => await output(page)).not.toMatch(/[0-9]/);
    await page.getByTestId("password-set-symbols").click();
    await expect
      .poll(async () => await output(page))
      .toMatch(/^[A-Za-z]{128}$/);
  });

  test("the last set left is locked with a visible hint", async ({ page }) => {
    await load(page);
    await page.getByTestId("password-set-digits").click();
    await page.getByTestId("password-set-symbols").click();
    await page.getByTestId("password-set-uppercase").click();

    const last = page.getByTestId("password-set-lowercase");
    await expect(last).toBeDisabled();
    await expect(last).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("password-sets-lock-hint")).toBeVisible();
    await expect.poll(async () => await output(page)).toMatch(/^[a-z]{20}$/);
  });

  test("a custom symbol set drives the symbols; empty falls back to the default", async ({
    page,
  }) => {
    await load(page, "/tools/password?len=128");
    const symbols = page.getByTestId("password-symbols");

    await symbols.fill("#");
    await expect
      .poll(async () => {
        const text = await output(page);
        const found = text.split("").filter((c) => /[^A-Za-z0-9]/.test(c));
        return found.length > 0 && found.every((c) => c === "#");
      })
      .toBe(true);

    await symbols.fill("");
    await expect(page.getByTestId("password-symbols-hint")).toHaveText(
      "Empty, so the default set is used",
    );
    await symbols.blur();
    await expect(symbols).toHaveValue(DEFAULT_SYMBOLS);
  });

  test("Avoid look-alikes removes every look-alike character", async ({
    page,
  }) => {
    await load(page, "/tools/password?len=128");
    await page.getByTestId("password-lookalikes").click();
    for (let i = 0; i < 5; i++) {
      await page.getByTestId("password-regenerate").click();
      const text = await output(page);
      expect(text).toHaveLength(128);
      for (const ch of LOOK_ALIKES) expect(text).not.toContain(ch);
    }
    await expect(page.getByTestId("password-lookalikes-hint")).toHaveText(
      "Removes 0 O o 1 l I |",
    );
  });
});
