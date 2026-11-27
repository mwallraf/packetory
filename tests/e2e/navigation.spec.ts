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
    await expect(page.getByRole("navigation", { name: "Tool navigation" })).toBeHidden();

    await trigger.click();

    const drawer = page.getByTestId("mobile-nav-drawer");
    await expect(drawer).toBeVisible();

    // All active registry entries render as real links using their shortName.
    for (const shortName of ["Subnet", "UUID", "BGP", "Config", "DNS", "Hash", "MAC", "Password", "Diff"]) {
      await expect(
        drawer.getByText(shortName, { exact: true })
      ).toBeVisible();
    }
    await expect(drawer.locator("a")).toHaveCount(9);
    await expect(
      drawer.getByTestId("mobile-nav-link").getByText("UUID", { exact: true })
    ).toBeVisible();
    await expect(
      drawer.getByTestId("mobile-nav-link").getByText("Subnet", { exact: true })
    ).toBeVisible();
    await expect(
      drawer.getByTestId("mobile-nav-link").getByText("DNS", { exact: true })
    ).toBeVisible();
    await expect(
      drawer.getByTestId("mobile-nav-link").getByText("Hash", { exact: true })
    ).toBeVisible();
    await expect(
      drawer.getByTestId("mobile-nav-link").getByText("MAC", { exact: true })
    ).toBeVisible();
    await expect(
      drawer
        .getByTestId("mobile-nav-link")
        .getByText("Password", { exact: true })
    ).toBeVisible();

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

for (const width of [640, 700]) {
  test.describe(`Desktop nav fits nine tools at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test("nine nav links share one row and the theme toggle keeps 8px clearance", async ({
      page,
    }) => {
      await page.goto("/");

      const links = page.getByTestId("nav-link");
      await expect(links).toHaveCount(9);
      for (let i = 0; i < 9; i++) {
        await expect(links.nth(i)).toBeVisible();
      }
      await expect(page.getByTestId("site-logo")).toBeVisible();
      await expect(page.getByTestId("theme-toggle")).toBeVisible();

      expect(await links.allTextContents()).toEqual([
        "Subnet",
        "UUID",
        "BGP",
        "Config",
        "DNS",
        "Hash",
        "MAC",
        "Password",
        "Diff",
      ]);

      await page.getByTestId("site-logo").focus();
      for (let index = 0; index < 9; index++) {
        await page.keyboard.press("Tab");
        await expect(links.nth(index)).toBeFocused();
      }
      await page.keyboard.press("Tab");
      await expect(page.getByTestId("theme-toggle")).toBeFocused();

      const metrics = await page.evaluate(() => {
        const header = document.querySelector("header");
        const navLinks = Array.from(
          document.querySelectorAll('[data-testid="nav-link"]')
        ) as HTMLElement[];
        const toggle = document.querySelector(
          '[data-testid="theme-toggle"]'
        ) as HTMLElement;
        const rects = navLinks.map((l) => l.getBoundingClientRect());
        return {
          offsetTops: navLinks.map((l) => l.offsetTop),
          widths: rects.map((r) => Math.round(r.width * 10) / 10),
          lastRight: rects[rects.length - 1].right,
          toggleLeft: toggle.getBoundingClientRect().left,
          pageScrollWidth: document.documentElement.scrollWidth,
          pageClientWidth: document.documentElement.clientWidth,
          headerScrollWidth: header?.scrollWidth ?? 0,
          headerClientWidth: header?.clientWidth ?? 0,
        };
      });

      expect(new Set(metrics.offsetTops).size).toBe(1);
      expect(metrics.pageScrollWidth).toBeLessThanOrEqual(
        metrics.pageClientWidth
      );
      expect(metrics.headerScrollWidth).toBeLessThanOrEqual(
        metrics.headerClientWidth
      );

      const slack = metrics.toggleLeft - metrics.lastRight;
      console.log(
        `[nav-fit ${width}px] link widths=${JSON.stringify(metrics.widths)} slack=${slack.toFixed(1)}px`
      );
      expect(metrics.lastRight + 8).toBeLessThanOrEqual(metrics.toggleLeft);
    });
  });
}
