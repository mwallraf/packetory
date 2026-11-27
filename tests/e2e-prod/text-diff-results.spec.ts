import { expect, test } from "@playwright/test";

test("responsive review keeps one aligned diff with keyboard-expandable context", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/tools/diff");
  const unchanged = Array.from({ length: 12 }, (_, i) => `baseline line ${i + 1}`).join("\n");
  await page.getByLabel("Original", { exact: true }).fill(`${unchanged}\nip address 192.0.2.1\nlong ${"a".repeat(500)}\nend\n`);
  await page.getByLabel("Modified", { exact: true }).fill(`${unchanged}\nip address 192.0.2.2\nlong ${"a".repeat(500)}\npermit dns\nend`);
  await page.getByRole("button", { name: "Compare" }).click();

  const results = page.getByRole("region", { name: "Comparison results" });
  await expect(results).toBeVisible();
  const fold = results.getByRole("button", { name: "Show 9 unchanged lines" });
  await expect(fold).toHaveAttribute("aria-expanded", "false", { timeout: 1_500 });
  await fold.focus();
  await page.keyboard.press("Enter");
  const expanded = results.getByRole("button", { name: "Hide 9 unchanged lines" });
  await expect(expanded).toBeFocused();
  await expect(expanded).toHaveAttribute("aria-expanded", "true");
  await expect(results.getByText("baseline line 1", { exact: true })).toHaveCount(2);
  await page.keyboard.press("Space");
  await expect(fold).toBeFocused();
  await expect(results.getByText("baseline line 1", { exact: true })).toHaveCount(0);

  const oldDigit = results.locator("del").getByText("1", { exact: true }).or(results.locator("del").filter({ hasText: /^1$/ }));
  const newDigit = results.locator("ins").getByText("2", { exact: true }).or(results.locator("ins").filter({ hasText: /^2$/ }));
  await expect(oldDigit).toBeVisible();
  await expect(newDigit).toBeVisible();
  const oldBox = (await oldDigit.boundingBox())!;
  const newBox = (await newDigit.boundingBox())!;
  expect(oldBox.y).toBe(newBox.y);
  expect(newBox.x).toBeGreaterThan(oldBox.x);
  await expect(results.getByText("No newline at end of text", { exact: true })).toBeVisible();
  await expect(results.getByText("permit dns", { exact: true })).toBeVisible();

  const highlight = (await newDigit.evaluate((node) => getComputedStyle(node).backgroundColor));
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect.poll(() => newDigit.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe(highlight);
  await page.setViewportSize({ width: 320, height: 700 });
  expect((await newDigit.boundingBox())!.y).toBeGreaterThan((await oldDigit.boundingBox())!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(results.getByText("baseline line 12", { exact: true }).filter({ visible: true })).toHaveCount(1);
  await expect(results.getByText("Removed, original line 13", { exact: true })).toBeVisible();
  await expect(results.getByText("Added, modified line 13", { exact: true })).toBeVisible();
});
