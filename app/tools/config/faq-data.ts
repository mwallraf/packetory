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

export const faqItems: FaqItem[] = [];
