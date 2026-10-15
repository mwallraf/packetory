import type { Metadata } from "next";
import { SITE_URL } from "@/app/sitemap";
import { HashToolLoader } from "./HashToolLoader";
import { faqItems } from "./faq-data";

const TITLE =
  "Hash Generator (MD5, SHA-1, SHA-256, SHA-3, CRC32) — Packetory";
const DESCRIPTION =
  "Generate MD5, SHA-1, SHA-256, SHA-512, SHA3, RIPEMD-160 and CRC32 hashes of any text as you type. Copy as hex or Base64 and verify a checksum. Hashing runs in your browser. No login.";
const CANONICAL_URL = `${SITE_URL}/tools/hash`;

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
 * FAQPage JSON-LD (INTG-02), built from the SAME `faqItems` array rendered
 * below so structured data and on-screen content cannot drift. The `<` ->
 * `\u003c` escape mitigates the XSS vector documented in the official
 * Next.js JSON-LD guide (mirrors `app/tools/mac/page.tsx`); the source data
 * is a static, author-controlled build-time constant.
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
 * /tools/hash - Server Component shell. Renders the page chrome and the one
 * dynamic subtree (`HashToolLoader`, which never server-renders). This
 * component takes no props and reads no request-time query-string API, so the
 * route stays statically prerendered.
 */
export default function HashPage() {
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
          Hash Generator
        </h1>
        <div className="mt-8">
          <HashToolLoader />
        </div>

        <section className="mt-12">
          <h2 className="text-[20px] leading-[1.2] font-semibold text-foreground">
            FAQ
          </h2>
          <div className="mt-4 space-y-6">
            {faqItems.map((item) => (
              <div key={item.question} data-testid="hash-faq-item">
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
