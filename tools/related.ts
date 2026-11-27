type RelatedTool = {
  name: string;
  href: string;
  description: string;
};

export const relatedTools: Readonly<Record<string, readonly RelatedTool[] | undefined>> = {
  uuid: [
    { name: "UUIDTools Decoder", href: "https://uuidtools.com/decode", description: "Inspect an existing UUID’s version, variant, and timestamp where available." },
    { name: "UUIDTools Generators", href: "https://www.uuidtools.com/generate", description: "Generate additional UUID versions, including name-based UUIDs." },
  ],
  subnet: [
    { name: "ipcalc", href: "https://jodies.de/ipcalc", description: "See IPv4 subnet masks and address ranges in binary." },
    { name: "RIPEstat", href: "https://stat.ripe.net/", description: "Explore public IP prefix routing and registration data." },
  ],
  dns: [
    { name: "Google Admin Toolbox Dig", href: "https://toolbox.googleapps.com/apps/dig/", description: "Cross-check DNS records with another lookup tool." },
    { name: "Google Admin Toolbox Check MX", href: "https://toolbox.googleapps.com/apps/checkmx/", description: "Diagnose a domain’s email DNS setup." },
  ],
  mac: [
    { name: "Wireshark OUI Lookup", href: "https://www.wireshark.org/tools/oui-lookup.html", description: "Cross-check a MAC prefix against Wireshark’s vendor database." },
    { name: "MACLookup", href: "https://maclookup.app/", description: "Look up vendor details or use an API for automated lookups." },
  ],
  hash: [
    { name: "CyberChef", href: "https://gchq.github.io/CyberChef/", description: "Hash files or combine hashing with encoding and other transformations." },
    { name: "Text Diff", href: "/tools/diff", description: "See what changed between two text snippets." },
  ],
  config: [
    { name: "Batfish", href: "https://batfish.org/", description: "Analyze how network configurations affect routing and reachability." },
    { name: "Text Diff", href: "/tools/diff", description: "Review changes between two versions of a configuration." },
  ],
  password: [
    { name: "Bitwarden Generator", href: "https://bitwarden.com/help/generator/", description: "Generate passwords and save them directly in your Bitwarden vault." },
    { name: "KeePassXC", href: "https://keepassxc.org/docs/KeePassXC_GettingStarted", description: "Generate passwords and passphrases inside a desktop password manager." },
  ],
  diff: [
    { name: "Meld", href: "https://meldmerge.org/", description: "Compare files or entire folders with a desktop tool." },
    { name: "Hash Generator", href: "/tools/hash", description: "Compute a digest to check whether two text snippets match exactly." },
  ],
};
