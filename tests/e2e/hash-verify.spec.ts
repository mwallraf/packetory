import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

const SHA256_HEX =
  "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9";
const SHA256_ABC = createHash("sha256").update("abc", "utf8").digest("hex");

test.describe("Hash Generator paste-to-verify (OUT-04)", () => {
  test("a prefixed upper-case checksum highlights the matching row (OUT-04)", async ({
    page,
  }) => {
    await page.goto("/tools/hash");
    await page
      .getByTestId("hash-verify")
      .fill("SHA256: " + SHA256_HEX.toUpperCase());

    await expect(page.getByTestId("hash-row-sha256-match")).toBeVisible();
    await expect(page.getByTestId("hash-verify-result")).toHaveText(
      "Matches SHA-256.",
    );
    await expect(page.getByTestId("hash-row-md5-match")).toHaveCount(0);
  });

  test("a value equal to no digest says so neutrally (OUT-04)", async ({
    page,
  }) => {
    await page.goto("/tools/hash");
    await page.getByTestId("hash-verify").fill("deadbeef");

    await expect(page.getByTestId("hash-verify-result")).toContainText(
      "No match.",
    );
    await expect(page.locator("[data-testid$='-match']")).toHaveCount(0);
  });

  test("verification follows the text once the worker result lands (OUT-04, D-19)", async ({
    page,
  }) => {
    await page.goto("/tools/hash");
    const result = page.getByTestId("hash-verify-result");
    await page.getByTestId("hash-verify").fill(SHA256_ABC);
    await expect(result).toContainText("No match.");

    await page.getByTestId("hash-input").fill("abc");
    await expect(result).toHaveText("Matches SHA-256.");
    await expect(page.getByTestId("hash-row-sha256-match")).toBeVisible();
  });

  test("clearing the field returns to idle (OUT-04)", async ({ page }) => {
    await page.goto("/tools/hash");
    const verify = page.getByTestId("hash-verify");
    await verify.fill(SHA256_HEX);
    await expect(page.getByTestId("hash-row-sha256-match")).toBeVisible();

    await verify.fill("");
    await expect(page.getByTestId("hash-verify-result")).toHaveText("");
    await expect(page.locator("[data-testid$='-match']")).toHaveCount(0);
  });
});
