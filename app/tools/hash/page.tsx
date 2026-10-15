import type { Metadata } from "next";
import { SITE_URL } from "@/app/sitemap";
import { HashToolLoader } from "./HashToolLoader";

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
      </main>
    </div>
  );
}
