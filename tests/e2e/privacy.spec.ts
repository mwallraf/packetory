import { expect, test } from "@playwright/test";

test.describe("Privacy notice (D-14, D-15)", () => {
  test("/privacy renders the draft notice with all key disclosures", async ({
    page,
  }) => {
    await page.goto("/privacy");

    await expect(
      page.getByRole("heading", { level: 1, name: "Privacy" })
    ).toBeVisible();
    await expect(page.getByTestId("privacy-draft-notice")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "No tracking cookies" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Analytics: cookie-free, and redacted by default",
      })
    ).toBeVisible();
  });

  test("footer 'Privacy' link is present on the homepage and navigates to /privacy", async ({
    page,
  }) => {
    await page.goto("/");

    const link = page.getByTestId("footer-privacy-link");
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/privacy");

    await link.click();
    await expect(page).toHaveURL("/privacy");
    await expect(
      page.getByRole("heading", { level: 1, name: "Privacy" })
    ).toBeVisible();
  });
});
