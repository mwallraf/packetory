import { expect, test } from "@playwright/test";
import { tools } from "../../tools/registry";
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
