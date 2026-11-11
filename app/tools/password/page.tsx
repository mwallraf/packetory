import type { Metadata } from "next";
import { SITE_URL } from "@/app/sitemap";
import { PasswordToolLoader } from "./PasswordToolLoader";

const TITLE = "Password Generator — Packetory";
const DESCRIPTION =
  "Generate strong random passwords in your browser, with length, character-set, symbol and batch options.";
const CANONICAL_URL = `${SITE_URL}/tools/password`;

/**
 * Pre-launch metadata (D-04): the page is reachable only by direct URL and is
 * kept out of search results until it is registered. Phase 14 replaces this
 * block with the final metadata, removes `noindex` and registers the tool. The
 * description deliberately makes no privacy or security claim: that wording
 * needs explicit human approval in Phase 14 (PREG-02).
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL_URL },
  robots: { index: false, follow: false },
};

/**
 * /tools/password - Server Component shell (D-01). Renders only the page
 * chrome and the one client-only subtree (`PasswordToolLoader`). The island is
 * never imported here, so no generated password can reach the prerendered HTML
 * or any CDN cache of it (PWD-01). No ToolAbout, FAQ or JSON-LD in this phase.
 */
export default function PasswordPage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-[32px] leading-[1.2] font-semibold text-foreground">
          Password Generator
        </h1>
        <div className="mt-8">
          <PasswordToolLoader />
        </div>
      </main>
    </div>
  );
}
