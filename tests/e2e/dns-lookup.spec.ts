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

/**
 * QUAL-08's 5-state error matrix (D-04/D-05/D-06) + DNS-04's race-safety
 * guarantee, end-to-end. Each `test.describe` below overrides the default
 * `beforeEach` mocks (Playwright's most-recently-registered `page.route`
 * handler for an overlapping pattern runs first) with the specific scenario
 * it needs.
 */
test.describe("DNS Lookup error states (QUAL-08, DNS-08, D-05, D-06)", () => {
  test("NXDOMAIN renders its own card and is never conflated with empty-NOERROR", async ({
    page,
  }) => {
    await page.route("**/cloudflare-dns.com/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/dns-json",
        body: JSON.stringify({
          Status: 3,
          Question: [{ name: "does-not-exist.invalid", type: 1 }],
        }),
      })
    );

    await page.goto("/tools/dns?name=does-not-exist.invalid&type=A");

    await expect(page.getByTestId("dns-state-nxdomain")).toBeVisible();
    await expect(page.getByTestId("dns-state-nxdomain")).toContainText(
      "No such domain."
    );
    await expect(page.getByTestId("dns-state-nxdomain")).toContainText(
      "does-not-exist.invalid doesn't exist."
    );
    await expect(page.getByTestId("dns-state-empty-noerror")).toHaveCount(0);
  });

  test("empty-NOERROR renders its own card and is never conflated with NXDOMAIN", async ({
    page,
  }) => {
    await page.route("**/cloudflare-dns.com/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/dns-json",
        body: JSON.stringify({
          Status: 0,
          Question: [{ name: "cloudflare.com", type: 16 }],
          Answer: [],
        }),
      })
    );

    await page.goto("/tools/dns?name=cloudflare.com&type=TXT");

    await expect(page.getByTestId("dns-state-empty-noerror")).toBeVisible();
    await expect(page.getByTestId("dns-state-empty-noerror")).toContainText(
      "No TXT records."
    );
    await expect(page.getByTestId("dns-state-empty-noerror")).toContainText(
      "cloudflare.com exists but has none of this type."
    );
    await expect(page.getByTestId("dns-state-nxdomain")).toHaveCount(0);
  });

  test("resolver-unavailable renders with a working inline Try-again button (D-06)", async ({
    page,
  }) => {
    await page.route("**/cloudflare-dns.com/**", (route) =>
      route.fulfill({ status: 503, contentType: "text/plain", body: "down" })
    );
    await page.route("**/dns.google/**", (route) =>
      route.fulfill({ status: 503, contentType: "text/plain", body: "down" })
    );

    await page.goto("/tools/dns");

    await expect(
      page.getByTestId("dns-state-resolver-unavailable")
    ).toBeVisible();
    await expect(
      page.getByTestId("dns-state-resolver-unavailable")
    ).toContainText("Resolvers unreachable.");

    // Reconfigure the primary resolver to succeed, then exercise the card's
    // own Try-again button (D-06) — not the page's general Refresh control.
    await page.route("**/cloudflare-dns.com/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/dns-json",
        body: JSON.stringify(CLOUDFLARE_A_RESPONSE),
      })
    );

    await page.getByTestId("dns-try-again").click();

    await expect(page.getByTestId("dns-record-list")).toBeVisible();
    await expect(page.getByTestId("dns-record-value").first()).toHaveText(
      "104.16.132.229"
    );
  });
});

test.describe("DNS Lookup bookmarkable URL state (DNS-10)", () => {
  test("loading a ?name=&type= URL in a fresh context reproduces the exact lookup (MX)", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.route("**/cloudflare-dns.com/**", (route) => {
      const url = new URL(route.request().url());
      expect(url.searchParams.get("name")).toBe("example.com");
      expect(url.searchParams.get("type")).toBe("MX");
      return route.fulfill({
        status: 200,
        contentType: "application/dns-json",
        body: JSON.stringify({
          Status: 0,
          Question: [{ name: "example.com", type: 15 }],
          Answer: [
            {
              name: "example.com",
              type: 15,
              TTL: 300,
              data: "10 mail.example.com.",
            },
          ],
        }),
      });
    });

    await page.goto("/tools/dns?name=example.com&type=MX");

    await expect(page.getByTestId("dns-domain-input")).toHaveValue(
      "example.com"
    );
    await expect(page.getByTestId("dns-record-type-MX")).toHaveAttribute(
      "data-state",
      "on"
    );
    await expect(page.getByTestId("dns-mx-priority")).toContainText("10");
    await expect(page.getByTestId("dns-mx-exchange")).toContainText(
      "mail.example.com"
    );

    await context.close();
  });
});

test.describe("DNS Lookup race safety (DNS-04)", () => {
  test("the final-typed domain's result always wins, even when an earlier, slower request resolves later", async ({
    page,
  }) => {
    const SLOW_DOMAIN = "slow-lookup-example.com";
    const FAST_DOMAIN = "fast-lookup-example.net";

    await page.route("**/cloudflare-dns.com/**", async (route) => {
      const url = new URL(route.request().url());
      const name = url.searchParams.get("name");

      if (name === SLOW_DOMAIN) {
        // Artificial delay — this response arrives AFTER the fast one below,
        // even though it was requested first (the exact out-of-order
        // scenario DNS-04 must guard against).
        await new Promise((resolve) => setTimeout(resolve, 600));
        return route.fulfill({
          status: 200,
          contentType: "application/dns-json",
          body: JSON.stringify({
            Status: 0,
            Answer: [{ name: SLOW_DOMAIN, type: 1, TTL: 300, data: "9.9.9.9" }],
          }),
        });
      }
      if (name === FAST_DOMAIN) {
        return route.fulfill({
          status: 200,
          contentType: "application/dns-json",
          body: JSON.stringify({
            Status: 0,
            Answer: [
              { name: FAST_DOMAIN, type: 1, TTL: 300, data: "8.8.4.4" },
            ],
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/dns-json",
        body: JSON.stringify(CLOUDFLARE_A_RESPONSE),
      });
    });

    await page.goto("/tools/dns");
    await expect(page.getByTestId("dns-record-value").first()).toBeVisible();

    const input = page.getByTestId("dns-domain-input");

    // Both triggers are immediate (Enter bypasses the debounce, DNS-03),
    // fired close together so the slow request is still in flight when the
    // fast one starts. A tiny settle gap after each keypress lets React
    // commit the triggered state update before the next input action, so
    // both requests are provably in flight (not just the second).
    await input.fill(SLOW_DOMAIN);
    await input.press("Enter");
    await page.waitForTimeout(100);
    await input.fill(FAST_DOMAIN);
    await input.press("Enter");

    await expect(page.getByTestId("dns-record-value").first()).toHaveText(
      "8.8.4.4"
    );
    await expect(page.getByTestId("dns-record-value")).toHaveCount(1);

    // Give the slow response time to arrive and confirm it never overwrites
    // the newer, already-rendered result.
    await page.waitForTimeout(800);
    await expect(page.getByTestId("dns-record-value").first()).toHaveText(
      "8.8.4.4"
    );
    await expect(page.getByTestId("dns-record-value")).toHaveCount(1);
  });

  test("a valid typed edit cancels an already-in-flight debounced lookup so its stale response never renders (DNS-04)", async ({
    page,
  }) => {
    const SLOW_DEBOUNCE_DOMAIN = "slow-debounce-example.com";
    const SECOND_DEBOUNCE_DOMAIN = "second-debounce-example.net";

    await page.route("**/cloudflare-dns.com/**", async (route) => {
      const url = new URL(route.request().url());
      const name = url.searchParams.get("name");

      if (name === SLOW_DEBOUNCE_DOMAIN) {
        // Artificial delay — this fetch is still in flight when the user
        // types a different valid domain below (the exact CR-01 sub-case
        // that the invalid-branch-only fix left unguarded).
        await new Promise((resolve) => setTimeout(resolve, 400));
        return route.fulfill({
          status: 200,
          contentType: "application/dns-json",
          body: JSON.stringify({
            Status: 0,
            Answer: [
              { name: SLOW_DEBOUNCE_DOMAIN, type: 1, TTL: 300, data: "9.9.9.9" },
            ],
          }),
        });
      }
      if (name === SECOND_DEBOUNCE_DOMAIN) {
        return route.fulfill({
          status: 200,
          contentType: "application/dns-json",
          body: JSON.stringify({
            Status: 0,
            Answer: [
              {
                name: SECOND_DEBOUNCE_DOMAIN,
                type: 1,
                TTL: 300,
                data: "8.8.4.4",
              },
            ],
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/dns-json",
        body: JSON.stringify(CLOUDFLARE_A_RESPONSE),
      });
    });

    await page.goto("/tools/dns");
    await expect(page.getByTestId("dns-record-value").first()).toBeVisible();

    const input = page.getByTestId("dns-domain-input");

    // A single typed edit — the valid branch of handleDomainChange — which
    // schedules the 700ms debounce (DEBOUNCE_MS). This is the TYPED/DEBOUNCE
    // path, not the Enter/immediate path exercised by the test above.
    await input.fill(SLOW_DEBOUNCE_DOMAIN);

    // The debounce has now fired and dispatched the slow fetch, which is
    // in flight (it will not fulfill for another ~400ms).
    await page.waitForTimeout(750);

    // A different valid domain typed while the slow fetch is still in
    // flight. With the Task-1 fix this calls cancelInFlightLookup() —
    // aborting the slow request and bumping the sequence token — before
    // arming the second domain's own debounce.
    await input.fill(SECOND_DEBOUNCE_DOMAIN);

    // This window is past the point at which the slow fetch would have
    // resolved, but BEFORE the second domain's own debounce (700ms from its
    // fill above) has had a chance to fire and resolve — on the pre-fix code
    // the stale 9.9.9.9 would already be rendered here.
    await page.waitForTimeout(500);

    // A non-retrying instantaneous sample is required here, NOT an
    // auto-retrying `expect(locator).toHaveCount(0)`. Playwright's
    // auto-retrying assertions poll for up to their timeout (default 5s) —
    // long enough for the second domain's own (later, faster) fetch to
    // resolve and silently replace a transient stale 9.9.9.9 render with
    // 8.8.4.4, which would make the assertion pass even on the pre-fix,
    // buggy code (the transient stale render would never be observed).
    // Sampling the count once, synchronously, at this exact checkpoint
    // catches the bug regardless of what happens afterward.
    const staleCountAtCheckpoint = await page
      .getByTestId("dns-record-value")
      .filter({ hasText: "9.9.9.9" })
      .count();
    expect(staleCountAtCheckpoint).toBe(0);

    // The second domain's own debounce eventually fires and its fast fetch
    // resolves, ultimately winning.
    await expect(page.getByTestId("dns-record-value").first()).toHaveText(
      "8.8.4.4"
    );
    await expect(page.getByTestId("dns-record-value")).toHaveCount(1);

    await expect(
      page.getByTestId("dns-record-value").filter({ hasText: "9.9.9.9" })
    ).toHaveCount(0);
  });
});

test.describe("DNS Lookup long-value overflow at 320px (backstop)", () => {
  test("a long TXT record wraps without forcing horizontal page scroll", async ({
    page,
  }) => {
    const LONG_TXT =
      "v=spf1 include:_spf.example.com include:_spf.google.com include:sendgrid.net include:mailgun.org ip4:203.0.113.0/24 ip4:198.51.100.0/24 -all";

    await page.route("**/cloudflare-dns.com/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/dns-json",
        body: JSON.stringify({
          Status: 0,
          Question: [{ name: "cloudflare.com", type: 16 }],
          Answer: [
            {
              name: "cloudflare.com",
              type: 16,
              TTL: 300,
              data: `"${LONG_TXT}"`,
            },
          ],
        }),
      })
    );

    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/tools/dns?name=cloudflare.com&type=TXT");

    await expect(page.getByTestId("dns-record-value")).toHaveText(LONG_TXT);

    const hasHorizontalScroll = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );
    expect(hasHorizontalScroll).toBe(false);
  });
});
