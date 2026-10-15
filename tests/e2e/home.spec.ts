import { expect, test } from "@playwright/test";

test.describe("Landing page — tool registry grid", () => {
  test("renders exactly five tool cards from the registry, each with name/description/category", async ({
    page,
  }) => {
    await page.goto("/");

    const cards = page.getByTestId("tool-card");
    await expect(cards).toHaveCount(5);

    for (let i = 0; i < 5; i++) {
      const card = cards.nth(i);
      await expect(card.getByTestId("tool-card-name")).toBeVisible();
      await expect(card.getByTestId("tool-card-description")).toBeVisible();
      await expect(card.getByTestId("tool-card-category")).toBeVisible();
    }
  });

  test("cards render in order Subnet, UUID, DNS, Hash, MAC (featured desc, then name asc)", async ({
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
      "Hash Generator",
      "MAC Address Inspector",
    ]);
  });

  test("no card shows a 'Coming soon' badge now that all five registry tools are 'active' (Phase 2 Plan 01, Phase 3 Plan 01, Phase 4 Plan 01, Phase 5 Plan 01, Phase 9 Plan 03); each active card renders exactly one clickable anchor (stretched-link, Phase 6 Plan 01)", async ({
    page,
  }) => {
    await page.goto("/");

    // Registry sort order: Subnet, UUID, DNS, Hash, MAC (see the preceding
    // test) — all five are "active" as of this plan.
    const cards = page.getByTestId("tool-card");
    await expect(cards).toHaveCount(5);

    for (let i = 0; i < 5; i++) {
      const card = cards.nth(i);
      await expect(card.getByText("Coming soon")).toHaveCount(0);
      // Each active card renders exactly one stretched-link anchor (LP-01).
      await expect(card.locator("a")).toHaveCount(1);
    }
  });

  test("clicking anywhere on an active tool card navigates to its /tools/{slug} page", async ({
    page,
  }) => {
    await page.goto("/");

    const card = page.getByTestId("tool-card").first();
    // Click a corner point inside the card that is NOT the title text/link
    // itself — proves the stretched-link hit area covers the whole card.
    await card.click({ position: { x: 10, y: 10 } });

    await expect(page).toHaveURL(/\/tools\//);
  });

  test("a tool card link is reachable by keyboard and activates on Enter", async ({
    page,
  }) => {
    await page.goto("/");

    const link = page.getByTestId("tool-card").first().locator("a");
    await link.focus();
    await expect(link).toBeFocused();

    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/tools\//);
  });
});

test.describe("Hash Generator integration (INTG-01)", () => {
  test("the Hash Generator card opens /tools/hash (INTG-01)", async ({
    page,
  }) => {
    await page.goto("/");

    const card = page
      .getByTestId("tool-card")
      .filter({ has: page.getByTestId("tool-card-name").getByText("Hash Generator", { exact: true }) });
    await expect(card).toHaveCount(1);
    await card.click({ position: { x: 10, y: 10 } });

    await expect(page).toHaveURL(/\/tools\/hash$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Hash Generator" })
    ).toBeVisible();
  });

  test("sitemap.xml lists /tools/hash (INTG-01)", async ({ page }) => {
    const response = await page.request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain("https://packetory.dev/tools/hash");
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
