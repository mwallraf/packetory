import { expect, test } from "@playwright/test";

test("compares an IP address edit through a production worker", async ({ page }) => {
  await page.goto("/diff-smoke");
  await page.waitForFunction(() => window.__diffSmoke !== undefined);
  const [worker, result] = await Promise.all([
    page.waitForEvent("worker"),
    page.evaluate(() => window.__diffSmoke!.compare({ original: "192.0.2.1", modified: "192.0.2.2" })),
  ]);

  expect(worker.url()).toContain("/_next/static/");
  expect(result).toEqual({
    status: "done",
    rows: [{
      kind: "modified",
      original: {
        number: 1,
        text: "192.0.2.1",
        hasNewline: false,
        spans: [{ kind: "equal", text: "192.0.2." }, { kind: "removed", text: "1" }],
      },
      modified: {
        number: 1,
        text: "192.0.2.2",
        hasNewline: false,
        spans: [{ kind: "equal", text: "192.0.2." }, { kind: "added", text: "2" }],
      },
    }],
  });
});
