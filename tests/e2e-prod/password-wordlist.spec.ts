import { expect, test, type Page } from "@playwright/test";
import { EFF_MARKER, splitPassphrase } from "../e2e/helpers/passphrase";

/**
 * Phase 14 (PHR-03, D-18 a/b): in the production build the 7,776-word EFF list
 * must be absent from the initial page JS and arrive as exactly one chunk the
 * first time the user chooses Passphrase. Every JS chunk response body is
 * scanned for a run of adjacent EFF words (RESEARCH Pattern 2).
 */

type Seen = { url: string; hasMarker: boolean; bytes: number };

/**
 * Records every JS chunk the page receives and whether its body holds the list.
 * Fulfills with the fetched response and body, so the page behaves unchanged.
 */
async function recordChunks(page: Page): Promise<Seen[]> {
  const seen: Seen[] = [];
  await page.route("**/_next/static/chunks/**", async (route) => {
    const url = route.request().url();
    if (!/\.js(\?|$)/.test(new URL(url).pathname + new URL(url).search)) {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const body = await response.text();
    seen.push({ url, hasMarker: body.includes(EFF_MARKER), bytes: body.length });
    await route.fulfill({ response, body });
  });
  return seen;
}

const markerChunks = (seen: Seen[]) => seen.filter((s) => s.hasMarker);

test.describe("Word list chunk (PHR-03, D-18)", () => {
  test("(a) initial load has no word list", async ({ page }) => {
    const seen = await recordChunks(page);
    await page.goto("/tools/password");
    const output = page.getByTestId("password-output");
    await expect(output).toBeVisible();

    expect(seen.length).toBeGreaterThanOrEqual(1);
    expect(markerChunks(seen)).toEqual([]);
    expect((((await output.textContent()) ?? "").trim()).length).toBe(20);
    test.info().annotations.push({
      type: "initial-js-chunks",
      description: String(seen.length),
    });
  });

  test("(b) first Passphrase use fetches exactly one marker chunk", async ({
    page,
  }) => {
    const seen = await recordChunks(page);
    await page.goto("/tools/password");
    const output = page.getByTestId("password-output");
    await expect(output).toBeVisible();
    const before = markerChunks(seen).length;
    expect(before).toBe(0);

    await page.getByTestId("password-mode-passphrase").click();
    await expect
      .poll(
        async () =>
          splitPassphrase(((await output.textContent()) ?? "").trim(), "-")
            .length,
      )
      .toBe(6);
    const afterFirst = markerChunks(seen);
    expect(afterFirst).toHaveLength(1);
    test.info().annotations.push({
      type: "marker-chunk",
      description: `${afterFirst[0]!.url} (${afterFirst[0]!.bytes} chars)`,
    });

    // Adjacency (edge PHR-03): Passphrase, Password, Passphrase loads once.
    await page.getByTestId("password-mode-password").click();
    await expect(output).toHaveText(/^.{20}$/);
    await page.getByTestId("password-mode-passphrase").click();
    await expect
      .poll(
        async () =>
          splitPassphrase(((await output.textContent()) ?? "").trim(), "-")
            .length,
      )
      .toBe(6);
    expect(markerChunks(seen)).toHaveLength(1);
  });
});
