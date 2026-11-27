import { expect, test } from "@playwright/test";
import { tools } from "../../tools/registry";
import { expectServerAboutParity } from "../e2e/helpers/about-parity";

/**
 * Phase 10 SC-1 structure and SC-2 raw-HTML / FAQPage JSON-LD parity must hold
 * on the build that ships, not only under `next dev`. This runs the same
 * assertions as the about.spec.ts "About area without JavaScript" describe,
 * through the shared helper, against `next build` + `next start` on :3101.
 */

const SLUGS = tools.filter((t) => t.status !== "planned").map((t) => t.slug);

test.describe("About area in the production build without JavaScript (INFO-01, INFO-02, INFO-03)", () => {
  test.use({ javaScriptEnabled: false });

  for (const slug of SLUGS) {
    test(`${slug}: production server HTML holds the closed About area and one matching FAQPage JSON-LD`, async ({
      page,
      request,
    }) => {
      await expectServerAboutParity(page, request, slug);
      const related = page.getByTestId(`${slug}-related-tools`);
      const links = related.getByRole("link");
      await expect(related).not.toHaveAttribute("open", "");
      await expect(links).toHaveCount(0);
      await related.getByText("Related tools", { exact: true }).click();
      await expect(links).toHaveCount(2);
      expect(await links.evaluateAll((items) => items.some((item) =>
        item.getAttribute("href")?.startsWith("https://") && item.getAttribute("rel") === "noreferrer"
      ))).toBe(true);
    });
  }
});
