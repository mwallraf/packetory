import type { Metadata } from "next";
import { SITE_URL } from "@/app/sitemap";
import { ToolAbout } from "@/components/ToolAbout";
import { DnsToolLoader } from "./DnsToolLoader";
import {
  faqItems,
  sampleDomain,
  sampleFields,
  sampleRecordType,
  workedExampleNote,
} from "./faq-data";

const TITLE =
  "DNS Lookup (A, AAAA, MX, TXT, NS, CNAME over DoH) — Packetory";
const DESCRIPTION =
  "Look up A, AAAA, MX, TXT, NS, and CNAME records over DNS-over-HTTPS with a Cloudflare-primary/Google-fallback resolver, instantly and with a bookmarkable URL. No login, no tracking.";
const CANONICAL_URL = `${SITE_URL}/tools/dns`;

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
 * /tools/dns — Server Component shell (04-01 walking skeleton, extended in
 * 04-03 with metadata + worked example + FAQ, mirroring
 * `app/tools/subnet/page.tsx`'s full shape). Renders the page chrome and
 * the one dynamic subtree (`DnsToolLoader`, which never server-renders —
 * see `DnsToolLoader.tsx`). This component takes no props and reads no
 * request-time query-string API here, so the route stays statically
 * prerendered.
 * The About area (worked example, FAQ and the FAQPage JSON-LD) comes from
 * the shared `ToolAbout` (Phase 10, INFO-01/INFO-05).
 */
export default function DnsPage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-[32px] leading-[1.2] font-semibold text-foreground">
          DNS Lookup
        </h1>
        <div className="mt-8">
          <DnsToolLoader />
        </div>

        <ToolAbout slug="dns" faqItems={faqItems}>
          <div className="space-y-2">
            <span className="text-[14px] leading-[1.4] font-semibold text-foreground">
              {sampleRecordType} record for {sampleDomain}
            </span>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
              <div className="flex gap-2">
                <dt className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
                  Value:
                </dt>
                <dd className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground">
                  {sampleFields.value}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
                  TTL:
                </dt>
                <dd className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground">
                  {sampleFields.ttl}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
                  Resolver used:
                </dt>
                <dd className="text-[16px] leading-[1.5] font-normal break-all text-foreground">
                  {sampleFields.resolver}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
                  Lookup duration:
                </dt>
                <dd className="text-[16px] leading-[1.5] font-normal break-all text-foreground">
                  {sampleFields.durationMs}ms
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-[16px] leading-[1.5] font-normal text-muted-foreground">
              {workedExampleNote}
            </p>
          </div>
        </ToolAbout>
      </main>
    </div>
  );
}
