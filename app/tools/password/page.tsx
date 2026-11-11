import type { Metadata } from "next";
import { SITE_URL } from "@/app/sitemap";
import { ToolAbout } from "@/components/ToolAbout";
import { faqItems } from "./faq-data";
import { PasswordExample } from "./PasswordExample";
import { PasswordToolLoader } from "./PasswordToolLoader";

const TITLE = "Password & Passphrase Generator — Packetory";
const DESCRIPTION =
  "Generate strong random passwords and memorable EFF passphrases with a strength meter and crack-time estimate. Runs locally in your browser.";
const CANONICAL_URL = `${SITE_URL}/tools/password`;

/**
 * Launch metadata (PREG-02, D-12): unique title and description, a canonical
 * link and Open Graph tags, and no robots entry, so the page is indexable. The
 * "Runs locally in your browser" wording in the description and intro is
 * covered by the recorded human privacy-wording check (D-15).
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: CANONICAL_URL,
    type: "website",
  },
};

/**
 * /tools/password - Server Component shell (D-01). Renders the page chrome,
 * the one client-only subtree (`PasswordToolLoader`) and the shared About area
 * (worked example and FAQ, D-13). The island and the word list are never
 * imported here, so no generated password or list can reach the prerendered
 * HTML or any CDN cache of it (PWD-01, PHR-03).
 */
export default function PasswordPage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-[32px] leading-[1.2] font-semibold text-foreground">
          Password Generator
        </h1>
        <p
          data-testid="password-intro"
          className="mt-4 text-[16px] leading-[1.5] font-normal text-muted-foreground"
        >
          Generate a strong random password or a memorable passphrase and copy
          it in one click. Runs locally in your browser.
        </p>
        <div className="mt-8">
          <PasswordToolLoader />
        </div>

        <ToolAbout slug="password" faqItems={faqItems}>
          <PasswordExample />
        </ToolAbout>
      </main>
    </div>
  );
}
