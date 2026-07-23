/**
 * Single source of truth for every Packetory tool (SHELL-04).
 *
 * The landing-page grid, site navigation, and sitemap MUST derive their tool
 * lists by importing and iterating/filtering this array — never by
 * hardcoding a tool name or slug inline. Adding a new tool means adding one
 * entry here; no other shared file should require an edit.
 *
 * Shape locked verbatim from project-brief.md §8.1.
 */
export type ToolDefinition = {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  category: "network" | "dns" | "web" | "encode" | "generate";
  keywords: string[];
  icon: string;
  status: "active" | "beta" | "planned";
  clientOnly: boolean;
  featured: boolean;
};

export const tools: ToolDefinition[] = [
  {
    slug: "uuid",
    name: "UUID Generator",
    shortName: "UUID",
    description:
      "Generate UUID v4 and v7 identifiers instantly, single or in batch, with uppercase/lowercase and hyphen formatting plus plain text, CSV, or JSON export.",
    category: "generate",
    keywords: ["uuid", "guid", "v4", "v7", "identifier"],
    icon: "Fingerprint",
    status: "active",
    clientOnly: true,
    featured: true,
  },
  {
    slug: "subnet",
    name: "IP Subnet Calculator",
    shortName: "Subnet",
    description:
      "Break down IPv4 and IPv6 CIDR blocks into network/broadcast addresses, usable host ranges, masks, and reverse DNS zones — auto-detected from your input.",
    category: "network",
    keywords: ["subnet", "cidr", "ipv4", "ipv6", "netmask"],
    icon: "Network",
    status: "planned",
    clientOnly: true,
    featured: true,
  },
  {
    slug: "dns",
    name: "DNS Lookup",
    shortName: "DNS",
    description:
      "Resolve A, AAAA, MX, TXT, NS, and CNAME records over DNS-over-HTTPS with a primary and fallback resolver, showing TTL and lookup duration.",
    category: "dns",
    keywords: ["dns", "doh", "records", "mx", "txt"],
    icon: "Globe",
    status: "planned",
    clientOnly: false,
    featured: false,
  },
  {
    slug: "mac",
    name: "MAC Address Inspector",
    shortName: "MAC",
    description:
      "Normalize MAC addresses as you type, look up the vendor/OUI, and detect locally/universally administered, unicast/multicast, and randomized addressing.",
    category: "network",
    keywords: ["mac", "oui", "vendor", "ethernet"],
    icon: "Cpu",
    status: "planned",
    clientOnly: false,
    featured: false,
  },
];

/**
 * Returns all tools sorted by `featured` (desc) then `name` (case-insensitive,
 * locale-aware ascending). Deterministic even when two entries share the same
 * `featured` value — ties break alphabetically by name.
 */
export function getSortedTools(): ToolDefinition[] {
  return [...tools].sort((a, b) => {
    if (a.featured !== b.featured) {
      return a.featured ? -1 : 1;
    }
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
}

/** Returns the tool with the given slug, or undefined if none matches. */
export function getToolBySlug(slug: string): ToolDefinition | undefined {
  return tools.find((tool) => tool.slug === slug);
}
