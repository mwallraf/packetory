import type { Metadata } from "next";
import { SITE_URL } from "@/app/sitemap";
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
 * FAQPage JSON-LD (QUAL-02, D-11), built from the SAME `faqItems` array
 * rendered below — structured data and on-screen content cannot drift.
 * The `<` -> `<` escape mitigates the XSS vector documented in the
 * official Next.js JSON-LD guide (T-02-04); this is the only
 * `dangerouslySetInnerHTML` usage in this file, and the source data is a
 * static, author-controlled build-time constant.
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
 * /tools/uuid — Server Component shell (UUID-01 thin slice, extended in
 * 02-03 with metadata + worked example + FAQ). Renders the page chrome and
 * the one dynamic subtree (`UuidToolLoader`, which never server-renders —
 * see RESEARCH.md Pattern 1).
 */
export default function UuidPage() {
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
          UUID Generator
        </h1>
        <div className="mt-8">
          <UuidToolLoader />
        </div>

        <section className="mt-12">
          <h2 className="text-[20px] leading-[1.2] font-semibold text-foreground">
            Worked example
          </h2>
          <div className="mt-4 space-y-3">
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
        </section>

        <section className="mt-12">
          <h2 className="text-[20px] leading-[1.2] font-semibold text-foreground">
            FAQ
          </h2>
          <div className="mt-4 space-y-6">
            {faqItems.map((item) => (
              <div key={item.question} data-testid="uuid-faq-item">
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
