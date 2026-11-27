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

test("mobile drawer opens Text Diff and the tool includes canonical and About metadata", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open navigation menu" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const drawer = page.getByTestId("mobile-nav-drawer");
  const diffLink = drawer.getByRole("link", { name: "Diff", exact: true });
  await expect(drawer.getByRole("link")).toHaveCount(8);
  await diffLink.focus();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/tools\/diff$/);
  await expect(drawer).toBeHidden();
  await expect(page).toHaveTitle("Online Text Diff & Config Compare — Packetory");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://packetory.dev/tools/diff");
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", "https://packetory.dev/tools/diff");
  await expect(page.getByTestId("diff-worked-example")).not.toHaveAttribute("open", "");
  await page.getByText("Worked example", { exact: true }).click();
  await expect(page.getByTestId("diff-worked-example")).toContainText("192.0.2.1");
  await expect(page.getByTestId("diff-worked-example")).toContainText("192.0.2.2");
  await expect(page.getByTestId("diff-worked-example")).toContainText("description Lab uplink");
  await trigger.click();
  await expect(diffLink).toHaveAttribute("aria-current", "page");
});
