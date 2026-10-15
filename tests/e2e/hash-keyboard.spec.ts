import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

const SAMPLE_SHA256 =
  "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9";

test.describe("Hash Generator keyboard (INT-01)", () => {
  test("'/' focuses the textarea and selects all so typing replaces the sample", async ({
    page,
  }) => {
    await page.goto("/tools/hash");
    await expect(page.getByTestId("hash-input")).toHaveValue("hello world");
    await page.getByRole("heading", { name: "Digests" }).click();
    await page.keyboard.press("/");
    await page.keyboard.type("q");
    await expect(page.getByTestId("hash-input")).toHaveValue("q");
  });

  test("Esc restores the sample, its digests and clears the verify box", async ({
    page,
  }) => {
    await page.goto("/tools/hash");
    await expect(page.getByTestId("hash-input")).toHaveValue("hello world");
    await page.getByTestId("hash-input").fill("abc");
    await page.getByTestId("hash-verify").fill("deadbeef");
    await expect(page.getByTestId("hash-row-sha256-value")).not.toHaveText(
      SAMPLE_SHA256,
    );
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("hash-input")).toHaveValue("hello world");
    await expect(page.getByTestId("hash-row-sha256-value")).toHaveText(
      SAMPLE_SHA256,
    );
    await expect(page.getByTestId("hash-verify")).toHaveValue("");
  });

  test("Esc keeps the encoding toggle", async ({ page }) => {
    await page.goto("/tools/hash");
    await expect(page.getByTestId("hash-input")).toHaveValue("hello world");
    await page.getByTestId("hash-encoding-HEX").click();
    await expect(page.getByTestId("hash-encoding-HEX")).toBeChecked();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("hash-encoding-HEX")).toBeChecked();
  });

  test("Enter inserts a newline and the newline is hashed", async ({ page }) => {
    await page.goto("/tools/hash");
    await expect(page.getByTestId("hash-input")).toHaveValue("hello world");
    const input = page.getByTestId("hash-input");
    await input.fill("abc");
    await input.focus();
    // Caret to the end programmatically: the "End" key only scrolls on macOS.
    await input.evaluate((el: HTMLTextAreaElement) => {
      el.setSelectionRange(el.value.length, el.value.length);
    });
    await page.keyboard.press("Enter");
    await page.keyboard.type("d");
    await expect(input).toHaveValue("abc\nd");
    await expect(page.getByTestId("hash-row-sha256-value")).toHaveText(
      createHash("sha256").update("abc\nd", "utf8").digest("hex"),
    );
  });
});
