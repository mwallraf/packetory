import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

test.describe("Hash Generator ?text= restore (TEXT-04)", () => {
  test("a non-ASCII ?text= restores the text and its real digests (TEXT-04)", async ({
    page,
  }) => {
    const text = "é€🚀";
    await page.goto("/tools/hash?text=" + encodeURIComponent(text));

    await expect(page.getByTestId("hash-input")).toHaveValue(text);
    await expect(page.getByTestId("hash-bytes")).toHaveText("9 bytes (UTF-8)");
    await expect(page.getByTestId("hash-row-sha256-value")).toHaveText(
      createHash("sha256").update(text, "utf8").digest("hex"),
    );
  });

  test("an empty ?text= loads the default sample (TEXT-04)", async ({
    page,
  }) => {
    await page.goto("/tools/hash?text=");
    await expect(page.getByTestId("hash-input")).toHaveValue("hello world");
  });

  test("typing never changes the URL or the history length (TEXT-04, D-20)", async ({
    page,
  }) => {
    await page.goto("/tools/hash?text=abc");
    await expect(page.getByTestId("hash-row-sha256-value")).toHaveText(
      createHash("sha256").update("abc", "utf8").digest("hex"),
    );
    const url = page.url();
    const historyLength = await page.evaluate(() => history.length);

    await page.getByTestId("hash-input").click();
    await page.keyboard.press("End");
    await page.keyboard.type("def");
    await expect(page.getByTestId("hash-input")).toHaveValue("abcdef");
    await expect(page.getByTestId("hash-row-sha256-value")).toHaveText(
      createHash("sha256").update("abcdef", "utf8").digest("hex"),
    );

    expect(page.url()).toBe(url);
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
  });
});

test.describe("Hash Generator Copy link (TEXT-04)", () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  });

  test("a copied link restores the exact text and never changes the page URL (TEXT-04, D-21)", async ({
    page,
  }) => {
    const text = "line1\nline2 +&?é";
    await page.goto("/tools/hash");
    await page.getByTestId("hash-input").fill(text);
    const url = page.url();

    await page.getByTestId("hash-copy-link").click();
    await expect(page.getByTestId("hash-copy-link")).toHaveText("Copied!");
    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText(),
    );
    expect(clipboardText).toBe(
      new URL(url).origin + "/tools/hash?text=" + encodeURIComponent(text),
    );
    expect(page.url()).toBe(url);

    await page.goto(clipboardText);
    await expect(page.getByTestId("hash-input")).toHaveValue(text);
  });

  test("text over 2,000 encoded characters disables Copy link with the reason (TEXT-04)", async ({
    page,
  }) => {
    await page.goto("/tools/hash");
    await page.getByTestId("hash-input").fill("a".repeat(2001));
    await expect(page.getByTestId("hash-copy-link")).toBeDisabled();
    await expect(page.getByTestId("hash-notice-link")).toHaveText(
      "Text is too long for a link (over 2,000 encoded characters).",
    );
  });
});
