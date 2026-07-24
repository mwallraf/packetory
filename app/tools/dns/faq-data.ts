/**
 * Single source of truth for the DNS Lookup tool page's FAQ content and
 * worked example (D-02, D-09, D-10, D-11; DNS-07, DNS-09). Both the visible
 * FAQ prose and the FAQPage JSON-LD in `page.tsx` map over `faqItems`, so
 * structured data and on-screen content cannot drift — mirrors
 * `app/tools/subnet/faq-data.ts`'s established pattern.
 *
 * Worked-example field values (`sampleFields`) are literal, hand-verified
 * constants (matching how `app/tools/subnet/faq-data.ts` hardcodes real
 * computed values), not computed at render time: `sampleFields.value` and
 * `.ttl` were captured from a real, live `cloudflare-dns.com` type-A DoH
 * query for `cloudflare.com` on 2026-07-24 —
 * `curl -H "accept: application/dns-json" \
 *   "https://cloudflare-dns.com/dns-query?name=cloudflare.com&type=A"`
 * returned `{"Status":0,...,"Answer":[{"name":"cloudflare.com","type":1,
 * "TTL":13,"data":"104.16.133.229"},{"name":"cloudflare.com","type":1,
 * "TTL":13,"data":"104.16.132.229"}]}` — the first answer's value/TTL are
 * used verbatim below. `sampleFields.resolver`/`.durationMs` are
 * illustrative UI-display values (matching the "Primary resolver" Badge
 * text and integer-ms duration meta this tool actually renders), not
 * re-queried on every build.
 *
 * Privacy copy note (D-02): the resolver-disclosure FAQ item below states
 * plainly that lookups are sent to Cloudflare (primary) and Google
 * (fallback), and that the domain entered is never stored or sent anywhere
 * else — the same disclosure principle is also reflected on the published
 * privacy notice (`app/privacy/page.tsx`).
 */

export type FaqItem = {
  question: string;
  answer: string;
};

export const faqItems: FaqItem[] = [
  {
    question: "Where do my DNS lookups go?",
    answer:
      "Lookups are sent to Cloudflare (primary) and, only if Cloudflare is unavailable, Google (fallback) — the domain you enter is never stored or sent anywhere else. Both are public, unauthenticated DNS-over-HTTPS (DoH) endpoints queried directly from your browser; Packetory's own servers never see the domain you look up.",
  },
  {
    question: "Why does this tool use two different DNS resolvers?",
    answer:
      "Cloudflare is the primary resolver for every lookup. Google is used only as an explicit fallback, and only when Cloudflare genuinely fails to answer (a network error, a server error, a timeout, or a rate limit) — never as a silent alternative when the two could return different results. The resolver badge always shows which one actually answered (\"Primary resolver\" or \"Fallback resolver\"), so you're never left guessing.",
  },
  {
    question: "What's the difference between an A and an AAAA record?",
    answer:
      "An A record maps a domain to an IPv4 address; an AAAA record maps it to an IPv6 address. A domain can have either, both, or neither — this tool queries whichever record type you have selected, one type at a time.",
  },
  {
    question: "What does TTL mean?",
    answer:
      "TTL (Time To Live) is the number of seconds a DNS answer is allowed to be cached before it must be looked up again. A short TTL (seconds) means the value can change quickly — common for services like Cloudflare's own edge network — while a long TTL (hours or days) suggests a value that rarely changes.",
  },
  {
    question:
      "What's the difference between \"domain not found\" and an empty result?",
    answer:
      "\"Domain not found\" (NXDOMAIN) means the domain itself doesn't exist anywhere in DNS. An empty result means the domain does exist, but it has no records of the record type you selected — for example, a domain with no mail server will return an empty result for MX, not an error.",
  },
];

/** Real, hand-verified worked-example domain and record type (D-10, D-11). */
export const sampleDomain = "cloudflare.com";
export const sampleRecordType = "A";

/**
 * Hand-verified worked-example fields (DNS-07) for a real
 * `cloudflare.com` type-A lookup — see the header comment above for the
 * exact live query this was captured from. `durationMs` is illustrative
 * (a representative value for what the duration meta looks like), not a
 * literal re-measurement.
 */
export const sampleFields = {
  value: "104.16.133.229",
  ttl: 13,
  resolver: "Primary resolver",
  durationMs: 142,
};

/** One-line worked-example note (mirrors Subnet's `workedExampleNote` shape). */
export const workedExampleNote =
  "cloudflare.com is a real, stable domain used as this tool's zero-effort default on load. Its TTL is intentionally short (seconds, not hours) since it's served from a globally distributed edge network — a good illustration of why the same lookup can return a different value if you run it again a few minutes later.";
