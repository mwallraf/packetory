import { expect, test } from "@playwright/test";
import { expectServerAboutParity } from "./helpers/about-parity";
import { openAbout } from "./helpers/about";

const TITLE = "Password & Passphrase Generator — Packetory";
const DESCRIPTION =
  "Generate strong random passwords and memorable EFF passphrases with a strength meter and crack-time estimate. Runs locally in your browser.";
const EFF_WORDLIST_URL =
  "https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases";
const EFF_LICENCE_URL = "https://www.eff.org/copyright";

test.describe("Password SEO and About (PREG-02, PHR-04)", () => {
  test("metadata is unique, complete and indexable", async ({ page }) => {
    await page.goto("/tools/password");

    expect(await page.title()).toBe(TITLE);

    const description = page.locator('head meta[name="description"]');
    await expect(description).toHaveCount(1);
    await expect(description).toHaveAttribute("content", DESCRIPTION);

    const canonical = page.locator('head link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute("href", /\/tools\/password$/);

    await expect(page.locator('head meta[property="og:title"]')).toHaveCount(1);
    await expect(
      page.locator('head meta[property="og:description"]'),
    ).toHaveCount(1);
    await expect(page.locator('head meta[property="og:url"]')).toHaveCount(1);
    await expect(page.locator('head meta[property="og:type"]')).toHaveAttribute(
      "content",
      "website",
    );

    await expect(page.locator('head meta[name="robots"]')).toHaveCount(0);
    expect(await page.content()).not.toContain("noindex");
  });

  test("intro sits under the h1 and claims only local processing", async ({
    page,
  }) => {
    await page.goto("/tools/password");
    const intro = page.getByTestId("password-intro");
    await expect(intro).toBeVisible();
    await expect(intro).toContainText("Runs locally in your browser.");
  });

  test("About is the last child of main, with the worked example and six FAQ items matching the JSON-LD", async ({
    page,
  }) => {
    await page.goto("/tools/password");
    await expect(
      page.locator('main > [data-testid="about-tool"]:last-child'),
    ).toHaveCount(1);
    await expect(page.locator("details[open]")).toHaveCount(0);

    await openAbout(page, "password", ["worked-example", "faq"]);

    const items = page.getByTestId("password-faq-item");
    await expect(items).toHaveCount(6);

    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(1);
    const parsed = JSON.parse((await jsonLd.textContent())!);
    expect(parsed["@type"]).toBe("FAQPage");
    expect(parsed.mainEntity).toHaveLength(6);
    for (let i = 0; i < 6; i++) {
      const question = (
        await items.nth(i).locator("p").nth(0).textContent()
      )?.trim();
      const answer = (
        await items.nth(i).locator("p").nth(1).textContent()
      )?.trim();
      expect(parsed.mainEntity[i].name).toBe(question);
      expect(parsed.mainEntity[i].acceptedAnswer.text).toBe(answer);
    }
  });

  test("worked example shows the structural shape and the full EFF attribution", async ({
    page,
  }) => {
    await page.goto("/tools/password");
    await openAbout(page, "password", ["worked-example"]);

    await expect(page.getByTestId("password-worked-example-shape")).toHaveText(
      Array(6).fill("word").join("-"),
    );

    const attribution = page.getByTestId("password-attribution");
    await expect(attribution).toBeVisible();
    await expect(attribution).toContainText("EFF Large Wordlist");
    await expect(attribution).toContainText("CC BY");
    await expect(attribution).toContainText("7,776");
    await expect(attribution).toContainText("unmodified");

    const links = attribution.locator("a");
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveAttribute("href", EFF_WORDLIST_URL);
    await expect(links.nth(1)).toHaveAttribute("href", EFF_LICENCE_URL);
    await expect(links.nth(0)).toHaveAttribute("rel", /noreferrer/);
    await expect(links.nth(1)).toHaveAttribute("rel", /noreferrer/);
  });

  test("opened About does not overflow the page at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/tools/password");
    await openAbout(page, "password");
    const fits = await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    );
    expect(fits).toBe(true);
  });
});

test.describe("Password About without JavaScript (PREG-02, D-13)", () => {
  test.use({ javaScriptEnabled: false });

  test("server HTML holds the closed About area and one matching FAQPage JSON-LD", async ({
    page,
    request,
  }) => {
    await expectServerAboutParity(page, request, "password");
  });
});
