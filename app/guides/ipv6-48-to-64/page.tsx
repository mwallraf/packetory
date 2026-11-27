import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/app/sitemap";

const title = "How to Split an IPv6 /48 into /64 Subnets";
const description =
  "An IPv6 /48 contains 65,536 /64 subnets. See which bits change and work through the first and last prefixes using Packetory's subnet calculator.";

export const metadata: Metadata = {
  title: `${title} — Packetory`,
  description,
  alternates: { canonical: `${SITE_URL}/guides/ipv6-48-to-64` },
};

export default function Ipv6SubdivisionGuide() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
      <article className="max-w-3xl space-y-6">
        <h1 className="text-[32px] leading-tight font-semibold">{title}</h1>
        <p>
          An IPv6 /48 contains 65,536 /64 subnets. The first three groups of four
          hexadecimal digits stay fixed, while the fourth group supplies
          16 subnet bits. That gives you 2<sup>16</sup> possible subnet IDs,
          from <code>0000</code> through <code>ffff</code>.
        </p>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Worked example</h2>
          <p>
            Start with <code>2001:db8:1234::/48</code>, a prefix in the IPv6
            documentation range. Keep <code>2001:db8:1234</code> fixed and
            change the fourth group for each subnet.
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            <dt>First subnet</dt><dd><code>2001:db8:1234::/64</code></dd>
            <dt>Second subnet</dt><dd><code>2001:db8:1234:1::/64</code></dd>
            <dt>Last subnet</dt><dd><code>2001:db8:1234:ffff::/64</code></dd>
          </dl>
          <p>
            Subnet IDs are hexadecimal. After <code>000f</code> comes{" "}
            <code>0010</code>, which is 16 in decimal. Each /64 leaves the final
            64 bits for addresses within that subnet.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Check the prefixes in Packetory</h2>
          <p>
            <Link className="underline underline-offset-4" href="/tools/subnet?cidr=2001%3Adb8%3A1234%3A%3A%2F48">
              Open the IPv6 subnet calculator with this /48
            </Link>{" "}
            and select <strong>/64</strong> under <strong>Subdivide this block</strong>.
            The calculator opens the first /64. To inspect another subnet, paste
            its prefix into the calculator.
          </p>
        </section>
      </article>
    </main>
  );
}
