/**
 * Single source of truth for the Subnet tool page's FAQ content and worked
 * example (D-01, D-02, D-04, D-05, D-06; SUBNET-04, SUBNET-05). Both the
 * visible FAQ prose and the FAQPage JSON-LD in `page.tsx` map over
 * `faqItems`, so structured data and on-screen content cannot drift —
 * mirrors `app/tools/uuid/faq-data.ts`'s established pattern.
 *
 * Worked-example field values below are literal, hand-verified constants
 * (matching how `app/tools/uuid/faq-data.ts` hardcodes real generated
 * sample UUIDs), not computed at render time:
 * - IPv4 fields (`sampleIpv4Fields`) were produced by the actual
 *   `lib/subnet/ipv4.ts` (`computeIpv4`) + `lib/subnet/reverse-dns.ts`
 *   (`ipv4ReverseZone`) functions for `sampleIpv4`, run live via `npx tsx`
 *   during planning (03-05-SUMMARY.md records the verification).
 * - IPv6 fields (`sampleIpv6Fields`) were computed by hand and
 *   cross-checked against `lib/subnet/format.ts` (`compressIpv6`,
 *   `expandIpv6`) + `lib/subnet/reverse-dns.ts` (`ipv6ReverseZone`), also
 *   run live via `npx tsx`. `lib/subnet/ipv6.ts` (the IPv6 network/host
 *   masking module) ships in a later plan in this phase (03-03) — this
 *   content-only plan (wave 2, depends only on 03-01) cannot import a
 *   module that doesn't exist yet, so these are literal verified values
 *   rather than a live import.
 *
 * Privacy copy note (D-01): the FAQ states the tool runs entirely
 * client-side and sends nothing you enter to a server, but never claims or
 * describes collecting/reporting the entered CIDR value.
 */

export type FaqItem = {
  question: string;
  answer: string;
};

export const faqItems: FaqItem[] = [
  {
    question: "Why do /31 and /127 show both addresses as usable?",
    answer:
      "RFC 3021 defines IPv4 /31 as a point-to-point link prefix with no broadcast address, so both addresses in the block are host-usable instead of one being reserved as network and the other as broadcast. IPv6 /127 follows the same convention. Every other prefix length keeps the ordinary network-address/broadcast-address-reserved behavior.",
  },
  {
    question: "Why is the reverse-DNS zone sometimes shown with a note?",
    answer:
      "A clean reverse-DNS zone name only exists at whole-octet boundaries for IPv4 (/8, /16, /24, /32) or whole-nibble boundaries for IPv6 (every multiple of /4). When your prefix falls in between, the zone shown is truncated to the nearest fully covered boundary and flagged with an inline note — building the full classless-delegation name (RFC 2317) for in-between prefixes is out of scope for this tool.",
  },
  {
    question: "What do the /48, /56, and /64 subdivision buttons do?",
    answer:
      "For IPv6 blocks between /48 and /64, the tool suggests common next-step subnet sizes. Clicking one replaces the CIDR input — and the URL — with the first available sub-block at that prefix length and recomputes the whole result for it, the same one-CIDR-in, one-result-out behavior as typing a new value directly. There's no separate drill-down view or back-to-parent history to manage.",
  },
  {
    question: "Can I share a specific subnet result with a teammate?",
    answer:
      "Yes — every CIDR you enter, or subdivision you click, updates the page URL (for example /tools/subnet?cidr=192.168.1.0%2F24). Copy that URL and send it to anyone; opening it reproduces the exact same result immediately, with no login or setup required.",
  },
  {
    question: "Does this tool send the CIDR I enter anywhere?",
    answer:
      "No. All subnet math runs entirely in your browser using native BigInt arithmetic — nothing you type is sent to a server or logged, and the CIDR value is deliberately kept out of analytics.",
  },
];

/** Real, documentation-safe example CIDRs for the worked example (D-02). */
export const sampleIpv4 = "192.168.1.0/24";
export const sampleIpv6 = "2001:db8::/32";

/** Hand-verified IPv4 worked-example fields (SUBNET-04) for `sampleIpv4`. */
export const sampleIpv4Fields = {
  network: "192.168.1.0",
  broadcast: "192.168.1.255",
  firstHost: "192.168.1.1",
  lastHost: "192.168.1.254",
  subnetMask: "255.255.255.0",
  reverseDns: "1.168.192.in-addr.arpa.",
};

/** Hand-verified IPv6 worked-example fields (SUBNET-05) for `sampleIpv6`. */
export const sampleIpv6Fields = {
  compressed: "2001:db8::",
  expanded: "2001:db8:0:0:0:0:0:0",
  firstAddress: "2001:db8::",
  lastAddress: "2001:db8:ffff:ffff:ffff:ffff:ffff:ffff",
  addressCount: "79228162514264337593543950336",
  reverseDns: "8.b.d.0.1.0.0.2.ip6.arpa.",
};

/** One-line worked-example note (mirrors UUID's `whenToUseEachNote` shape). */
export const workedExampleNote =
  "Both examples use documentation-safe ranges — 192.168.1.0/24 is a private RFC 1918 range, and 2001:db8::/32 is the IANA-reserved IPv6 documentation prefix (RFC 3849) — so nothing here reveals a real network.";
