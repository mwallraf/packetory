import type { Metadata } from "next";
import { SITE_URL } from "@/app/sitemap";
import { ToolAbout } from "@/components/ToolAbout";
import { UuidToolLoader } from "./UuidToolLoader";
import { faqItems, sampleV4, sampleV7, whenToUseEachNote } from "./faq-data";

const TITLE = "UUID Generator (v4 & v7) — Packetory";
const DESCRIPTION =
  "Generate UUID v4 (random) and v7 (time-ordered) identifiers instantly, in batches of 1–100, with case, hyphen, and export controls. No login, no tracking.";
const CANONICAL_URL = `${SITE_URL}/tools/uuid`;

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
 * /tools/uuid — Server Component shell (UUID-01 thin slice, extended in
 * 02-03 with metadata + worked example + FAQ). Renders the page chrome and
 * the one dynamic subtree (`UuidToolLoader`, which never server-renders —
 * see RESEARCH.md Pattern 1). The About area (worked example, FAQ and the
 * FAQPage JSON-LD) now comes from the shared `ToolAbout` (Phase 10,
 * INFO-01/INFO-05).
 */
export default function UuidPage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-[32px] leading-[1.2] font-semibold text-foreground">
          UUID Generator
        </h1>
        <div className="mt-8">
          <UuidToolLoader />
        </div>

        <ToolAbout slug="uuid" faqItems={faqItems}>
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-[14px] leading-[1.4] font-semibold text-foreground">
                v4:
              </span>
              <span
                data-testid="uuid-worked-example-v4"
                className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground"
              >
                {sampleV4}
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-[14px] leading-[1.4] font-semibold text-foreground">
                v7:
              </span>
              <span
                data-testid="uuid-worked-example-v7"
                className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground"
              >
                {sampleV7}
              </span>
            </div>
            <p className="text-[16px] leading-[1.5] font-normal text-muted-foreground">
              {whenToUseEachNote}
            </p>
          </div>
        </ToolAbout>
      </main>
    </div>
  );
}
