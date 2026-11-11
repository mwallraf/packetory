import type { Metadata } from "next";
import { SITE_URL } from "@/app/sitemap";
import { ToolAbout } from "@/components/ToolAbout";
import { SubnetToolLoader } from "./SubnetToolLoader";
import {
  faqItems,
  sampleIpv4,
  sampleIpv4Fields,
  sampleIpv6,
  sampleIpv6Fields,
  workedExampleNote,
} from "./faq-data";

const TITLE = "IP Subnet Calculator (IPv4 & IPv6) — Packetory";
const DESCRIPTION =
  "Break down any IPv4 or IPv6 CIDR into network, broadcast, host range, masks, and reverse DNS zone instantly, with a bookmarkable URL and one-click copy. No login, no tracking.";
const CANONICAL_URL = `${SITE_URL}/tools/subnet`;

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
 * /tools/subnet — Server Component shell (03-01 IPv4 walking skeleton,
 * extended in 03-05 with metadata + worked example + FAQ). Renders the page
 * chrome and the one dynamic subtree (`SubnetToolLoader`, which never
 * server-renders — see RESEARCH.md Pattern 1). This component takes no
 * props and reads no request-time query-string API here, so the route
 * stays statically prerendered.
 * The About area (worked example, FAQ and the FAQPage JSON-LD) comes from
 * the shared `ToolAbout` (Phase 10, INFO-01/INFO-05).
 */
export default function SubnetPage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-[32px] leading-[1.2] font-semibold text-foreground">
          IP Subnet Calculator
        </h1>
        <div className="mt-8">
          <SubnetToolLoader />
        </div>

        <ToolAbout slug="subnet" faqItems={faqItems}>
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-[14px] leading-[1.4] font-semibold text-foreground">
                IPv4: {sampleIpv4}
              </span>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                <div className="flex gap-2">
                  <dt className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
                    Network:
                  </dt>
                  <dd className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground">
                    {sampleIpv4Fields.network}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
                    Broadcast:
                  </dt>
                  <dd className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground">
                    {sampleIpv4Fields.broadcast}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
                    First host:
                  </dt>
                  <dd className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground">
                    {sampleIpv4Fields.firstHost}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
                    Last host:
                  </dt>
                  <dd className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground">
                    {sampleIpv4Fields.lastHost}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
                    Subnet mask:
                  </dt>
                  <dd className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground">
                    {sampleIpv4Fields.subnetMask}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
                    Reverse DNS zone:
                  </dt>
                  <dd className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground">
                    {sampleIpv4Fields.reverseDns}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="space-y-2">
              <span className="text-[14px] leading-[1.4] font-semibold text-foreground">
                IPv6: {sampleIpv6}
              </span>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                <div className="flex gap-2">
                  <dt className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
                    Compressed:
                  </dt>
                  <dd className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground">
                    {sampleIpv6Fields.compressed}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
                    Expanded:
                  </dt>
                  <dd className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground">
                    {sampleIpv6Fields.expanded}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
                    First address:
                  </dt>
                  <dd className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground">
                    {sampleIpv6Fields.firstAddress}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
                    Last address:
                  </dt>
                  <dd className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground">
                    {sampleIpv6Fields.lastAddress}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
                    Address count:
                  </dt>
                  <dd className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground">
                    {sampleIpv6Fields.addressCount}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
                    Reverse DNS zone:
                  </dt>
                  <dd className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground">
                    {sampleIpv6Fields.reverseDns}
                  </dd>
                </div>
              </dl>
            </div>

            <p className="text-[16px] leading-[1.5] font-normal text-muted-foreground">
              {workedExampleNote}
            </p>
          </div>
        </ToolAbout>
      </main>
    </div>
  );
}
