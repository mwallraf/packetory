/**
 * Single source of truth for the MAC Address Inspector tool page's FAQ
 * content and worked example (MAC-09, MAC-10). Both the visible FAQ prose
 * and the FAQPage JSON-LD in `page.tsx` map over `faqItems`, so structured
 * data and on-screen content cannot drift — mirrors
 * `app/tools/dns/faq-data.ts`'s established pattern.
 *
 * `sampleMac` is the same real, recognizable Apple-range OUI (3C:22:FB)
 * `MacTool.tsx` seeds on mount (D-06) — its first octet (0x3C) has the U/L
 * bit clear (universally administered), so it will never be flagged as
 * locally-administered/randomized once 05-02 ships bit classification.
 * `sampleFormats` are the real, hand-verified output of
 * `lib/mac/format.ts`'s `formatMac` for that address (matching how
 * `app/tools/dns/faq-data.ts` hardcodes real computed values as literal
 * constants rather than importing the lib at build time).
 *
 * Privacy copy note (D-01/D-02/MAC-10): the vendor-lookup-disclosure FAQ
 * item below states the exact locked wording from `05-UI-SPEC.md`'s
 * Copywriting Contract — only the first 3 bytes (the OUI) of a MAC address
 * are ever sent to Packetory's server for a vendor lookup, the rest never
 * leaves the browser and is never stored or sent to analytics. Vendor
 * lookup itself ships in 05-03; this FAQ answer previews that disclosure
 * ahead of the feature landing so the privacy commitment is documented
 * from this tool's very first shipped version.
 */

export type FaqItem = {
  question: string;
  answer: string;
};

/** Real, hand-verified worked-example MAC address (D-06) — a recognizable
 * Apple-range OUI, matching `MacTool.tsx`'s `DEFAULT_MAC`. */
export const sampleMac = "3C:22:FB:AA:BB:CC";

/** Real output of `formatMac` for `sampleMac` (05-RESEARCH.md's Code
 * Examples section), captured as literal constants. */
export const sampleFormats = {
  colon: "3C:22:FB:AA:BB:CC",
  dash: "3C-22-FB-AA-BB-CC",
  dot: "3C22.FBAA.BBCC",
  none: "3C22FBAABBCC",
};

export const faqItems: FaqItem[] = [
  {
    question: "What MAC address formats does this tool accept?",
    answer:
      "Any common separator style — colon (00:1A:2B:3C:4D:5E), dash (00-1A-2B-3C-4D-5E), Cisco dot notation (001A.2B3C.4D5E), or no separator at all (001A2B3C4D5E). Paste a messy value with stray whitespace and this tool still extracts the 12 hex digits correctly; it strips every non-hex character first rather than assuming a specific separator style.",
  },
  {
    question: "Where does my MAC address go when I use this tool?",
    answer:
      "Format normalization runs entirely in your browser and never touches the network. Vendor lookups only send the first 3 bytes (the OUI) of your MAC address to our server, which checks a public vendor database — the rest of the address never leaves your browser and is never stored or sent to analytics.",
  },
  {
    question: "What does \"likely randomized (privacy MAC)\" mean?",
    answer:
      "This address has the locally-administered bit set, a pattern used by iOS/Android/Windows MAC randomization — it may not reflect the device's real hardware vendor. This is a hedge, not a certainty: the underlying bit is a well-documented IEEE convention, but software can set it for reasons other than randomization too.",
  },
  {
    question: "Why does this tool show 4 different formats at once?",
    answer:
      "Different tools expect different formats — Wireshark and most software use colon-separated, Cisco IOS uses dot notation, Windows commonly shows dashes, and raw/no-separator is common for programmatic use. Showing all 4 at once with one-click copy means you never have to reformat manually.",
  },
];
