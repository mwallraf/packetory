import { expect, test } from "@playwright/test";

test("public worker tracer displays the exact IP digit change", async ({ page }) => {
  const response = await page.goto("/tools/diff");
  expect(response?.status()).toBe(200);

  const workerUrls: string[] = [];
  page.on("worker", (worker) => workerUrls.push(worker.url()));
  const compare = page.getByRole("button", { name: "Compare" });
  await expect(compare).toBeDisabled();
  await page.getByLabel("Original", { exact: true }).fill("192.0.2.1");
  await expect(compare).toBeDisabled();
  expect(workerUrls).toEqual([]);

  const [worker] = await Promise.all([
    page.waitForEvent("worker"),
    page.getByLabel("Modified", { exact: true }).fill("192.0.2.2"),
  ]);
  expect(worker.url()).toContain("/_next/static/");
  await expect(page.getByRole("status")).toHaveText("1 modified");
  const results = page.getByRole("region", { name: "Comparison results" });
  await expect(results.locator("del").filter({ visible: true })).toHaveText("1");
  await expect(results.locator("ins").filter({ visible: true })).toHaveText("2");
});

test("learns from the editable example and clears all comparison state", async ({ page }) => {
  await page.goto("/tools/diff");
  await page.getByRole("button", { name: "Try an example" }).click();
  const original = page.getByLabel("Original", { exact: true });
  const modified = page.getByLabel("Modified", { exact: true });
  await expect(original).toHaveValue(/192\.0\.2\.1/);
  await expect(modified).toHaveValue(/192\.0\.2\.2/);
  await expect(page.getByRole("status")).toHaveText("1 added · 1 modified");
  await original.fill("edited");
  await expect(page.getByRole("status")).toHaveText("Out of date. Compare again to update the results.");
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(original).toHaveValue("");
  await expect(modified).toHaveValue("");
  await expect(original).toBeFocused();
  await expect(page.getByRole("status")).toBeEmpty();
  await expect(page.getByRole("region", { name: "Comparison results" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Try an example" })).toBeVisible();
});
