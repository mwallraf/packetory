import { expect, type Page } from "@playwright/test";

export type AboutSection = "worked-example" | "faq";

/**
 * Opens the shared About disclosures on a tool page.
 *
 * A closed `<details>` element is itself visible to Playwright while its
 * content is hidden, so this helper asserts the `open` attribute rather than
 * visibility (RESEARCH Pitfall 3). The click works before hydration because
 * the toggle is native browser behavior.
 */
export async function openAbout(
  page: Page,
  slug: string,
  sections: AboutSection[] = ["worked-example", "faq"]
): Promise<void> {
  for (const section of sections) {
    const details = page.getByTestId(`${slug}-${section}`);
    await expect(details).toBeAttached();
    if ((await details.getAttribute("open")) === null) {
      await details.locator("summary").click();
    }
    await expect(details).toHaveAttribute("open", "");
  }
}
