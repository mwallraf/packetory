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

  test("each card shows a muted 'Coming soon' badge and is not a clickable link", async ({
    page,
  }) => {
    await page.goto("/");

    const cards = page.getByTestId("tool-card");
    const count = await cards.count();
    expect(count).toBe(4);

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      await expect(card.getByText("Coming soon")).toBeVisible();
      // No anchor tag wrapping the card — status:"planned" cards are not clickable.
      await expect(card.locator("a")).toHaveCount(0);
    }
  });
});
