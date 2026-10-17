import { expect, test } from "@playwright/test";

test("hash-smoke harness is 404 without HASH_SMOKE=1 (HASH-04)", async ({ page }) => {
  const response = await page.goto("/hash-smoke");

  expect(response?.status()).toBe(404);
  await expect(page.getByTestId("hash-smoke-ready")).toHaveCount(0);
});
