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

test.describe("Passphrase mode at 320px (UI E2-long-text, E2-overflow, E4-overflow)", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`20-word hero wraps between words and fits in ${scheme}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(
        "/tools/password?mode=passphrase&words=20&sep=space&cap=1&num=1",
      );
      await expect(page.getByTestId("password-hero")).toBeVisible();
      await expect(page.getByTestId("password-output")).toBeVisible();

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
      for (const id of ["password-copy", "password-regenerate"]) {
        const box = await page.getByTestId(id).boundingBox();
        expect(box, `${id} is rendered`).not.toBeNull();
        expect((box?.x ?? 0) + (box?.width ?? 0), `${id} right edge`).toBeLessThanOrEqual(
          320,
        );
        expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
      }

      // No word breaks mid-word: a Range over each word has one client rect.
      const broken = await page.getByTestId("password-output").evaluate((root) => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes: Text[] = [];
        let offset = 0;
        const starts: number[] = [];
        let full = "";
        while (walker.nextNode()) {
          const n = walker.currentNode as Text;
          nodes.push(n);
          starts.push(offset);
          offset += n.data.length;
          full += n.data;
        }
        const locate = (pos: number) => {
          for (let i = nodes.length - 1; i >= 0; i -= 1) {
            if (pos >= starts[i]!) return { node: nodes[i]!, off: pos - starts[i]! };
          }
          return { node: nodes[0]!, off: 0 };
        };
        const bad: string[] = [];
        let words = 0;
        const re = /[^ ]+/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(full)) !== null) {
          words += 1;
          // EFF words such as "t-shirt" may legitimately wrap at their own hyphen.
          if (m[0].includes("-")) continue;
          const start = locate(m.index);
          const endPos = m.index + m[0].length;
          // End position: place at the end of the node holding the last char.
          const last = locate(endPos - 1);
          const range = document.createRange();
          range.setStart(start.node, start.off);
          range.setEnd(last.node, last.off + 1);
          const rects = Array.from(range.getClientRects()).filter(
            (r) => r.width > 0,
          );
          // One rect per text node the word spans, merged by line.
          const lines = new Set(rects.map((r) => Math.round(r.top)));
          if (lines.size !== 1) bad.push(`word ${words} spans ${lines.size} lines`);
        }
        return { bad, words };
      });
      expect(broken.words, "words found in the hero").toBe(20);
      expect(broken.bad, "words that broke mid-word").toEqual([]);
    });

    for (const sep of ["underscore", "dot"] as const) {
      test(`20 x 20-word batch with the ${sep} separator fits 320px in ${scheme}`, async ({
        page,
      }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.setViewportSize({ width: 320, height: 800 });
        await page.goto(`/tools/password?mode=passphrase&n=20&words=20&sep=${sep}`);
        await expect(page.getByTestId("password-batch")).toBeVisible();
        await expect(page.getByTestId("password-row")).toHaveCount(20);

        const noScroll = await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        );
        expect(noScroll, "page scrollWidth <= clientWidth").toBe(true);
        expect(await offenders(page), "elements past the viewport").toEqual([]);

        const clientWidth = await page.evaluate(
          () => document.documentElement.clientWidth,
        );
        const rowEdges = await page
          .getByTestId("password-row-copy")
          .evaluateAll((els) =>
            els.map((el) => {
              const r = el.getBoundingClientRect();
              return { left: r.left, right: r.right };
            }),
          );
        expect(rowEdges).toHaveLength(20);
        for (const edge of rowEdges) {
          expect(edge.left).toBeGreaterThanOrEqual(0);
          expect(edge.right).toBeLessThanOrEqual(clientWidth);
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
      });
    }

    test(`the bcrypt scenario fits the strength panel at 320px in ${scheme}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto("/tools/password");
      await expect(page.getByTestId("password-hero")).toBeVisible();
      await page.getByTestId("password-scenario-slow").click();
      const panel = await page.getByTestId("password-strength").evaluate((el) => ({
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        right: el.getBoundingClientRect().right,
        viewport: document.documentElement.clientWidth,
      }));
      expect(panel.scrollWidth, "strength panel scrollWidth").toBeLessThanOrEqual(
        panel.clientWidth,
      );
      expect(panel.right, "strength panel right edge").toBeLessThanOrEqual(
        panel.viewport,
      );
      const noScroll = await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      );
      expect(noScroll, "page scrollWidth <= clientWidth").toBe(true);
    });
  }
});

test.describe("Passphrase separators never end a wrapped line (UI-1)", () => {
  for (const sep of ["dash", "underscore", "dot"] as const) {
    test(`a 20-word hero with the ${sep} separator keeps each separator with the next word at 320px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(`/tools/password?mode=passphrase&words=20&sep=${sep}`);
      await expect(page.getByTestId("password-hero")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const result = await page.getByTestId("password-output").evaluate((root) => {
        const chars: { ch: string; top: number }[] = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode as Text;
          for (let i = 0; i < node.data.length; i += 1) {
            const range = document.createRange();
            range.setStart(node, i);
            range.setEnd(node, i + 1);
            const rect = range.getClientRects()[0];
            chars.push({ ch: node.data[i]!, top: Math.round(rect ? rect.top : -1) });
          }
        }
        const separators = new Set(["-", "_", "."]);
        const stranded: number[] = [];
        let separatorCount = 0;
        for (let i = 0; i < chars.length - 1; i += 1) {
          if (!separators.has(chars[i]!.ch)) continue;
          separatorCount += 1;
          if (chars[i]!.top !== chars[i + 1]!.top) stranded.push(i);
        }
        const lines = new Set(chars.map((c) => c.top)).size;
        return { stranded, separatorCount, lines };
      });
      expect(result.lines, "the hero wraps onto several lines").toBeGreaterThan(1);
      expect(result.separatorCount, "separators found").toBeGreaterThanOrEqual(19);
      expect(result.stranded, "separators at the end of a line").toEqual([]);
    });
  }
});

test.describe("Passphrase options grid (UI-2)", () => {
  type Box = { x: number; y: number; width: number; height: number };

  async function boxes(page: import("@playwright/test").Page) {
    const box = async (id: string): Promise<Box> => {
      const b = await page.getByTestId(id).boundingBox();
      if (!b) throw new Error(`${id} has no bounding box`);
      return b;
    };
    const label = async (text: string): Promise<Box> => {
      const b = await page.getByText(text, { exact: true }).boundingBox();
      if (!b) throw new Error(`${text} has no bounding box`);
      return b;
    };
    return {
      options: await box("password-options"),
      separator: await box("password-separator"),
      cap: await box("password-capitalize"),
      num: await box("password-append-number"),
      capHint: await box("password-capitalize-hint"),
      numHint: await box("password-append-number-hint"),
      capLabel: await label("Capitalize words"),
      numLabel: await label("Append a number"),
    };
  }

  for (const width of [640, 1280]) {
    test(`at ${width}px the separator has its own row and the switches sit side by side`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/tools/password?mode=passphrase");
      await expect(page.getByTestId("password-options")).toBeVisible();
      const b = await boxes(page);
      // Separator row: its toggle group starts at the panel's left edge and the
      // switch row starts below it (no right column beside the separator).
      expect(b.separator.x).toBeCloseTo(b.options.x, 0);
      expect(b.cap.y, "switches sit below the separator").toBeGreaterThan(
        b.separator.y + b.separator.height - 1,
      );
      // Capitalize and Append share a row, in two columns.
      expect(Math.abs(b.cap.y - b.num.y)).toBeLessThanOrEqual(1);
      expect(b.num.x).toBeGreaterThan(b.cap.x + 100);
      // Each hint sits directly under its own label, aligned with its text.
      for (const [label, hint] of [
        [b.capLabel, b.capHint],
        [b.numLabel, b.numHint],
      ] as const) {
        expect(Math.abs(hint.x - label.x)).toBeLessThanOrEqual(1);
        const gap = hint.y - (label.y + label.height);
        expect(gap, "hint directly under its label").toBeGreaterThanOrEqual(0);
        expect(gap, "hint directly under its label").toBeLessThanOrEqual(8);
      }
    });
  }

  test("at 320px the switches stack in reading order and nothing overflows", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto("/tools/password?mode=passphrase");
    await expect(page.getByTestId("password-options")).toBeVisible();
    const b = await boxes(page);
    expect(b.num.y).toBeGreaterThan(b.cap.y + b.cap.height);
    expect(Math.abs(b.num.x - b.cap.x)).toBeLessThanOrEqual(1);
    const noScroll = await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    );
    expect(noScroll).toBe(true);
  });
});
