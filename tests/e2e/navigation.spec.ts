import { expect, test } from "@playwright/test";

test.describe("Mobile nav drawer (320px, D-04, SHELL-06)", () => {
  test.use({ viewport: { width: 320, height: 700 } });

  test("hamburger trigger is visible; opening reveals all tool shortNames while logo + theme toggle stay visible", async ({
    page,
  }) => {
    await page.goto("/");

    const trigger = page.getByTestId("mobile-nav-trigger");
    await expect(trigger).toBeVisible();

    // Locate by test id, not role: Radix's modal Sheet marks background
    // content aria-hidden while open (correct focus-trap a11y behavior), so
    // a role-based query would be filtered out of the accessibility tree
    // even though the header remains visually present (D-04).
    const logo = page.getByTestId("site-logo");
    const themeToggle = page.getByTestId("theme-toggle");
    await expect(logo).toBeVisible();
    await expect(themeToggle).toBeVisible();

    // Desktop nav must not be visible at 320px — only the hamburger is.
    await expect(page.getByTestId("nav-link-planned").first()).toBeHidden();

    await trigger.click();

    const drawer = page.getByTestId("mobile-nav-drawer");
    await expect(drawer).toBeVisible();

    // shortName items per tools/registry.ts — all four are status:"planned"
    // in Phase 1, rendered muted/non-clickable (D-01).
    for (const shortName of ["Subnet", "UUID", "DNS", "MAC"]) {
      await expect(
        drawer.getByText(shortName, { exact: true })
      ).toBeVisible();
    }
    await expect(drawer.locator("a")).toHaveCount(0);

    // Logo and theme toggle remain visible outside the drawer while it's open (D-04).
    await expect(logo).toBeVisible();
    await expect(themeToggle).toBeVisible();

    // No horizontal scroll at 320px, drawer open or closed (SHELL-06).
    const hasHorizontalScroll = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );
    expect(hasHorizontalScroll).toBe(false);
  });

  test("Esc closes the drawer and returns focus to the trigger", async ({
    page,
  }) => {
    await page.goto("/");

    const trigger = page.getByTestId("mobile-nav-trigger");
    await trigger.click();

    const drawer = page.getByTestId("mobile-nav-drawer");
    await expect(drawer).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(drawer).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });
});
