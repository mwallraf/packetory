import { expect, test } from "@playwright/test";
import { EFF_HYPHENATED_WORDS } from "../../lib/password";
import { splitPassphrase } from "./helpers/passphrase";

/**
 * Passphrase mode tracer (PHR-01, PHR-03): choosing Passphrase lazy-loads the
 * EFF list, shows a 6-word passphrase and mirrors only the mode into the URL.
 */

const settle = (page: import("@playwright/test").Page) =>
  page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 250)));

const WORD_RE = new RegExp(
  `^(?:[a-z]+|${EFF_HYPHENATED_WORDS.join("|")})$`,
);

test.describe("Passphrase mode (PHR-01, PHR-03)", () => {
  test("Passphrase shows 6 EFF words joined by -", async ({ page }) => {
    await page.goto("/tools/password");
    await expect(page.getByTestId("password-output")).toBeVisible();

    await page.getByTestId("password-mode-passphrase").click();

    const output = page.getByTestId("password-output");
    await expect(output).toBeVisible();
    const value = ((await output.textContent()) ?? "").trim();
    const tokens = splitPassphrase(value, "-");
    expect(tokens).toHaveLength(6);
    for (const t of tokens) expect(t).toMatch(WORD_RE);
    expect(new URL(page.url()).search).toBe("?mode=passphrase");
    await expect(page.getByTestId("password-mode-passphrase")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByTestId("password-mode-password")).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  test("clicking the selected mode changes nothing", async ({ page }) => {
    await page.goto("/tools/password");
    await page.getByTestId("password-mode-passphrase").click();
    const output = page.getByTestId("password-output");
    await expect(output).toBeVisible();
    const before = await output.textContent();
    const urlBefore = page.url();

    await page.getByTestId("password-mode-passphrase").click();

    await expect(output).toHaveText(before ?? "");
    expect(page.url()).toBe(urlBefore);
    await expect(
      page.locator('[data-testid^="password-mode-"][aria-checked="true"]'),
    ).toHaveCount(1);
  });

  test("both modes keep their own settings", async ({ page }) => {
    await page.goto("/tools/password");
    const output = page.getByTestId("password-output");
    await expect(output).toBeVisible();
    await page.getByTestId("password-length").fill("32");
    await expect(output).toHaveText(/^.{32}$/);

    await page.getByTestId("password-mode-passphrase").click();
    await expect(page.getByTestId("password-mode-passphrase")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(output).toHaveText(/^[a-z-]+$/);

    await page.getByTestId("password-mode-password").click();
    await expect(output).toHaveText(/^.{32}$/);
    expect(new URL(page.url()).search).toBe("?len=32");
  });

  test("a second Passphrase activation uses the cached list", async ({
    page,
  }) => {
    await page.goto("/tools/password");
    await page.getByTestId("password-mode-passphrase").click();
    const output = page.getByTestId("password-output");
    await expect(output).toBeVisible();

    await page.getByTestId("password-mode-password").click();
    await expect(output).toHaveText(/^.{20}$/);

    const loading = page.getByTestId("password-wordlist-loading");
    await page.getByTestId("password-mode-passphrase").click();
    // The cached list renders synchronously: the loading block never exists.
    await expect(loading).toHaveCount(0);
    await expect(output).toBeVisible();
    expect(
      splitPassphrase(((await output.textContent()) ?? "").trim(), "-"),
    ).toHaveLength(6);
  });

  test("a passphrase bookmark restores the mode and options (D-03)", async ({
    page,
  }) => {
    await page.goto("/tools/password?mode=passphrase&words=8&sep=dot");
    const output = page.getByTestId("password-output");
    await expect(output).toBeVisible();
    const value = ((await output.textContent()) ?? "").trim();
    expect(splitPassphrase(value, ".")).toHaveLength(8);
    expect(new URL(page.url()).search).toBe("?mode=passphrase&words=8&sep=dot");
    await expect(page.getByTestId("password-mode-passphrase")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("the default URL stays bare", async ({ page }) => {
    await page.goto("/tools/password");
    await expect(page.getByTestId("password-output")).toBeVisible();
    expect(new URL(page.url()).search).toBe("");
    await expect(page.getByTestId("password-mode-password")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});

test.describe("Passphrase options (PHR-02, PHR-04)", () => {
  const out = (page: import("@playwright/test").Page) =>
    page.getByTestId("password-output");
  const text = async (page: import("@playwright/test").Page) =>
    ((await out(page).textContent()) ?? "").trim();

  test("Word count 3 and 20 give 3 and 20 tokens", async ({ page }) => {
    await page.goto("/tools/password?mode=passphrase");
    await expect(out(page)).toBeVisible();
    for (const n of [3, 20]) {
      await page.getByTestId("password-words").fill(String(n));
      await expect
        .poll(async () => splitPassphrase(await text(page), "-").length)
        .toBe(n);
      expect(new URL(page.url()).search).toContain(`words=${n}`);
    }
  });

  test("each separator splits the value into 6 tokens and writes the URL", async ({
    page,
  }) => {
    await page.goto("/tools/password?mode=passphrase");
    await expect(out(page)).toBeVisible();
    const cases = [
      ["underscore", "_"],
      ["dot", "."],
      ["space", " "],
      ["dash", "-"],
    ] as const;
    for (const [name, ch] of cases) {
      await page.getByTestId(`password-separator-${name}`).click();
      await expect(
        page.getByTestId(`password-separator-${name}`),
      ).toHaveAttribute("aria-checked", "true");
      await expect
        .poll(async () => splitPassphrase(await text(page), ch).length)
        .toBe(6);
      if (name !== "dash") {
        expect(new URL(page.url()).search).toContain(`sep=${name}`);
      }
    }
  });

  test("Capitalize and Append a number take effect and write the URL", async ({
    page,
  }) => {
    await page.goto("/tools/password?mode=passphrase&sep=space");
    await expect(out(page)).toBeVisible();
    await page.getByTestId("password-capitalize").click();
    await expect
      .poll(async () =>
        splitPassphrase(await text(page), " ").every((t) => /^[A-Z]/.test(t)),
      )
      .toBe(true);
    await page.getByTestId("password-append-number").click();
    await expect.poll(async () => text(page)).toMatch(/[A-Za-z]\d$/);
    const search = new URL(page.url()).search;
    expect(search).toContain("cap=1");
    expect(search).toContain("num=1");
    expect(search).toContain("sep=space");
  });

  test("the EFF credit line is Passphrase-only, with noreferrer links and no eff.org request", async ({
    page,
  }) => {
    const hosts: string[] = [];
    page.on("request", (req) => hosts.push(new URL(req.url()).hostname));
    await page.goto("/tools/password");
    await expect(out(page)).toBeVisible();
    await expect(page.getByTestId("password-eff-credit")).toHaveCount(0);

    await page.getByTestId("password-mode-passphrase").click();
    const credit = page.getByTestId("password-eff-credit");
    await expect(credit).toBeVisible();
    await expect(credit).toHaveText("Words from the EFF Large Wordlist (CC BY)");
    const links = credit.locator("a");
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveAttribute("rel", "noreferrer");
    await expect(links.nth(1)).toHaveAttribute("rel", "noreferrer");
    await expect(links.nth(0)).toHaveAttribute("href", /^https:\/\/www\.eff\.org\//);
    await expect(links.nth(1)).toHaveAttribute("href", /^https:\/\/www\.eff\.org\//);
    await settle(page);
    expect(hosts.filter((h) => h.endsWith("eff.org"))).toEqual([]);

    await page.getByTestId("password-mode-password").click();
    await expect(page.getByTestId("password-eff-credit")).toHaveCount(0);
  });
});
