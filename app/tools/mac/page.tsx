import type { Metadata } from "next";
import { SITE_URL } from "@/app/sitemap";
import { ToolAbout } from "@/components/ToolAbout";
import { MacToolLoader } from "./MacToolLoader";
import { faqItems, sampleFormats, sampleMac } from "./faq-data";

const TITLE =
  "MAC Address Inspector (colon, dash, Cisco dot, no separator) — Packetory";
const DESCRIPTION =
  "Normalize a MAC address into every common format instantly — colon, dash, Cisco dot notation, and no separator — with one-click copy for each. No login, no tracking.";
const CANONICAL_URL = `${SITE_URL}/tools/mac`;

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
 * /tools/mac — Server Component shell (05-01 walking skeleton). Renders
 * the page chrome and the one dynamic subtree (`MacToolLoader`, which never
 * server-renders — see `MacToolLoader.tsx`). This component takes no props
 * and reads no request-time query-string API here, so the route stays
 * statically prerendered.
 * The About area (worked example, FAQ and the FAQPage JSON-LD) comes from
 * the shared `ToolAbout` (Phase 10, INFO-01/INFO-05).
 */
export default function MacPage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-[32px] leading-[1.2] font-semibold text-foreground">
          MAC Address Inspector
        </h1>
        <div className="mt-8">
          <MacToolLoader />
        </div>

        <ToolAbout slug="mac" faqItems={faqItems}>
          <div className="space-y-2">
            <span className="text-[14px] leading-[1.4] font-semibold text-foreground">
              {sampleMac} normalized
            </span>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
              <div className="flex gap-2">
                <dt className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
                  Colon:
                </dt>
                <dd className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground">
                  {sampleFormats.colon}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
                  Dash:
                </dt>
                <dd className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground">
                  {sampleFormats.dash}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
                  Cisco (dot):
                </dt>
                <dd className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground">
                  {sampleFormats.dot}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
                  No separator:
                </dt>
                <dd className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground">
                  {sampleFormats.none}
                </dd>
              </div>
            </dl>
          </div>
        </ToolAbout>
      </main>
    </div>
  );
}
