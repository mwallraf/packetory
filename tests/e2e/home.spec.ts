import { expect, test } from "@playwright/test";

test.describe("Landing page — tool registry grid", () => {
  test("renders exactly four tool cards from the registry, each with name/description/category", async ({
    page,
  }) => {
    await page.goto("/");

    const cards = page.getByTestId("tool-card");
    await expect(cards).toHaveCount(4);

    for (let i = 0; i < 4; i++) {
      const card = cards.nth(i);
      await expect(card.getByTestId("tool-card-name")).toBeVisible();
      await expect(card.getByTestId("tool-card-description")).toBeVisible();
      await expect(card.getByTestId("tool-card-category")).toBeVisible();
    }
  });

  test("cards render in order Subnet, UUID, DNS, MAC (featured desc, then name asc)", async ({
    page,
  }) => {
    await page.goto("/");

    const names = await page
      .getByTestId("tool-card-name")
      .allTextContents();

    expect(names).toEqual([
      "IP Subnet Calculator",
      "UUID Generator",
      "DNS Lookup",
      "MAC Address Inspector",
    ]);
  });

  test("no card shows a 'Coming soon' badge now that all four registry tools are 'active' (Phase 2 Plan 01, Phase 3 Plan 01, Phase 4 Plan 01, Phase 5 Plan 01); no card is itself a clickable link (ToolCard renders no wrapping anchor)", async ({
    page,
  }) => {
    await page.goto("/");

    // Registry sort order: Subnet, UUID, DNS, MAC (see the preceding test) —
    // all four are "active" as of this plan.
    const cards = page.getByTestId("tool-card");
    await expect(cards).toHaveCount(4);

    for (let i = 0; i < 4; i++) {
      const card = cards.nth(i);
      await expect(card.getByText("Coming soon")).toHaveCount(0);
      // ToolCard never wraps itself in an anchor tag, active or planned.
      await expect(card.locator("a")).toHaveCount(0);
    }
  });
});

test.describe("Theme toggle — light/dark persistence (SHELL-05)", () => {
  test("clicking the toggle flips the <html> theme class and persists across reload", async ({
    page,
  }) => {
    await page.goto("/");

    const html = page.locator("html");
    const toggle = page.getByTestId("theme-toggle");

    const initiallyDark = await html.evaluate((el) =>
      el.classList.contains("dark")
    );

    await toggle.click();

    const afterToggleDark = await html.evaluate((el) =>
      el.classList.contains("dark")
    );
    expect(afterToggleDark).toBe(!initiallyDark);

    await page.reload();

    const afterReloadDark = await page
      .locator("html")
      .evaluate((el) => el.classList.contains("dark"));
    expect(afterReloadDark).toBe(afterToggleDark);
  });
});
