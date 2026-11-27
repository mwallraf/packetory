import type { TextDiffInput } from "@/lib/text-diff/types";

export const textDiffExample: TextDiffInput = {
  original: [
    "interface Ethernet0",
    "  ip address 192.0.2.1/24",
    "  no shutdown",
  ].join("\n"),
  modified: [
    "interface Ethernet0",
    "  ip address 192.0.2.2/24",
    "  description Lab uplink",
    "  no shutdown",
  ].join("\n"),
};
