import { expect, test } from "@playwright/test";

test.describe("UUID Generator (UUID-01, UUID-06)", () => {
  test("loads a v4 UUID immediately", async ({ page }) => {
    await page.goto("/tools/uuid");

    const heroValue = page.getByTestId("uuid-hero-value");
    await expect(heroValue).toBeVisible();
    await expect(heroValue).toHaveText(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  test("copies the hero value with a visible + announced confirmation", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/tools/uuid");

    const copyButton = page.getByTestId("uuid-copy");
    await copyButton.click();

    await expect(page.getByTestId("uuid-copy-status")).toHaveText("Copied!");

    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText()
    );
    expect(clipboardText.length).toBeGreaterThan(0);
  });
});

test.describe("UUID Generator controls (UUID-02, UUID-03, UUID-04)", () => {
  test("switches to v7 and regenerates a fresh, structurally different value", async ({
    page,
  }) => {
    await page.goto("/tools/uuid");

    const heroValue = page.getByTestId("uuid-hero-value");
    const v4Value = await heroValue.textContent();

    await page.getByTestId("uuid-version-v7").click();

    await expect(async () => {
      const v7Value = await heroValue.textContent();
      expect(v7Value).not.toBe(v4Value);
      // Canonical 8-4-4-4-12 form: the version nibble is the first char of
      // the third group, at string index 14.
      expect(v7Value?.charAt(14)).toBe("7");
    }).toPass();
  });

  test("generates a batch of N and scrolls a 100-row batch without page horizontal scroll", async ({
    page,
  }) => {
    await page.goto("/tools/uuid");

    const countInput = page.getByTestId("uuid-batch-count");
    await countInput.fill("5");
    await expect(page.getByTestId("uuid-batch-row")).toHaveCount(5);

    await countInput.fill("100");
    await expect(page.getByTestId("uuid-batch-row")).toHaveCount(100);

    const hasHorizontalScroll = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );
    expect(hasHorizontalScroll).toBe(false);
  });

  test("out-of-range batch count shows the inline hint and keeps the last valid batch", async ({
    page,
  }) => {
    await page.goto("/tools/uuid");

    const countInput = page.getByTestId("uuid-batch-count");
    await countInput.fill("5");
    await expect(page.getByTestId("uuid-batch-row")).toHaveCount(5);

    await countInput.fill("101");
    await expect(page.getByTestId("uuid-batch-count-hint")).toHaveText(
      "Enter a number between 1 and 100"
    );
    // Generation stays clamped to the last valid value — never blocked.
    await expect(page.getByTestId("uuid-batch-row")).toHaveCount(5);
  });

  test("regenerate produces a new value", async ({ page }) => {
    await page.goto("/tools/uuid");

    const heroValue = page.getByTestId("uuid-hero-value");
    const before = await heroValue.textContent();

    await page.getByTestId("uuid-regenerate").click();

    await expect(async () => {
      const after = await heroValue.textContent();
      expect(after).not.toBe(before);
    }).toPass();
  });

  test("case/hyphen toggles reformat in place without regenerating (D-02 round trip)", async ({
    page,
  }) => {
    await page.goto("/tools/uuid");

    const heroValue = page.getByTestId("uuid-hero-value");
    const original = await heroValue.textContent();

    await page.getByTestId("uuid-hyphens-switch").click();
    await expect(heroValue).not.toHaveText(original ?? "");

    await page.getByTestId("uuid-hyphens-switch").click();
    await expect(heroValue).toHaveText(original ?? "");
  });

  test("/ focuses the batch-count input", async ({ page }) => {
    await page.goto("/tools/uuid");

    // The interactive island mounts via a next/dynamic(ssr:false) boundary
    // and attaches its keydown listener from an effect after mount — wait
    // for the control to be visible first so the shortcut isn't raced
    // against hydration (flaky under parallel/CPU-contended test runs).
    await expect(page.getByTestId("uuid-batch-count")).toBeVisible();

    await page.keyboard.press("/");

    await expect(page.getByTestId("uuid-batch-count")).toBeFocused();
  });

  test("hero value wraps without horizontal scroll at 320px, hyphens on and off", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/tools/uuid");

    const noHorizontalScroll = () =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth
      );

    expect(await noHorizontalScroll()).toBe(true);

    await page.getByTestId("uuid-hyphens-switch").click();
    expect(await noHorizontalScroll()).toBe(true);
  });

  test("a full 100-row batch scrolls within its container at 320px without page horizontal scroll", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/tools/uuid");

    await page.getByTestId("uuid-batch-count").fill("100");
    await expect(page.getByTestId("uuid-batch-row")).toHaveCount(100);

    const hasHorizontalScroll = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );
    expect(hasHorizontalScroll).toBe(false);
  });
});
