import type { Metadata } from "next";
import { SITE_URL } from "@/app/sitemap";
import { ToolAbout } from "@/components/ToolAbout";
import { ConfigExample } from "./ConfigExample";
import { ConfigToolLoader } from "./ConfigToolLoader";
import { faqItems } from "./faq-data";

const TITLE = "Cisco Config Syntax Highlighter — Packetory";
const DESCRIPTION =
  "Highlight Cisco IOS configurations in your browser, redact recognized credentials, and copy formatted output into email or documentation.";
const CANONICAL_URL = `${SITE_URL}/tools/config`;

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
 * /tools/config — Server Component shell. The About area (worked example and
 * FAQ, CFG-01/CFG-02) comes from the shared `ToolAbout` (Phase 10).
 */
export default function ConfigPage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h1 className="text-[32px] leading-[1.2] font-semibold text-foreground">
            Cisco Config Syntax Highlighter
          </h1>
          <p className="mt-4 text-[16px] leading-[1.5] text-muted-foreground">
            Paste a Cisco IOS configuration, preview the highlighting, then copy
            it into email or documentation with its colours and monospace
            formatting intact.
          </p>
        </div>
        <div className="mt-8">
          <ConfigToolLoader />
        </div>

        <ToolAbout slug="config" faqItems={faqItems}>
          <ConfigExample />
          <p className="mt-4 text-muted-foreground">
            Use Anonymize before sharing a configuration. For example, it replaces
            the credential in <code>enable secret 0 example-only</code> with a
            placeholder. Review the preview for sensitive values outside the
            recognized credential formats before copying.
          </p>
        </ToolAbout>
      </main>
    </div>
  );
}
