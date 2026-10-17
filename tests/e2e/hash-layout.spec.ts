import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Pinned skeleton heights live in HashToolLoader.tsx as
 * `h-[N1px] sm:h-[N2px]`. Reading them from the source (rather than
 * duplicating constants here) means a guessed or stale pin fails the gate
 * (T-09-27).
 */
function readPinnedHeights(): { base: number; sm: number } {
  const source = readFileSync(
    path.join(process.cwd(), "app/tools/hash/HashToolLoader.tsx"),
    "utf8",
  );
  const match = source.match(/h-\[(\d+)px\] sm:h-\[(\d+)px\]/);
  if (!match) {
    throw new Error("HashToolLoader.tsx has no `h-[Npx] sm:h-[Npx]` skeleton");
  }
  return { base: Number(match[1]), sm: Number(match[2]) };
}

test.describe("Hash Generator layout (TEXT-01, no CLS)", () => {
  test("skeleton heights match the settled island (TEXT-01, no CLS)", async ({
    page,
  }) => {
    const { base, sm } = readPinnedHeights();
    expect(base % 4, "base skeleton height is a multiple of 4").toBe(0);
    expect(sm % 4, "sm skeleton height is a multiple of 4").toBe(0);

    for (const [width, pinned] of [
      [320, base],
      [1280, sm],
    ] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/tools/hash");
      const island = page.getByTestId("hash-tool");
      await expect(island).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const box = await island.boundingBox();
      if (!box) throw new Error("hash-tool has no bounding box");
      expect(
        Math.abs(box.height - pinned),
        `island ${box.height}px vs skeleton ${pinned}px at ${width}px wide`,
      ).toBeLessThanOrEqual(4);
    }
  });

  test("layout shift stays below 0.01 (TEXT-01)", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          };
          if (!shift.hadRecentInput) w.__cls += shift.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });

    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/tools/hash");
      await expect(page.getByTestId("hash-tool")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);

      // Wait until the running total has been stable for 500 ms.
      let last = -1;
      let stableSince = Date.now();
      const deadline = Date.now() + 10_000;
      let cls = 0;
      while (Date.now() < deadline) {
        cls = await page.evaluate(
          () => (window as unknown as { __cls: number }).__cls,
        );
        if (cls !== last) {
          last = cls;
          stableSince = Date.now();
        } else if (Date.now() - stableSince >= 500) {
          break;
        }
        await page.waitForTimeout(100);
      }
      expect(cls, `CLS at ${width}px wide`).toBeLessThan(0.01);
    }
  });
});

test.describe("Hash Generator at 320px (INT-03)", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`no horizontal scroll at 320px in ${scheme} (INT-03)`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto("/tools/hash");
      await expect(page.getByTestId("hash-tool")).toBeVisible();

      const isDark = await page.evaluate(() =>
        document.documentElement.classList.contains("dark"),
      );
      expect(isDark).toBe(scheme === "dark");

      await page.getByTestId("hash-encoding-base64").click();
      await page.getByTestId("hash-verify").fill("0d4a1185");
      await expect(page.getByTestId("hash-row-crc32-match")).toBeVisible();

      const noScroll = await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      );
      expect(noScroll, "page scrollWidth <= clientWidth").toBe(true);

      const offenders = await page.evaluate(() => {
        const limit = document.documentElement.clientWidth + 0.5;
        const root = document.querySelector('[data-testid="hash-tool"]');
        const out: string[] = [];
        root?.querySelectorAll("*").forEach((el) => {
          const right = el.getBoundingClientRect().right;
          if (right > limit) {
            out.push(
              `${el.getAttribute("data-testid") ?? el.tagName.toLowerCase()} right=${right}`,
            );
          }
        });
        return out;
      });
      expect(offenders, "elements extending past the viewport").toEqual([]);

      await page.getByTestId("hash-encoding-hex").click();
      for (const id of ["sha512", "sha3-512"]) {
        const box = await page
          .getByTestId(`hash-row-${id}-value`)
          .boundingBox();
        expect(box?.height ?? 0, `${id} wraps onto several lines`).toBeGreaterThan(
          48,
        );
      }
    });
  }
});
