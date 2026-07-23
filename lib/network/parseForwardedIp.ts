/**
 * Minimal Headers-like accessor so this module stays framework-agnostic
 * (works with the Fetch API's Headers, a plain object, or a test double) —
 * project-brief.md §8 requires core logic to be independently testable and
 * reusable by pages and future API routes.
 */
export type HeaderReader = { get(name: string): string | null };

/**
 * Reads the platform-trusted visitor IP from forwarded-IP headers (D-05).
 *
 * Trust model (threat T-03-01): `x-forwarded-for` is a comma-separated list
 * where the left-most entry is the original client IP set by the platform
 * (Vercel convention) — later entries can be appended by intermediate hops
 * and MUST NOT be trusted as the client address. Falls back to `x-real-ip`
 * when `x-forwarded-for` is absent. The selected candidate is validated as a
 * plausible IPv4/IPv6 literal before being returned; anything else
 * (including a missing header) returns `null` so the caller can signal
 * "unavailable" (D-07) rather than guessing or rendering a placeholder.
 *
 * The address family present in the header is preserved as-is (D-06) — no
 * normalization, casing changes, or compression/expansion of IPv6 values.
 *
 * Display-only: the returned value MUST NOT be used for any security or
 * access-control decision (see `<threat_model>` T-03-01 in the owning plan).
 */
export function parseForwardedIp(headers: HeaderReader): string | null {
  const forwardedFor = headers.get("x-forwarded-for");
  const candidate = forwardedFor
    ? forwardedFor.split(",")[0]?.trim()
    : headers.get("x-real-ip")?.trim();

  if (!candidate) return null;
  return isPlausibleIpLiteral(candidate) ? candidate : null;
}

function isPlausibleIpLiteral(candidate: string): boolean {
  return isValidIpv4(candidate) || isValidIpv6(candidate);
}

function isValidIpv4(candidate: string): boolean {
  const parts = candidate.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const num = Number(part);
    // Reject leading zeros (e.g. "01") — ambiguous octet notation, not a
    // canonical decimal IPv4 octet.
    return num >= 0 && num <= 255 && String(num) === part;
  });
}

function isValidIpv6(candidate: string): boolean {
  if (!candidate.includes(":")) return false;
  try {
    // The WHATWG URL parser rigorously validates IPv6 literal syntax when
    // wrapped in brackets — no extra dependency needed for this check.
    new URL(`http://[${candidate}]`);
    return true;
  } catch {
    return false;
  }
}
