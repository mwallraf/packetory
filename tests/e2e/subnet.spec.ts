import { expect, test } from "@playwright/test";

test.describe("IP Subnet Calculator (SUBNET-01, SUBNET-02, SUBNET-04)", () => {
  test("loads the D-02 default IPv4 breakdown immediately with zero input", async ({
    page,
  }) => {
    await page.goto("/tools/subnet");

    const networkValue = page.getByTestId("subnet-field-network-value");
    await expect(networkValue).toBeVisible();
    await expect(networkValue).toHaveText("192.168.1.0");

    await expect(page.getByTestId("subnet-field-broadcast-value")).toHaveText(
      "192.168.1.255"
    );
  });

  test("copying a field shows a visible + announced confirmation (SUBNET-06)", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/tools/subnet");

    await page.getByTestId("subnet-copy-network").click();

    await expect(page.getByTestId("subnet-copy-network-status")).toHaveText(
      "Copied!"
    );

    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText()
    );
    expect(clipboardText).toBe("192.168.1.0");
  });

  test("typing an invalid CIDR shows inline validation with no reload/popup, keeping the last valid grid (SUBNET-03)", async ({
    page,
  }) => {
    await page.goto("/tools/subnet");

    const input = page.getByTestId("subnet-cidr-input");
    await input.fill("not-a-cidr");

    await expect(page.getByTestId("subnet-validation-note")).toBeVisible();
    await expect(
      page.getByTestId("subnet-field-network-value")
    ).toHaveText("192.168.1.0");
  });
});

test.describe("IP Subnet Calculator IPv6 (SUBNET-01, SUBNET-05)", () => {
  test("loading an IPv6 ?cidr= URL renders the IPv6 grid and hides the IPv4-only rows", async ({
    page,
  }) => {
    await page.goto("/tools/subnet?cidr=2001%3Adb8%3A%3A%2F32");

    await expect(page.getByTestId("subnet-ipv6-grid")).toBeVisible();
    await expect(
      page.getByTestId("subnet-field-compressed-value")
    ).toHaveText("2001:db8::");
    await expect(page.getByTestId("subnet-family-badge")).toHaveText("IPv6");

    await expect(page.getByTestId("subnet-ipv4-grid")).toHaveCount(0);
  });
});

test.describe("IP Subnet Calculator bookmarkable URL state (SUBNET-07)", () => {
  test("loading a ?cidr= URL in a fresh context reproduces the exact result (bookmark round-trip)", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/tools/subnet?cidr=10.20.0.0%2F20");

    await expect(page.getByTestId("subnet-field-network-value")).toHaveText(
      "10.20.0.0"
    );

    await context.close();
  });

  test("editing the CIDR updates the URL so reload reproduces the same result", async ({
    page,
  }) => {
    await page.goto("/tools/subnet");

    const input = page.getByTestId("subnet-cidr-input");
    await input.fill("172.16.0.0/16");

    await expect(page).toHaveURL(/cidr=172\.16\.0\.0%2F16/);

    await page.reload();
    await expect(page.getByTestId("subnet-field-network-value")).toHaveText(
      "172.16.0.0"
    );
  });
});
