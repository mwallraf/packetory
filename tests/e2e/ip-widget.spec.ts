import { expect, test } from "@playwright/test";

test.describe("Visitor IP widget (SHELL-03)", () => {
  test("shows the IP value in mono and copies it with a visible + announced confirmation", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.route("**/api/ip", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ip: "203.0.113.7" }),
      })
    );

    await page.goto("/");

    const badge = page.getByTestId("ip-badge");
    await expect(badge).toBeVisible();
    await expect(page.getByTestId("ip-badge-value")).toHaveText("203.0.113.7");

    const copyButton = page.getByTestId("ip-badge-copy");
    await copyButton.click();

    // Icon+label change, not color alone (QUAL-05), plus an aria-live announcement (QUAL-04).
    await expect(copyButton).toHaveAttribute("aria-label", "Copied!");
    await expect(page.getByTestId("ip-badge-copy-status")).toHaveText(
      "Copied!"
    );

    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText()
    );
    expect(clipboardText).toBe("203.0.113.7");
  });

  test("renders nothing (no placeholder, no error) when the IP can't be determined (D-07)", async ({
    page,
  }) => {
    await page.route("**/api/ip", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ip: null }),
      })
    );

    await page.goto("/");

    await expect(page.getByTestId("ip-badge")).toHaveCount(0);
  });

  test("a full-length IPv6 value stays fully visible and copyable at 320px (long-text backstop)", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.setViewportSize({ width: 320, height: 700 });

    const longIpv6 = "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
    await page.route("**/api/ip", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ip: longIpv6 }),
      })
    );

    await page.goto("/");

    const value = page.getByTestId("ip-badge-value");
    await expect(value).toHaveText(longIpv6);

    const hasHorizontalScroll = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );
    expect(hasHorizontalScroll).toBe(false);

    await page.getByTestId("ip-badge-copy").click();
    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText()
    );
    expect(clipboardText).toBe(longIpv6);
  });
});
