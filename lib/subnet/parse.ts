/**
 * Framework-agnostic CIDR string parser (SUBNET-01, D-03). No React/Next
 * import — independently testable and reusable by pages and future API
 * routes, exactly like `lib/uuid/generate.ts` and
 * `lib/network/parseForwardedIp.ts`.
 *
 * `parseCidr` is a total function: malformed input always returns a typed
 * `ParseError`, never throws (SUBNET-03 needs a typed result the UI layer
 * can render inline, with no exception bubbling up). A bare address with no
 * `/prefix` is deliberately rejected rather than defaulting to a "sensible"
 * prefix (parse-ambiguity edge, SUBNET-01) — CIDR notation always requires
 * an explicit prefix length.
 *
 * IPv4 vs IPv6 family is auto-detected from the address shape ahead of full
 * validation: a `:` means IPv6, a `.` means IPv4 (RESEARCH.md "family
 * detection is a simple `.`/`:` character-shape check").
 */

export type CidrFamily = "ipv4" | "ipv6";

export type ParsedCidr = {
  family: CidrFamily;
  /** 32-bit (IPv4) or 128-bit (IPv6) address, BigInt end-to-end per D-03 —
   * never `Number()`-coerced (RESEARCH.md Pitfall 4). */
  address: bigint;
  prefixLength: number;
};

export type ParseError = { error: string };

const GENERIC_ERROR_MESSAGE =
  'Enter a valid IPv4 or IPv6 CIDR, like 192.168.1.0/24 or 2001:db8::/32.';

/** Type guard narrowing a `parseCidr` result to its error branch. */
export function isParseError(
  result: ParsedCidr | ParseError
): result is ParseError {
  return "error" in result;
}

/**
 * Parses a `<address>/<prefix>` CIDR string into a typed `ParsedCidr`, or a
 * typed `ParseError` for any malformed input. Never throws.
 */
export function parseCidr(input: string): ParsedCidr | ParseError {
  const trimmed = input.trim();
  if (!trimmed) return { error: GENERIC_ERROR_MESSAGE };

  const slashIndex = trimmed.indexOf("/");
  const secondSlashIndex = trimmed.indexOf("/", slashIndex + 1);
  if (slashIndex === -1 || secondSlashIndex !== -1) {
    // No slash at all (parse-ambiguity edge, SUBNET-01), or more than one
    // slash — both reject rather than guessing.
    return { error: GENERIC_ERROR_MESSAGE };
  }

  const addressPart = trimmed.slice(0, slashIndex);
  const prefixPart = trimmed.slice(slashIndex + 1);

  // Bounded, non-backtracking prefix check (T-03-02: no catastrophic-
  // backtracking regex) — plain digits only, no sign, no decimal.
  if (!addressPart || !/^\d{1,3}$/.test(prefixPart)) {
    return { error: GENERIC_ERROR_MESSAGE };
  }
  const prefixLength = Number(prefixPart);

  const family: CidrFamily | null = addressPart.includes(":")
    ? "ipv6"
    : addressPart.includes(".")
      ? "ipv4"
      : null;
  if (!family) return { error: GENERIC_ERROR_MESSAGE };

  if (family === "ipv4") {
    if (!isValidIpv4Address(addressPart) || prefixLength < 0 || prefixLength > 32) {
      return { error: GENERIC_ERROR_MESSAGE };
    }
    return { family, address: ipv4ToBigInt(addressPart), prefixLength };
  }

  if (!isValidIpv6Address(addressPart) || prefixLength < 0 || prefixLength > 128) {
    return { error: GENERIC_ERROR_MESSAGE };
  }
  const address = ipv6ToBigInt(addressPart);
  if (address === null) return { error: GENERIC_ERROR_MESSAGE };
  return { family, address, prefixLength };
}

/** Four-octet, leading-zero-rejecting IPv4 literal check — ported from
 * `lib/network/parseForwardedIp.ts`'s `isValidIpv4` idiom (RESEARCH.md
 * "Don't Hand-Roll"). */
function isValidIpv4Address(candidate: string): boolean {
  const parts = candidate.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const num = Number(part);
    return num >= 0 && num <= 255 && String(num) === part;
  });
}

/** IPv6 literal syntax check via the WHATWG URL bracket-wrap trick — ported
 * from `lib/network/parseForwardedIp.ts`'s `isValidIpv6` (RESEARCH.md
 * "Don't Hand-Roll"). Validates address syntax only; CIDR-specific
 * prefix-length/network-boundary semantics are this module's own job.
 *
 * Deliberately rejects any candidate containing a `.` (IPv4-mapped/
 * IPv4-compatible IPv6 literals like `::ffff:192.168.1.1`, RFC 4291
 * §2.5.5/§2.5.6). The `URL` bracket trick accepts this notation, but
 * `expandIpv6Groups`/`ipv6ToBigInt` below only understand pure hextet
 * groups and would otherwise disagree with this validator (WR-02) —
 * rejecting here keeps both stages in agreement rather than teaching the
 * expansion path dotted-quad support, per RESEARCH.md's framing that
 * IPv4-mapped addresses aren't explicitly in scope for this phase. */
function isValidIpv6Address(candidate: string): boolean {
  if (!candidate.includes(":") || candidate.includes(".")) return false;
  try {
    new URL(`http://[${candidate}]`);
    return true;
  } catch {
    return false;
  }
}

/** Converts a validated dotted-decimal IPv4 address to a 32-bit BigInt. */
function ipv4ToBigInt(candidate: string): bigint {
  return candidate
    .split(".")
    .reduce((acc, octet) => (acc << 8n) | BigInt(Number(octet)), 0n);
}

/** Expands a validated IPv6 literal (with at most one `::` compression) into
 * its 8 hextet strings, or `null` if the group count doesn't resolve to
 * exactly 8 (defensive — `isValidIpv6Address` should already have rejected
 * this shape, but this function must not throw for any string). */
function expandIpv6Groups(candidate: string): string[] | null {
  const doubleColonCount = (candidate.match(/::/g) || []).length;
  if (doubleColonCount > 1) return null;

  if (candidate.includes("::")) {
    const [headPart, tailPart] = candidate.split("::");
    const head = headPart ? headPart.split(":") : [];
    const tail = tailPart ? tailPart.split(":") : [];
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    return [...head, ...Array<string>(missing).fill("0"), ...tail];
  }

  const groups = candidate.split(":");
  return groups.length === 8 ? groups : null;
}

/** Converts a validated IPv6 address literal to a 128-bit BigInt, or `null`
 * if it doesn't resolve to exactly 8 valid hextets. */
function ipv6ToBigInt(candidate: string): bigint | null {
  const groups = expandIpv6Groups(candidate);
  if (!groups) return null;

  let result = 0n;
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
    result = (result << 16n) | BigInt(parseInt(group, 16));
  }
  return result;
}
