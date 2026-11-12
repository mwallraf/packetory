import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * Layout gates for the Password tool (PREG-03, D-16, D-17). The skeleton pin
 * is read from PasswordToolLoader.tsx, anchored on the password-skeleton
 * element (the skeleton also holds several inner height classes), so a stale
 * or guessed pin fails the gate.
 */
function readSource(file: string): string {
  return readFileSync(path.join(process.cwd(), file), "utf8");
}

/**
 * Reads the whole `h-[Npx] min-[Wpx]:h-[Npx] ...` ladder off the skeleton and
 * returns the pinned height for a viewport width (the last step whose
 * `min-[Wpx]` is at or below the width).
 */
function pinnedHeightAt(width: number): number {
  const source = readSource("app/tools/password/PasswordToolLoader.tsx");
  const anchor = source.indexOf('data-testid="password-skeleton"');
  if (anchor < 0) throw new Error("no password-skeleton element in the loader");
  const classAt = source.slice(anchor).match(/className="([^"]*)"/);
  if (!classAt) throw new Error("password-skeleton has no className");
  const tokens = classAt[1]!.split(/\s+/);
  const base = tokens
    .map((t) => t.match(/^h-\[(\d+)px\]$/))
    .find((m) => m !== null);
  if (!base) throw new Error("password-skeleton has no base `h-[Npx]` pin");
  const steps = tokens
    .map((t) => t.match(/^min-\[(\d+)px\]:h-\[(\d+)px\]$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ min: Number(m[1]), height: Number(m[2]) }));
  const mins = steps.map((s) => s.min);
  if (mins.some((m, i) => i > 0 && m <= mins[i - 1]!)) {
    throw new Error("password-skeleton min-[Npx] pins are not ascending");
  }
  let pinned = Number(base[1]);
  for (const step of steps) if (width >= step.min) pinned = step.height;
  return pinned;
}

async function installClsObserver(page: Page) {
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
}

/** Waits until the running CLS total has been stable for 500 ms. */
async function settledCls(page: Page): Promise<number> {
  await page.evaluate(() => document.fonts.ready);
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
  return cls;
}

test.describe("Password layout (PREG-03, D-16, D-17)", () => {
  test("the skeleton pin has a 44px mode row and no duplicate hero class", () => {
    const source = readSource("app/tools/password/PasswordToolLoader.tsx");
    expect(source.match(/h-11 w-56/g)?.length).toBe(1);
    expect(source).not.toMatch(/h-\[(\d+)px\] sm:h-\[\1px\] animate-pulse/);
  });

  // 320 is the floor, 375/412 the common phones (412 is the Lighthouse mobile
  // default), 640 and 768 the tablet bands, 1024/1280 the desktop bands (WR-04).
  for (const width of [320, 375, 412, 640, 768, 1024, 1280]) {
    test(`default load matches the skeleton and does not shift at ${width}px`, async ({
      page,
    }) => {
      const pinned = pinnedHeightAt(width);
      await installClsObserver(page);
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/tools/password");
      await expect(page.getByTestId("password-tool")).toBeVisible();
      const cls = await settledCls(page);
      const box = await page.getByTestId("password-tool").boundingBox();
      if (!box) throw new Error("password-tool has no bounding box");
      expect(
        Math.abs(box.height - pinned),
        `island ${box.height}px vs skeleton ${pinned}px at ${width}px wide`,
      ).toBeLessThanOrEqual(1.5);
      expect(cls, `CLS at ${width}px wide`).toBeLessThanOrEqual(0.001);
    });

    test(`a passphrase bookmark shifts less than 0.05 at ${width}px`, async ({
      page,
    }) => {
      await installClsObserver(page);
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/tools/password?mode=passphrase");
      await expect(page.getByTestId("password-hero")).toBeVisible();
      const cls = await settledCls(page);
      expect(cls, `bookmark CLS at ${width}px wide`).toBeLessThan(0.05);
    });
  }

  test("the server HTML holds the text-free skeleton with the 44px mode row", async ({
    request,
  }) => {
    const html = await (await request.get("/tools/password")).text();
    const at = html.indexOf('data-testid="password-skeleton"');
    expect(at).toBeGreaterThan(-1);
    expect(html.slice(at, at + 1200)).toContain("h-11 w-56");
    expect(html).not.toContain('data-testid="password-output"');
  });

  test("switching modes never moves the output zone", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/tools/password");
    await expect(page.getByTestId("password-tool")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const top = async () =>
      (await page.getByTestId("password-output-zone").boundingBox())!.y;

    // Load the list once so later toggles never show the loading block.
    await page.getByTestId("password-mode-passphrase").click();
    await expect(page.getByTestId("password-hero")).toBeVisible();
    await page.getByTestId("password-mode-password").click();
    await expect(page.getByTestId("password-hero")).toBeVisible();

    const before = await top();
    for (let i = 0; i < 2; i++) {
      await page.getByTestId("password-mode-passphrase").click();
      await expect(page.getByTestId("password-hero")).toBeVisible();
      expect(Math.abs((await top()) - before)).toBeLessThanOrEqual(0.5);
      await page.getByTestId("password-mode-password").click();
      await expect(page.getByTestId("password-hero")).toBeVisible();
      expect(Math.abs((await top()) - before)).toBeLessThanOrEqual(0.5);
    }
  });

  test("the mode row fits one line at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto("/tools/password");
    await expect(page.getByTestId("password-mode")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const rows = await page.evaluate(() => {
      const row = document.querySelector('[data-testid="password-mode"]')!;
      const label = Array.from(row.parentElement!.querySelectorAll("*")).find(
        (el) => el.children.length === 0 && el.textContent?.trim() === "Mode",
      );
      const rect = (el: Element | null) => {
        const r = el?.getBoundingClientRect();
        return r ? { top: r.top, mid: r.top + r.height / 2 } : null;
      };
      return {
        label: rect(label ?? null),
        items: ["password", "passphrase"].map((m) =>
          rect(document.querySelector(`[data-testid="password-mode-${m}"]`)),
        ),
        height: row.parentElement!.getBoundingClientRect().height,
      };
    });
    expect(rows.label, "the Mode label exists").not.toBeNull();
    // One line: both toggle items share a top, and the label shares their
    // vertical centre (items-center), so nothing wrapped onto a second row.
    expect(rows.items[0]!.top, JSON.stringify(rows)).toBeCloseTo(
      rows.items[1]!.top,
      0,
    );
    expect(Math.abs(rows.label!.mid - rows.items[0]!.mid)).toBeLessThanOrEqual(1);
    expect(rows.height, "mode row is one 44px line").toBeLessThanOrEqual(44.5);
  });

  test("every pulse honors reduced motion", () => {
    for (const file of [
      "app/tools/password/PasswordToolLoader.tsx",
      "app/tools/password/PasswordOutput.tsx",
    ]) {
      const source = readSource(file);
      const strings = source.match(/(["'`])(?:(?!\1)[^\n])*animate-pulse(?:(?!\1)[^\n])*\1/g);
      expect(strings?.length, `${file} has an animate-pulse string`).toBeGreaterThan(0);
      for (const s of strings!) {
        expect(s, `${file}: ${s}`).toContain("motion-reduce:animate-none");
      }
    }
  });
});
