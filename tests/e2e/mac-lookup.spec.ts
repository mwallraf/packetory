import { expect, test } from "@playwright/test";

/**
 * MAC Address Inspector walking-skeleton happy path (MAC-01, MAC-02,
 * MAC-04..MAC-08, MAC-09, D-06, D-07, D-08, D-09, D-10) — mirrors
 * `tests/e2e/dns-lookup.spec.ts`'s shape. The two `describe` blocks below
 * (walking skeleton + 320px layout) deliberately never mock
 * `/api/mac-vendor` — parse/format/classify are pure, synchronous,
 * framework-agnostic functions with zero network dependency, so this is
 * itself the MAC-08 proof: bit-level classification renders correctly with
 * zero `/api/mac-vendor` involvement, real or mocked.
 *
 * 05-03 adds a third `describe` block below (vendor lookup, MAC-03/MAC-08/
 * MAC-10/D-11/D-12) that DOES mock `/api/mac-vendor` via `page.route`,
 * mirroring `tests/e2e/ip-widget.spec.ts`'s mocking pattern, to prove the
 * success/unavailable/not-applicable vendor states end to end.
 */
test.describe("MAC Address Inspector walking skeleton (MAC-01, MAC-02, D-06)", () => {
  test("auto-normalizes the demo MAC into all 4 formats on load, no typing required", async ({
    page,
  }) => {
    await page.goto("/tools/mac");

    await expect(page.getByTestId("mac-input")).toHaveValue(
      "3C:22:FB:AA:BB:CC"
    );

    await expect(page.getByTestId("mac-format-colon-value")).toHaveText(
      "3C:22:FB:AA:BB:CC"
    );
    await expect(page.getByTestId("mac-format-dash-value")).toHaveText(
      "3C-22-FB-AA-BB-CC"
    );
    await expect(page.getByTestId("mac-format-dot-value")).toHaveText(
      "3C22.FBAA.BBCC"
    );
    await expect(page.getByTestId("mac-format-none-value")).toHaveText(
      "3C22FBAABBCC"
    );
  });

  test("retyping in a different separator style updates all 4 variants live (MAC-01, MAC-02)", async ({
    page,
  }) => {
    await page.goto("/tools/mac");
    await expect(page.getByTestId("mac-format-colon-value")).toBeVisible();

    const input = page.getByTestId("mac-input");
    await input.fill("001A2B3C4D5E");

    await expect(page.getByTestId("mac-format-colon-value")).toHaveText(
      "00:1A:2B:3C:4D:5E"
    );
    await expect(page.getByTestId("mac-format-dash-value")).toHaveText(
      "00-1A-2B-3C-4D-5E"
    );
    await expect(page.getByTestId("mac-format-dot-value")).toHaveText(
      "001A.2B3C.4D5E"
    );
    await expect(page.getByTestId("mac-format-none-value")).toHaveText(
      "001A2B3C4D5E"
    );
  });

  test("copying a format row shows a visible confirmation (MAC-09)", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/tools/mac");

    const copyButton = page.getByTestId("mac-format-colon-copy");
    await expect(copyButton).toBeVisible();
    await copyButton.click();

    // Icon+label change, not color alone, plus an aria-live announcement.
    await expect(copyButton).toHaveAttribute("aria-label", "Copied!");
    await expect(page.getByTestId("mac-format-colon-status")).toHaveText(
      "Copied!"
    );

    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText()
    );
    expect(clipboardText).toBe("3C:22:FB:AA:BB:CC");
  });

  test("an incomplete MAC shows the D-07 neutral note while the last valid result stays visible", async ({
    page,
  }) => {
    await page.goto("/tools/mac");
    await expect(page.getByTestId("mac-format-colon-value")).toBeVisible();

    const input = page.getByTestId("mac-input");
    await input.fill("00:1A");

    await expect(page.getByTestId("mac-state-incomplete")).toContainText(
      "Keep typing — enter all 12 hex digits (e.g. 00:1A:2B:3C:4D:5E)."
    );
    // Last valid result (the demo MAC) is still rendered, at reduced
    // opacity — never blanked (D-07).
    await expect(page.getByTestId("mac-format-colon-value")).toHaveText(
      "3C:22:FB:AA:BB:CC"
    );
    await expect(page.getByTestId("mac-result-panel")).toHaveClass(
      /opacity-50/
    );
  });

  test("classification (OUI, U/L, I/G) renders on load with zero vendor network dependency (MAC-04, MAC-05, MAC-06, MAC-08)", async ({
    page,
  }) => {
    await page.goto("/tools/mac");

    await expect(page.getByTestId("mac-oui-value")).toHaveText("3C22FB");

    const ulBadge = page.getByTestId("mac-badge-ul");
    await expect(ulBadge).toContainText("Universally Administered");
    await expect(ulBadge).toContainText(
      "Assigned by the IEEE to a specific vendor."
    );

    const igBadge = page.getByTestId("mac-badge-ig");
    await expect(igBadge).toContainText("Unicast");
    await expect(igBadge).toContainText("Addressed to a single device.");

    // No randomization badge for the universally-administered demo MAC, and
    // no /api/mac-vendor route was mocked anywhere in this test — proving
    // classification is fully independent of the vendor lookup (MAC-08).
    await expect(page.getByTestId("mac-badge-randomization")).toHaveCount(0);
  });

  test("a locally-administered MAC shows the exact D-09 randomization-hedge badge (MAC-07)", async ({
    page,
  }) => {
    await page.goto("/tools/mac");
    await expect(page.getByTestId("mac-format-colon-value")).toBeVisible();

    const input = page.getByTestId("mac-input");
    await input.fill("02:00:00:00:00:00");

    await expect(page.getByTestId("mac-badge-ul")).toContainText(
      "Locally Administered"
    );

    const randomizationBadge = page.getByTestId("mac-badge-randomization");
    await expect(randomizationBadge).toContainText(
      "Likely randomized (privacy MAC)."
    );
    await expect(randomizationBadge).toContainText(
      "This address has the locally-administered bit set, a pattern used by iOS/Android/Windows MAC randomization — it may not reflect the device's real hardware vendor."
    );
  });

  test("a multicast MAC (01:00:5E) shows a Multicast badge and NO randomization badge — the flag tracks U/L, not I/G (D-10)", async ({
    page,
  }) => {
    await page.goto("/tools/mac");
    await expect(page.getByTestId("mac-format-colon-value")).toBeVisible();

    const input = page.getByTestId("mac-input");
    await input.fill("01:00:5E:00:00:00");

    await expect(page.getByTestId("mac-badge-ig")).toContainText("Multicast");
    await expect(page.getByTestId("mac-badge-ul")).toContainText(
      "Universally Administered"
    );
    await expect(page.getByTestId("mac-badge-randomization")).toHaveCount(0);
  });

  test("a valid MAC always renders exactly 4 format rows and 2-3 classification badges (fixed cardinality)", async ({
    page,
  }) => {
    await page.goto("/tools/mac");

    const formatRows = page.locator(
      '[data-testid^="mac-format-"][data-testid$="-value"]'
    );
    await expect(formatRows).toHaveCount(4);

    const badges = page.locator(
      '[data-testid^="mac-badge-"][data-testid$="-pill"]'
    );
    // Demo MAC is universally-administered + unicast: U/L + I/G only.
    await expect(badges).toHaveCount(2);

    const input = page.getByTestId("mac-input");
    await input.fill("02:00:00:00:00:00");
    // Locally-administered: U/L + I/G + the randomization-hedge badge.
    await expect(badges).toHaveCount(3);
  });
});

test.describe("MAC Address Inspector layout at 320px (backstop)", () => {
  test("format rows wrap without forcing horizontal page scroll", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/tools/mac");

    await expect(page.getByTestId("mac-format-colon-value")).toBeVisible();

    const hasHorizontalScroll = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );
    expect(hasHorizontalScroll).toBe(false);
  });

  test("classification badge row (U/L + I/G + randomization) wraps without forcing horizontal page scroll", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/tools/mac");

    const input = page.getByTestId("mac-input");
    // 3-badge case is the widest content this row ever renders.
    await input.fill("02:00:00:00:00:00");
    await expect(page.getByTestId("mac-badge-randomization")).toBeVisible();

    const hasHorizontalScroll = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );
    expect(hasHorizontalScroll).toBe(false);
  });
});

/**
 * Vendor lookup (MAC-03, MAC-08, MAC-10, D-11, D-12) — mirrors
 * `tests/e2e/ip-widget.spec.ts`'s `page.route("**\/api/mac-vendor", ...)`
 * mocking pattern. Every test here explicitly mocks the route, unlike the
 * two `describe` blocks above.
 */
test.describe("MAC Address Inspector vendor lookup (MAC-03, MAC-08, MAC-10, D-11, D-12)", () => {
  test("a successful vendor lookup shows the company name (MAC-03)", async ({
    page,
  }) => {
    await page.route("**/api/mac-vendor**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "ok",
          found: true,
          company: "Apple, Inc.",
        }),
      })
    );

    await page.goto("/tools/mac");

    await expect(page.getByTestId("mac-vendor-value")).toContainText(
      "Apple, Inc."
    );
  });

  test("vendor lookup unavailable shows the neutral D-11 note while formats/OUI/classification badges still fully render (MAC-08)", async ({
    page,
  }) => {
    await page.route("**/api/mac-vendor**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "unavailable" }),
      })
    );

    await page.goto("/tools/mac");

    await expect(page.getByTestId("mac-vendor-value")).toHaveText(
      "Vendor: lookup unavailable."
    );
    // The rest of the panel is unaffected — never blocked, never dimmed
    // because of a vendor failure (MAC-08's isolation guarantee).
    await expect(page.getByTestId("mac-format-colon-value")).toHaveText(
      "3C:22:FB:AA:BB:CC"
    );
    await expect(page.getByTestId("mac-format-dash-value")).toHaveText(
      "3C-22-FB-AA-BB-CC"
    );
    await expect(page.getByTestId("mac-format-dot-value")).toHaveText(
      "3C22.FBAA.BBCC"
    );
    await expect(page.getByTestId("mac-format-none-value")).toHaveText(
      "3C22FBAABBCC"
    );
    await expect(page.getByTestId("mac-oui-value")).toHaveText("3C22FB");
    await expect(page.getByTestId("mac-badge-ul")).toContainText(
      "Universally Administered"
    );
    await expect(page.getByTestId("mac-badge-ig")).toContainText("Unicast");
  });

  test("a genuine registry miss shows 'Not found in OUI registry.' — distinct from lookup unavailable (05-RESEARCH.md Pitfall 3)", async ({
    page,
  }) => {
    await page.route("**/api/mac-vendor**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok", found: false, company: null }),
      })
    );

    await page.goto("/tools/mac");

    await expect(page.getByTestId("mac-vendor-value")).toHaveText(
      "Not found in OUI registry."
    );
  });

  test("a locally-administered MAC shows the D-12 not-applicable note and makes ZERO /api/mac-vendor requests for it", async ({
    page,
  }) => {
    let vendorRequestCount = 0;
    await page.route("**/api/mac-vendor**", (route) => {
      vendorRequestCount++;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "ok",
          found: true,
          company: "Should never be requested for a randomized address",
        }),
      });
    });

    await page.goto("/tools/mac");
    // The demo MAC (universally-administered) legitimately triggers one
    // mount-on-load request — reset the counter so the assertion below is
    // scoped to ONLY the subsequent locally-administered edit (D-12).
    await expect(page.getByTestId("mac-vendor-value")).not.toContainText(
      "Looking up vendor"
    );
    vendorRequestCount = 0;

    const input = page.getByTestId("mac-input");
    await input.fill("02:00:00:00:00:00");

    await expect(page.getByTestId("mac-vendor-value")).toHaveText(
      "Vendor: not applicable (randomized address)."
    );
    // Give the D-03 debounce window (500ms) time to elapse, confirming no
    // delayed request either — the skip is structural (D-12), not a race.
    await page.waitForTimeout(700);
    expect(vendorRequestCount).toBe(0);
  });

  test("a very long vendor company name (40+ chars) wraps rather than clips at 320px alongside the OUI prefix (overflow backstop)", async ({
    page,
  }) => {
    const longCompanyName =
      "A Very Long Organization Name That Exceeds Forty Characters, Incorporated";
    await page.route("**/api/mac-vendor**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "ok",
          found: true,
          company: longCompanyName,
        }),
      })
    );

    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/tools/mac");

    await expect(page.getByTestId("mac-vendor-value")).toContainText(
      longCompanyName
    );

    const hasHorizontalScroll = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );
    expect(hasHorizontalScroll).toBe(false);
  });
});
