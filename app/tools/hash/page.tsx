import type { Metadata } from "next";
import { SITE_URL } from "@/app/sitemap";
import { ToolAbout } from "@/components/ToolAbout";
import { HashToolLoader } from "./HashToolLoader";
import { SAMPLE_DIGEST_HEX, SAMPLE_TEXT } from "@/lib/hash/sample";
import { ECHO_HELLO_WORLD_SHA256, faqItems } from "./faq-data";

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
 * /tools/hash - Server Component shell. Renders the page chrome and the one
 * dynamic subtree (`HashToolLoader`, which never server-renders). This
 * component takes no props and reads no request-time query-string API, so the
 * route stays statically prerendered.
 * The About area (worked example, FAQ and the FAQPage JSON-LD) comes from
 * the shared `ToolAbout` (Phase 10, INFO-01/INFO-05).
 */
export default function HashPage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-[32px] leading-[1.2] font-semibold text-foreground">
          Hash Generator
        </h1>
        <div className="mt-8">
          <HashToolLoader />
        </div>

        <ToolAbout slug="hash" faqItems={faqItems}>
          <div className="space-y-4">
            <p className="text-[14px] leading-[1.4] font-semibold text-foreground">
              {SAMPLE_TEXT} hashed with SHA-256
            </p>
            <p
              className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground"
              data-testid="hash-worked-example-sha256"
            >
              {SAMPLE_DIGEST_HEX.sha256}
            </p>
            <div
              className="space-y-1 font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground"
              data-testid="hash-worked-example-printf"
            >
              <p>printf &apos;%s&apos; &apos;{SAMPLE_TEXT}&apos; | sha256sum</p>
              <p className="whitespace-pre-wrap">{`${SAMPLE_DIGEST_HEX.sha256}  -`}</p>
              <p className="text-muted-foreground">(matches this tool)</p>
            </div>
            <div
              className="space-y-1 font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground"
              data-testid="hash-worked-example-echo"
            >
              <p>echo &apos;{SAMPLE_TEXT}&apos; | sha256sum</p>
              <p className="whitespace-pre-wrap">{`${ECHO_HELLO_WORLD_SHA256}  -`}</p>
              <p className="text-muted-foreground">
                (differs: echo appends a newline)
              </p>
            </div>
          </div>
        </ToolAbout>
      </main>
    </div>
  );
}
