import { expect, test } from "@playwright/test";

/**
 * Live-verified-shape Cloudflare A response for cloudflare.com (DNS-01, D-10,
 * D-11): Status 0 (NOERROR), an Answer[] of type-1 (A) records with a TTL and
 * dotted-quad data values — mirrors 04-RESEARCH.md's documented live-curl
 * shape. Only exercised via `**\/cloudflare-dns.com/**` (the primary
 * resolver, per D-01); the fallback mock below is never hit by the
 * happy-path tests in this file (it only fires on a genuine primary
 * failure, which this spec never simulates).
 */
const CLOUDFLARE_A_RESPONSE = {
  Status: 0,
  Question: [{ name: "cloudflare.com", type: 1 }],
  Answer: [
    { name: "cloudflare.com", type: 1, TTL: 300, data: "104.16.132.229" },
    { name: "cloudflare.com", type: 1, TTL: 300, data: "104.16.133.229" },
  ],
};

/**
 * Fallback (Google) mock — only exercised by other tests (04-02+); present
 * here so `page.route` always has a deterministic response if anything ever
 * calls it, per Task 1's action spec.
 */
const GOOGLE_A_RESPONSE = {
  Status: 0,
  Question: [{ name: "cloudflare.com.", type: 1 }],
  Answer: [
    { name: "cloudflare.com.", type: 1, TTL: 300, data: "104.16.132.229" },
  ],
};

test.describe("DNS Lookup walking skeleton (DNS-01, DNS-06, DNS-07, DNS-09)", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/cloudflare-dns.com/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/dns-json",
        body: JSON.stringify(CLOUDFLARE_A_RESPONSE),
      })
    );
    await page.route("**/dns.google/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(GOOGLE_A_RESPONSE),
      })
    );
  });

  test("auto-resolves the demo domain on load", async ({ page }) => {
    await page.goto("/tools/dns");

    await expect(page.getByTestId("dns-domain-input")).toHaveValue(
      "cloudflare.com"
    );

    const recordValues = page.getByTestId("dns-record-value");
    await expect(recordValues.first()).toBeVisible();
    await expect(recordValues.first()).toHaveText("104.16.132.229");

    await expect(page.getByTestId("dns-resolver-badge")).toHaveText(
      "Primary resolver"
    );
    await expect(page.getByTestId("dns-duration")).toBeVisible();
  });

  test("copying a record value shows a visible + announced confirmation", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/tools/dns");

    const copyButton = page.getByTestId("dns-copy-record-0");
    await expect(copyButton).toBeVisible();
    await copyButton.click();

    // Icon+label change, not color alone (QUAL-05), plus an aria-live
    // announcement (QUAL-04) — mirrors ip-widget.spec's exact assertions.
    await expect(copyButton).toHaveAttribute("aria-label", "Copied!");
    await expect(page.getByTestId("dns-copy-record-0-status")).toHaveText(
      "Copied!"
    );

    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText()
    );
    expect(clipboardText).toBe("104.16.132.229");
  });
});
