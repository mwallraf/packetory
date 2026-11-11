import { expect, test } from "@playwright/test";
import { tools } from "../../tools/registry";
import { openAbout } from "./helpers/about";
import { expectServerAboutParity } from "./helpers/about-parity";

const SLUGS = tools.filter((t) => t.status !== "planned").map((t) => t.slug);

test.describe("About area structure (INFO-01, INFO-02, INFO-05)", () => {
  for (const slug of SLUGS) {
    test(`${slug}: tool first, About last and closed on load`, async ({
      page,
    }) => {
      await page.goto(`/tools/${slug}`);

      await expect(page.getByTestId("about-tool")).toHaveCount(1);
      await expect(page.locator("#about-heading")).toHaveCount(1);
      await expect(page.getByTestId(`${slug}-worked-example`)).toHaveCount(1);
      await expect(page.getByTestId(`${slug}-faq`)).toHaveCount(1);
      await expect(
        page.getByRole("heading", { level: 2, name: "About this tool" })
      ).toBeVisible();
      await expect(page.locator("details[open]")).toHaveCount(0);

      const layout = await page.evaluate((s) => {
        const about = document.querySelector('[data-testid="about-tool"]');
        const example = document.querySelector(
          `[data-testid="${s}-worked-example"]`
        );
        const faq = document.querySelector(`[data-testid="${s}-faq"]`);
        const h1 = document.querySelector("h1");
        const h2 = document.querySelector("#about-heading");
        if (!about || !example || !faq || !h1 || !h2) {
          throw new Error("About structure elements are missing");
        }
        const parent = about.parentElement;
        const prev = about.previousElementSibling;
        const h2Style = getComputedStyle(h2);
        return {
          isLast:
            parent !== null &&
            parent.tagName === "MAIN" &&
            parent.lastElementChild === about,
          prevBottom: prev ? prev.getBoundingClientRect().bottom : -1,
          aboutTop: about.getBoundingClientRect().top,
          exampleFirst: Boolean(
            example.compareDocumentPosition(faq) &
              Node.DOCUMENT_POSITION_FOLLOWING
          ),
          h2Size: h2Style.fontSize,
          h2Color: h2Style.color,
          h1Color: getComputedStyle(h1).color,
        };
      }, slug);

      expect(layout.isLast).toBe(true);
      expect(layout.prevBottom).toBeGreaterThanOrEqual(0);
      expect(layout.aboutTop).toBeGreaterThanOrEqual(layout.prevBottom);
      expect(layout.exampleFirst).toBe(true);
      expect(layout.h2Size).toBe("14px");
      expect(layout.h2Color).not.toBe(layout.h1Color);
    });

    test(`${slug}: click, Enter and Space toggle each disclosure on its own, and Tab moves between summaries`, async ({
      page,
    }) => {
      await page.goto(`/tools/${slug}`);

      const example = page.getByTestId(`${slug}-worked-example`);
      const faq = page.getByTestId(`${slug}-faq`);
      const exampleSummary = example.locator("summary");
      const faqSummary = faq.locator("summary");

      await exampleSummary.click();
      await expect(example).toHaveAttribute("open", "");
      await expect(faq).not.toHaveAttribute("open", /.*/);
      await exampleSummary.click();
      await expect(example).not.toHaveAttribute("open", /.*/);

      await faqSummary.focus();
      await page.keyboard.press("Enter");
      await expect(faq).toHaveAttribute("open", "");
      await expect(example).not.toHaveAttribute("open", /.*/);
      await page.keyboard.press("Space");
      await expect(faq).not.toHaveAttribute("open", /.*/);

      await exampleSummary.focus();
      await page.keyboard.press("Tab");
      await expect(faqSummary).toBeFocused();
    });
  }
});

test.describe("About area without JavaScript (INFO-02, INFO-03)", () => {
  test.use({ javaScriptEnabled: false });

  for (const slug of SLUGS) {
    test(`${slug}: server HTML holds the collapsed content and one matching FAQPage JSON-LD`, async ({
      page,
      request,
    }) => {
      await expectServerAboutParity(page, request, slug);
    });
  }
});

/**
 * Mocked DoH responses, copied from dns-lookup.spec.ts. Only the Cloudflare
 * primary is counted; the Google fallback exists so no request ever leaves
 * the browser.
 */
const CLOUDFLARE_A_RESPONSE = {
  Status: 0,
  Question: [{ name: "cloudflare.com", type: 1 }],
  Answer: [
    { name: "cloudflare.com", type: 1, TTL: 300, data: "104.16.132.229" },
    { name: "cloudflare.com", type: 1, TTL: 300, data: "104.16.133.229" },
  ],
};

const GOOGLE_A_RESPONSE = {
  Status: 0,
  Question: [{ name: "cloudflare.com.", type: 1 }],
  Answer: [
    { name: "cloudflare.com.", type: 1, TTL: 300, data: "104.16.132.229" },
  ],
};

test.describe("Enter on a summary fires no tool shortcut (INFO-04)", () => {
  test("uuid: Enter on the FAQ summary opens it and does not regenerate", async ({
    page,
  }) => {
    await page.goto("/tools/uuid");

    const hero = page.getByTestId("uuid-hero-value");
    const first = await hero.textContent();

    // Control: Enter on a non-interactive target regenerates, so the
    // shortcut is live and a pass below cannot be vacuous.
    await page.locator("h1").click();
    await page.keyboard.press("Enter");
    await expect(async () => {
      expect(await hero.textContent()).not.toBe(first);
    }).toPass();

    const before = await hero.textContent();
    const faq = page.getByTestId("uuid-faq");
    await faq.locator("summary").focus();
    await page.keyboard.press("Enter");

    await expect(faq).toHaveAttribute("open", "");
    await page.waitForTimeout(500);
    expect(await hero.textContent()).toBe(before);
  });

  test("dns: Enter on the FAQ summary opens it and sends no lookup", async ({
    page,
  }) => {
    let cloudflareCalls = 0;
    await page.route("**/cloudflare-dns.com/**", (route) => {
      cloudflareCalls += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/dns-json",
        body: JSON.stringify(CLOUDFLARE_A_RESPONSE),
      });
    });
    await page.route("**/dns.google/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(GOOGLE_A_RESPONSE),
      })
    );

    await page.goto("/tools/dns");
    await expect(page.getByTestId("dns-record-value").first()).toBeVisible();
    // Let the debounced initial lookup settle before counting.
    await page.waitForTimeout(800);
    const before = cloudflareCalls;

    const faq = page.getByTestId("dns-faq");
    await faq.locator("summary").focus();
    await page.keyboard.press("Enter");

    await expect(faq).toHaveAttribute("open", "");
    await page.waitForTimeout(800);
    expect(cloudflareCalls).toBe(before);

    // Control: Enter on a non-interactive target runs a new lookup.
    await page.locator("h1").click();
    await page.keyboard.press("Enter");
    await expect.poll(() => cloudflareCalls).toBeGreaterThan(before);
  });
});

/*
 * Scoping rationale: the overflow checks measure the About section, not
 * documentElement. A document-level check would also measure each tool
 * island, whose 320px behavior no Phase 10 plan owns (Subnet 320px
 * no-overflow is a Phase 11 target, SC-4/SUBNET-10, and Config has no prior
 * page-level 320px check). main is `w-full` inside the flex-column body, so
 * the tool island cannot widen the section. The document-level check is kept
 * for hash only, mirroring hash-layout.spec.ts INT-03 at the same 320x800
 * viewport and both color schemes.
 */
test.describe("About area layout at 320px (UI E1, E2, E3)", () => {
  for (const slug of SLUGS) {
    for (const scheme of ["light", "dark"] as const) {
      test(`${slug} (${scheme}): About area adds no horizontal overflow, nothing truncated, focus ring cannot be clipped`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 320, height: 800 });
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(`/tools/${slug}`);
        await openAbout(page, slug);

        const failures = await page.evaluate((s) => {
          const out: string[] = [];
          const root = document.documentElement;
          const section = document.querySelector<HTMLElement>(
            'section[data-testid="about-tool"]'
          );
          const example = document.querySelector<HTMLElement>(
            `[data-testid="${s}-worked-example"]`
          );
          const faq = document.querySelector<HTMLElement>(
            `[data-testid="${s}-faq"]`
          );
          if (!section || !example || !faq) {
            return ["About structure elements are missing"];
          }
          const group = example.parentElement as HTMLElement;
          const fits = (el: Element) => el.scrollWidth <= el.clientWidth + 1;
          const name = (el: Element) =>
            `${el.tagName.toLowerCase()}${
              el.getAttribute("data-testid")
                ? `[${el.getAttribute("data-testid")}]`
                : ""
            }`;

          // Section-level: scrollWidth and right edge inside the viewport.
          if (!fits(section)) out.push("section scrollWidth exceeds clientWidth");
          if (section.getBoundingClientRect().right > root.clientWidth + 1) {
            out.push("section right edge is past the viewport");
          }
          for (const el of [group, example, faq]) {
            if (!fits(el)) out.push(`${name(el)} overflows horizontally`);
          }

          // Per-element: FAQ paragraphs and every worked-example element,
          // except the Config code pane, which scrolls by design.
          const pane = document.querySelector(
            '[data-testid="config-worked-example-preview"]'
          );
          const items = [
            ...faq.querySelectorAll(`[data-testid="${s}-faq-item"] p`),
            ...example.querySelectorAll("*"),
          ].filter((el) => !(pane && pane.contains(el)));
          for (const el of items) {
            if (!fits(el)) out.push(`${name(el)} overflows horizontally`);
            if (getComputedStyle(el).textOverflow === "ellipsis") {
              out.push(`${name(el)} truncates with an ellipsis`);
            }
          }

          // Summaries: single line, no horizontal overflow.
          for (const summary of [
            example.querySelector("summary"),
            faq.querySelector("summary"),
          ]) {
            if (!summary) {
              out.push("a summary is missing");
              continue;
            }
            if (summary.getBoundingClientRect().height > 48) {
              out.push(`summary "${summary.textContent?.trim()}" wraps`);
            }
            if (!fits(summary)) out.push("summary overflows horizontally");
          }

          // No clipping container, so the focus ring stays visible.
          for (const el of [section, group, example, faq]) {
            const style = getComputedStyle(el);
            if (style.overflowX !== "visible" || style.overflowY !== "visible") {
              out.push(`${name(el)} clips its overflow`);
            }
          }

          if (s === "hash" && root.scrollWidth > root.clientWidth) {
            out.push("hash page scrolls horizontally at the document level");
          }
          return out;
        }, slug);

        expect(failures).toEqual([]);
      });
    }
  }
});
