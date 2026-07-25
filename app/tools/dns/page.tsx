import type { Metadata } from "next";
import { SITE_URL } from "@/app/sitemap";
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
 * FAQPage JSON-LD (DNS-09/DNS-07 content parity with QUAL-02's precedent),
 * built from the SAME `faqItems` array rendered below — structured data and
 * on-screen content cannot drift. The `<` -> `<` escape mitigates the
 * XSS vector documented in the official Next.js JSON-LD guide (T-04-01,
 * mirrors T-03-01/T-02-04); this is the only `dangerouslySetInnerHTML`
 * usage in this file, and the source data is a static, author-controlled
 * build-time constant.
 */
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

/**
 * /tools/dns — Server Component shell (04-01 walking skeleton, extended in
 * 04-03 with metadata + worked example + FAQ, mirroring
 * `app/tools/subnet/page.tsx`'s full shape). Renders the page chrome and
 * the one dynamic subtree (`DnsToolLoader`, which never server-renders —
 * see `DnsToolLoader.tsx`). This component takes no props and reads no
 * request-time query-string API here, so the route stays statically
 * prerendered.
 */
export default function DnsPage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-[32px] leading-[1.2] font-semibold text-foreground">
          DNS Lookup
        </h1>
        <div className="mt-8">
          <DnsToolLoader />
        </div>

        <section className="mt-12" data-testid="dns-worked-example">
          <h2 className="text-[20px] leading-[1.2] font-semibold text-foreground">
            Worked example
          </h2>
          <div className="mt-4 space-y-2">
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
        </section>

        <section className="mt-12">
          <h2 className="text-[20px] leading-[1.2] font-semibold text-foreground">
            FAQ
          </h2>
          <div className="mt-4 space-y-6">
            {faqItems.map((item) => (
              <div key={item.question} data-testid="dns-faq-item">
                <p className="text-[14px] leading-[1.4] font-semibold text-foreground">
                  {item.question}
                </p>
                <p className="mt-1 text-[16px] leading-[1.5] font-normal text-muted-foreground">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
