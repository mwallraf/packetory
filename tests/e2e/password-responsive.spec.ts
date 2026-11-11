import { expect, test, type Page } from "@playwright/test";

const PATHS = [
  { name: "128-character hero", path: "/tools/password?len=128", batch: false },
  { name: "20 x 128 batch", path: "/tools/password?n=20&len=128", batch: true },
] as const;

/** Elements inside the island whose right edge passes the viewport. */
function offenders(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const limit = document.documentElement.clientWidth + 0.5;
    const root = document.querySelector('[data-testid="password-tool"]');
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
}

test.describe("Password Generator at 320px (UI E1-long-text, E1-overflow, E2 overflow)", () => {
  for (const scheme of ["light", "dark"] as const) {
    for (const { name, path, batch } of PATHS) {
      test(`${name} fits 320px in ${scheme}`, async ({ page, context }) => {
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);
        await page.emulateMedia({ colorScheme: scheme });
        await page.setViewportSize({ width: 320, height: 800 });
        await page.goto(path);
        await expect(page.getByTestId("password-tool")).toBeVisible();
        await expect(
          page.getByTestId(batch ? "password-batch" : "password-hero"),
        ).toBeVisible();

        const isDark = await page.evaluate(() =>
          document.documentElement.classList.contains("dark"),
        );
        expect(isDark).toBe(scheme === "dark");

        const noScroll = await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        );
        expect(noScroll, "page scrollWidth <= clientWidth").toBe(true);
        expect(await offenders(page), "elements past the viewport").toEqual([]);

        if (!batch) {
          const heroLength = await page
            .getByTestId("password-output")
            .evaluate((el) => (el.textContent ?? "").length);
          expect(heroLength).toBe(128);
          for (const id of ["password-copy", "password-regenerate"]) {
            const box = await page.getByTestId(id).boundingBox();
            expect(box, `${id} is rendered`).not.toBeNull();
            expect(
              (box?.x ?? 0) + (box?.width ?? 0),
              `${id} right edge`,
            ).toBeLessThanOrEqual(320);
          }
          return;
        }

        await expect(page.getByTestId("password-row")).toHaveCount(20);
        const rowEdges = await page
          .getByTestId("password-row-copy")
          .evaluateAll((els) =>
            els.map((el) => el.getBoundingClientRect().right),
          );
        expect(rowEdges).toHaveLength(20);
        const clientWidth = await page.evaluate(
          () => document.documentElement.clientWidth,
        );
        for (const right of rowEdges) {
          expect(right).toBeLessThanOrEqual(clientWidth);
        }

        const list = await page
          .getByTestId("password-batch-list")
          .evaluate((el) => ({
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
          }));
        expect(
          list.scrollHeight,
          "batch list is not an inner scroller",
        ).toBeLessThanOrEqual(list.clientHeight + 1);

        const firstCopy = page.getByTestId("password-row-copy").first();
        await firstCopy.click();
        await expect(firstCopy).toContainText("Copied!");
        expect(
          await offenders(page),
          "elements past the viewport after a row copy",
        ).toEqual([]);
      });
    }
  }
});
