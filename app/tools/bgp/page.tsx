import type { Metadata } from "next";
import { SITE_URL } from "@/app/sitemap";
import { ToolAbout } from "@/components/ToolAbout";
import { BgpTool } from "./BgpTool";
import { examplePrefix, faqItems } from "./faq-data";

const title = "BGP Looking Glass — Packetory";
const description = "Look up a public IP address or prefix and view origin ASNs and AS paths observed by RIPE RIS.";
const url = `${SITE_URL}/tools/bgp`;

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: url },
  openGraph: { title, description, url, type: "website" },
};

export default function BgpPage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-[32px] leading-[1.2] font-semibold text-foreground">BGP Looking Glass</h1>
        <div className="mt-8"><BgpTool /></div>
        <ToolAbout slug="bgp" faqItems={faqItems}>
          <p className="text-base text-muted-foreground">
            Look up <code>{examplePrefix}</code> to see its origin ASN, address range, and observation time.
            Open a collector to expand the peer observations and copy an AS path.
          </p>
        </ToolAbout>
      </main>
    </div>
  );
}
