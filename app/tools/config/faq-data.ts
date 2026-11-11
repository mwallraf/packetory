/**
 * Single source of truth for the Config tool page's FAQ content and worked
 * example (Phase 10, CFG-01, CFG-02). `ToolAbout` maps over `faqItems` for both
 * the visible FAQ prose and the FAQPage JSON-LD, so structured data and
 * on-screen content cannot drift.
 *
 * Copy rules:
 * - The privacy answer is limited to the shipped claim (the ConfigTool footer
 *   sentence) plus the strip-secrets tip; no added processing claim (D-15).
 * - Rich copy outcomes in third-party apps are phrased "should keep", never
 *   "keeps" (D-17).
 * - The sample uses RFC 5737 documentation addresses only and no secrets (D-09).
 */

export type FaqItem = {
  question: string;
  answer: string;
};

/**
 * Worked-example configuration (D-09). Every IPv4 literal is an RFC 5737
 * documentation address, apart from the default route (0.0.0.0), the netmask
 * (255.255.255.252) and the wildcard (0.0.0.255). No credentials of any kind.
 */
export const SAMPLE_CONFIG = `hostname edge-rtr-01
!
interface GigabitEthernet0/1
 description Uplink to ISP
 ip address 192.0.2.1 255.255.255.252
!
ip access-list extended MGMT-IN
 remark allow SSH from docs net
 permit tcp 198.51.100.0 0.0.0.255 any eq 22
!
ip route 0.0.0.0 0.0.0.0 192.0.2.2`;

export const faqItems: FaqItem[] = [
  {
    question: "Is my configuration uploaded anywhere?",
    answer:
      "No. Your configuration stays in this browser tab and is never uploaded or saved. Even so, it is good practice to remove passwords, keys and SNMP community strings before you paste a configuration into any tool or share it with others.",
  },
  {
    question:
      "How do I paste highlighted config into Outlook, Word or Google Docs?",
    answer:
      "Click Copy for email, then paste. Email and document apps such as Outlook, Word and Google Docs should keep the colors and the monospace font. Use Copy plain text when you need the raw configuration, for example to paste it back into a terminal or into a ticket system that strips formatting. If your browser blocks rich copying, the button shows Copied as plain text and the plain configuration is copied instead.",
  },
  {
    question: "Which vendors and syntaxes are supported?",
    answer:
      "The Cisco IOS / IOS-XE / IOS-XR profile colors commands, keywords, interface names, IPv4 and IPv6 addresses, numbers, description and remark text, and comment lines that start with ! or #. Configurations from other vendors are not specifically supported. Choose Plain text to show and copy any configuration in a monospace font with no syntax coloring.",
  },
  {
    question: "What is the Monochrome option for?",
    answer:
      "Monochrome removes the colors but keeps the monospace font, bold commands and keywords, and italic comments. Use it for printing, grayscale documents, or anywhere colored text is hard to read or not allowed. It applies to both the preview and Copy for email; Copy plain text never carries formatting.",
  },
];
