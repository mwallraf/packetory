import { expect, test } from "@playwright/test";
import {
  DEFAULT_SYMBOLS,
  DIGITS,
  LENGTH_DEFAULT,
  LOWERCASE,
  UPPERCASE,
} from "../../lib/password";

/**
 * Phase 13 (PWD-01, E1-loading, E2-loading, E3-loading): the production
 * server HTML of /tools/password must hold only a text-free skeleton, never a
 * generated password, and the island must then generate one in the browser.
 */

const POOL = UPPERCASE + LOWERCASE + DIGITS + DEFAULT_SYMBOLS;

/**
 * Script, style and tags are replaced with spaces first: the raw HTML holds
 * font class names and the build id, which are 20+ character runs over the
 * pool and would false-positive (RESEARCH Pitfall 2).
 */
function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

/**
 * The decoded string payloads of every `self.__next_f.push([n, "..."])` call
 * (the RSC flight data). A password generated on the server and passed to a
 * client component as a prop would land here, inside a script, which
 * `visibleText` blanks out (WR-03). Only the JSON-unescaped payload strings are
 * returned, so class names and chunk paths in markup are not scanned.
 */
function flightPayloads(html: string): string[] {
  const payloads: string[] = [];
  for (const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)) {
    const body = m[1] ?? "";
    for (const push of body.matchAll(
      /self\.__next_f\.push\((\[[\s\S]*?\])\)\s*(?:;|$)/g,
    )) {
      try {
        const parsed: unknown = JSON.parse(push[1]!);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (typeof item === "string") payloads.push(item);
          }
        }
      } catch {
        // Not a JSON push argument: nothing to decode.
      }
    }
  }
  return payloads;
}

/** The Next build id, which is a long mixed-class token that is not a leak. */
function buildIds(html: string): string[] {
  return [...html.matchAll(/\\?"b\\?":\\?"([^"\\]+)\\?"/g)].map((m) => m[1]!);
}

/**
 * Build artifacts that sit in the flight data as whole string values and are
 * long mixed-class tokens, so they would false-positive: the build id, asset
 * paths (`.js`, `.css`, `.map`, `.woff2`) and CSS-module class names.
 */
function isBuildArtifact(value: string, ids: string[]): boolean {
  return (
    ids.includes(value) ||
    /\.(?:js|css|map|woff2?)$/.test(value) ||
    value.includes("-module__")
  );
}

/**
 * True when any quoted string value in the flight payloads holds an all-sets
 * run, ignoring the build artifacts above. A password passed as a prop is a
 * quoted value, so it is caught; the markup scan (`visibleText`) cannot see it.
 */
function flightHasAllSetsRun(html: string): boolean {
  const ids = buildIds(html);
  for (const payload of flightPayloads(html)) {
    for (const quoted of payload.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
      let value: string;
      try {
        value = JSON.parse(`"${quoted[1]}"`) as string;
      } catch {
        value = quoted[1]!;
      }
      if (!isBuildArtifact(value, ids) && hasAllSetsRun(value)) return true;
    }
  }
  return false;
}

function hasAllSets(run: string): boolean {
  return (
    [...run].some((c) => UPPERCASE.includes(c)) &&
    [...run].some((c) => LOWERCASE.includes(c)) &&
    [...run].some((c) => DIGITS.includes(c)) &&
    [...run].some((c) => DEFAULT_SYMBOLS.includes(c))
  );
}

/** True when a token holds a pool run of LENGTH_DEFAULT+ chars with all four classes. */
function hasAllSetsRun(text: string): boolean {
  for (const token of text.split(/\s+/)) {
    let run = "";
    const flush = () => {
      if (run.length >= LENGTH_DEFAULT && hasAllSets(run)) return true;
      run = "";
      return false;
    };
    for (const ch of token) {
      if (POOL.includes(ch)) {
        run += ch;
      } else if (flush()) {
        return true;
      }
    }
    if (flush()) return true;
  }
  return false;
}

const FORBIDDEN_TESTIDS = [
  "password-tool",
  "password-output",
  "password-hero",
  "password-batch",
  "password-row",
  "password-error",
  "password-options",
];

test.describe("Password page server HTML (PWD-01, E1-loading)", () => {
  for (const path of ["/tools/password", "/tools/password?n=5&len=128"]) {
    test(`${path}: serves a text-free skeleton and no password`, async ({
      request,
    }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      const html = await response.text();

      expect(html.split('data-testid="password-skeleton"').length - 1).toBe(1);
      for (const id of FORBIDDEN_TESTIDS) {
        expect(html, id).not.toContain(`data-testid="${id}"`);
      }

      const skeleton = html.match(
        /<div[^>]*data-testid="password-skeleton"[^>]*>([\s\S]*?)<\/div><\/div>/,
      );
      expect(skeleton).not.toBeNull();
      expect(visibleText(skeleton![1]!).trim()).toBe("");

      expect(html).toMatch(
        /<meta name="robots" content="noindex, nofollow"\s*\/?>/,
      );
      expect(html).toContain("<title>Password Generator — Packetory</title>");
      expect(html).toContain(
        'href="https://packetory.dev/tools/password"',
      );
      expect(html).toContain(
        'content="Generate strong random passwords in your browser, with length, character-set, symbol and batch options."',
      );

      expect(hasAllSetsRun(visibleText(html))).toBe(false);
      // Non-vacuity: a Next change to the flight push format must not turn
      // the scan below into a silent no-op (IN-09).
      expect(flightPayloads(html).length).toBeGreaterThan(0);
      expect(flightHasAllSetsRun(html)).toBe(false);
    });
  }

  test("the leak detector has a positive and a negative control", () => {
    expect(hasAllSetsRun("Aa0!".repeat(5))).toBe(true);
    expect(hasAllSetsRun("Password Generator")).toBe(false);
  });

  test("the flight-payload scan sees a password hidden inside a script (WR-03)", () => {
    const leaked = "Aa0!".repeat(5);
    const withLeak = `<html><script>self.__next_f.push([1,"3:{\\"pw\\":\\"${leaked}\\"}"])</script></html>`;
    // The visible-text scan blanks scripts, so only the payload scan can see it.
    expect(hasAllSetsRun(visibleText(withLeak))).toBe(false);
    expect(flightHasAllSetsRun(withLeak)).toBe(true);

    const clean = `<html><script>self.__next_f.push([1,"0:{\\"b\\":\\"Ab3-Cd4_Ef5-Gh6_Ij7-Kl\\",\\"p\\":\\"\\"}"])</script></html>`;
    expect(flightHasAllSetsRun(clean)).toBe(false);
  });
});

test.describe("Password island on the production build (PWD-01 tracer)", () => {
  test("shows one fresh all-sets password with Copy and Regenerate", async ({
    page,
  }) => {
    await page.goto("/tools/password");
    const output = page.getByTestId("password-output");
    await expect(output).toBeVisible();
    await expect(page.getByTestId("password-skeleton")).toHaveCount(0);

    const first = (await output.textContent()) ?? "";
    expect(first).toHaveLength(LENGTH_DEFAULT);
    expect([...first].every((c) => POOL.includes(c))).toBe(true);
    expect(hasAllSets(first)).toBe(true);
    await expect(page.getByTestId("password-copy")).toBeVisible();
    await expect(page.getByTestId("password-regenerate")).toBeVisible();

    await page.reload();
    await expect(output).toBeVisible();
    const second = (await output.textContent()) ?? "";
    expect(second).not.toBe(first);

    await page.getByTestId("password-regenerate").click();
    await expect
      .poll(async () => (await output.textContent()) ?? "")
      .not.toBe(second);
  });
});
