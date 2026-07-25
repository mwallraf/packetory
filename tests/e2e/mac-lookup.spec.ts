import { expect, test } from "@playwright/test";

/**
 * MAC Address Inspector walking-skeleton happy path (MAC-01, MAC-02,
 * MAC-09, D-06, D-07) — mirrors `tests/e2e/dns-lookup.spec.ts`'s shape.
 * Nothing in this plan touches the network (parse/format are pure,
 * synchronous, framework-agnostic functions; vendor lookup ships in
 * 05-03) — no `page.route` mocking is needed here.
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
});
