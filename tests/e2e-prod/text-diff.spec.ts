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
  await page.getByLabel("Modified", { exact: true }).fill("192.0.2.2");
  await expect(compare).toBeEnabled();
  expect(workerUrls).toEqual([]);

  const [worker] = await Promise.all([page.waitForEvent("worker"), compare.click()]);
  expect(worker.url()).toContain("/_next/static/");
  await expect(page.getByRole("status")).toHaveText("1 modified");
  const results = page.getByRole("region", { name: "Comparison results" });
  await expect(results.locator("del").filter({ visible: true })).toHaveText("1");
  await expect(results.locator("ins").filter({ visible: true })).toHaveText("2");
});
