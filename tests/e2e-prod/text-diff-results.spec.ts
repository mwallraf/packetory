import { expect, test, type Page } from "@playwright/test";

async function submit(page: Page, original: string, modified: string) {
  await page.getByLabel("Original", { exact: true }).fill(original);
  await page.getByLabel("Modified", { exact: true }).fill(modified);
  await page.getByRole("button", { name: "Compare" }).click();
}

test("responsive review keeps one aligned diff with keyboard-expandable context", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/tools/diff");
  const unchanged = Array.from({ length: 12 }, (_, i) => `baseline line ${i + 1}`).join("\n");
  await page.getByLabel("Original", { exact: true }).fill(`${unchanged}\nip address 192.0.2.1\nlong ${"a".repeat(500)}\nend\n`);
  await page.getByLabel("Modified", { exact: true }).fill(`${unchanged}\nip address 192.0.2.2\nlong ${"a".repeat(500)}\npermit dns\nend`);
  await page.getByRole("button", { name: "Compare" }).click();

  const results = page.getByRole("region", { name: "Comparison results" });
  await expect(results).toBeVisible();
  const fold = results.getByRole("button", { name: "Show 9 unchanged lines" });
  await expect(fold).toHaveAttribute("aria-expanded", "false", { timeout: 1_500 });
  await fold.focus();
  await page.keyboard.press("Enter");
  const expanded = results.getByRole("button", { name: "Hide 9 unchanged lines" });
  await expect(expanded).toBeFocused();
  await expect(expanded).toHaveAttribute("aria-expanded", "true");
  await expect(results.getByText("baseline line 1", { exact: true })).toHaveCount(2);
  await page.keyboard.press("Space");
  await expect(fold).toBeFocused();
  await expect(results.getByText("baseline line 1", { exact: true })).toHaveCount(0);

  const oldDigit = results.locator("del").filter({ hasText: /^1$/ });
  const newDigit = results.locator("ins").filter({ hasText: /^2$/ });
  await expect(oldDigit).toBeVisible();
  await expect(newDigit).toBeVisible();
  const oldBox = (await oldDigit.boundingBox())!;
  const newBox = (await newDigit.boundingBox())!;
  expect(oldBox.y).toBe(newBox.y);
  expect(newBox.x).toBeGreaterThan(oldBox.x);
  await expect(results.getByText("No newline at end of text", { exact: true })).toBeVisible();
  await expect(results.getByText("permit dns", { exact: true })).toBeVisible();

  const highlight = (await newDigit.evaluate((node) => getComputedStyle(node).backgroundColor));
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect.poll(() => newDigit.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe(highlight);
  await page.setViewportSize({ width: 320, height: 700 });
  expect((await newDigit.boundingBox())!.y).toBeGreaterThan((await oldDigit.boundingBox())!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(results.getByText("baseline line 12", { exact: true }).filter({ visible: true })).toHaveCount(1);
  await expect(results.getByText("Removed, original line 13", { exact: true })).toBeVisible();
  await expect(results.getByText("Added, modified line 13", { exact: true })).toBeVisible();
});

test("bounded workloads retain both snippets on a display-limit result and allow retry", async ({ page }) => {
  await page.goto("/tools/diff");
  const common = "link-state up\n".repeat(250);
  const original = common + "neighbor 192.0.2.1";
  const modified = common + "neighbor 192.0.2.2";
  await submit(page, original, modified);
  await expect(page.getByRole("status")).toHaveText(
    "This comparison is too large to display. Try comparing a smaller section.",
    { timeout: 1_500 },
  );
  await expect(page.getByRole("region", { name: "Comparison results" })).toHaveCount(0);
  await expect(page.getByLabel("Original", { exact: true })).toHaveValue(original);
  await expect(page.getByLabel("Modified", { exact: true })).toHaveValue(modified);
  await submit(page, "x".repeat(200_001), "y");
  await expect(page.getByRole("status")).toHaveText("One snippet is too long. Shorten it and compare again.");
  await expect(page.getByLabel("Original", { exact: true })).toHaveValue("x".repeat(200_001));
  await submit(page, "neighbor 192.0.2.1", "neighbor 192.0.2.2");
  await expect(page.getByRole("status")).toHaveText("1 modified");
});

declare global {
  interface Window {
    __textDiffBenchmark: { start: number; duration: number }[];
  }
}

const config = Array.from({ length: 100 }, (_, i) => `route 198.51.100.${i} via 192.0.2.1 metric 10 tag 33`).join("\n");
const logs = "INFO link state is up\n".repeat(119);
const json = JSON.stringify({ message: "x".repeat(31_900), port: 53 });
const fixtures = [
  {
    name: "multi-line config",
    original: config,
    modified: config.replaceAll("via 192.0.2.1 metric 10 tag 33", "via 192.0.2.2 metric 20 tag 44"),
  },
  { name: "repetitive logs", original: logs + "WARN peer port 53", modified: logs + "WARN peer port 54" },
  { name: "single-line JSON", original: json, modified: json.replace('"port":53', '"port":54') },
];

for (const rate of [1, 4]) {
  test(`bounded workloads measure production rendering at ${rate}x CPU slowdown`, async ({ page }) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript(() => {
      window.__textDiffBenchmark = [];
      const observe = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__textDiffBenchmark.push({ start: entry.startTime, duration: entry.duration });
        }
      });
      observe.observe({ type: "longtask", buffered: true });

      const post = Worker.prototype.postMessage;
      Worker.prototype.postMessage = function (...args: [unknown, (Transferable[] | StructuredSerializeOptions)?]) {
        performance.mark("text-diff-start");
        this.addEventListener("message", () => performance.mark("text-diff-reply"), { once: true });
        Reflect.apply(post, this, args);
      };
      const mutation = new MutationObserver(() => {
        if (document.querySelector('section[aria-label="Comparison results"]')) {
          performance.mark("text-diff-commit");
          mutation.disconnect();
        }
      });
      mutation.observe(document, { subtree: true, childList: true });
      document.addEventListener("click", (event) => {
        const button = (event.target as Element | null)?.closest('button[aria-expanded="false"]');
        if (!button?.closest('section[aria-label="Comparison results"]')) return;
        performance.mark("text-diff-expand");
        const expanded = new MutationObserver(() => {
          performance.mark("text-diff-expanded");
          expanded.disconnect();
        });
        expanded.observe(button, { attributes: true, attributeFilter: ["aria-expanded"] });
      }, { capture: true });
    });

    for (const fixture of fixtures) {
      await page.goto("/tools/diff");
      await submit(page, fixture.original, fixture.modified);
      const results = page.getByRole("region", { name: "Comparison results" });
      await expect(results).toBeVisible();
      const fold = results.getByRole("button", { name: /^Show \d+ unchanged lines$/ });
      if (await fold.count()) {
        await fold.click();
        await expect(results.getByRole("button", { name: /^Hide \d+ unchanged lines$/ })).toBeVisible();
      }

      const metrics = await page.evaluate(async () => {
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        const mark = (name: string) => performance.getEntriesByName(name).at(-1)?.startTime;
        const start = mark("text-diff-start");
        const reply = mark("text-diff-reply");
        const commit = mark("text-diff-commit");
        const expand = mark("text-diff-expand");
        const expanded = mark("text-diff-expanded");
        if (start === undefined || reply === undefined || commit === undefined) {
          throw new Error("Missing worker round-trip or DOM-completion measure");
        }

        return {
          workerRoundTripMs: Number((reply - start).toFixed(1)),
          replyToCommitMs: Number((commit - reply).toFixed(1)),
          foldCommitMs: expand !== undefined && expanded !== undefined ? Number((expanded - expand).toFixed(1)) : null,
          observerSupported: PerformanceObserver.supportedEntryTypes.includes("longtask"),
          longestObservedTaskMs: Math.max(0, ...window.__textDiffBenchmark
            .filter((entry) => entry.start + entry.duration >= reply)
            .map((entry) => entry.duration)),
        };
      });
      expect(metrics.observerSupported).toBe(true);
      expect(metrics.workerRoundTripMs).toBeGreaterThanOrEqual(0);
      expect(metrics.replyToCommitMs).toBeGreaterThanOrEqual(0);
      if (fixture.name === "repetitive logs") expect(metrics.foldCommitMs).toBeGreaterThanOrEqual(0);
      console.log("Text Diff benchmark", JSON.stringify({
        fixture: fixture.name, rate, originalLength: fixture.original.length,
        modifiedLength: fixture.modified.length, ...metrics,
      }));
    }
    await cdp.detach();
  });
}
