import { expect, test } from "@playwright/test";

test("home to comparison discovers and opens Text Diff from the registry", async ({ page, request }) => {
  await page.goto("/");
  const card = page.getByTestId("tool-card").getByRole("link", { name: "Text Diff", exact: true });
  await expect(card).toHaveAttribute("href", "/tools/diff", { timeout: 1_500 });
  const navLink = page.getByRole("navigation", { name: "Tool navigation" }).getByRole("link", { name: "Diff", exact: true });
  await expect(navLink).toHaveAttribute("href", "/tools/diff");
  await card.click();
  await expect(page).toHaveURL(/\/tools\/diff$/);
  await expect(page.getByRole("heading", { level: 1, name: "Text Diff" })).toBeVisible();
  await expect(navLink).toHaveAttribute("aria-current", "page");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain("<loc>https://packetory.dev/tools/diff</loc>");

  await page.getByLabel("Original", { exact: true }).fill("192.0.2.1");
  await page.getByLabel("Modified", { exact: true }).fill("192.0.2.2");
  const [worker] = await Promise.all([
    page.waitForEvent("worker"),
    page.getByRole("button", { name: "Compare" }).click(),
  ]);
  expect(worker.url()).toContain("/_next/static/");
  await expect(page.getByRole("status")).toHaveText("1 modified");
});
