import type { Metadata } from "next";
import { SITE_URL } from "@/app/sitemap";
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
 * FAQPage JSON-LD (MAC-09 content parity with QUAL-02's precedent), built
 * from the SAME `faqItems` array rendered below — structured data and
 * on-screen content cannot drift. The `<` -> `<` escape mitigates the
 * XSS vector documented in the official Next.js JSON-LD guide (mirrors
 * `app/tools/dns/page.tsx`/`app/tools/subnet/page.tsx`'s identical
 * treatment); this is the only `dangerouslySetInnerHTML` usage in this
 * file, and the source data is a static, author-controlled build-time
 * constant.
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
 * /tools/mac — Server Component shell (05-01 walking skeleton). Renders
 * the page chrome and the one dynamic subtree (`MacToolLoader`, which never
 * server-renders — see `MacToolLoader.tsx`). This component takes no props
 * and reads no request-time query-string API here, so the route stays
 * statically prerendered.
 */
export default function MacPage() {
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
          MAC Address Inspector
        </h1>
        <div className="mt-8">
          <MacToolLoader />
        </div>

        <section className="mt-12" data-testid="mac-worked-example">
          <h2 className="text-[20px] leading-[1.2] font-semibold text-foreground">
            Worked example
          </h2>
          <div className="mt-4 space-y-2">
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
        </section>

        <section className="mt-12">
          <h2 className="text-[20px] leading-[1.2] font-semibold text-foreground">
            FAQ
          </h2>
          <div className="mt-4 space-y-6">
            {faqItems.map((item) => (
              <div key={item.question} data-testid="mac-faq-item">
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
