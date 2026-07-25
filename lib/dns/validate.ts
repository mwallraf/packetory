/**
 * Framework-agnostic domain-name input validation (DNS-01, QUAL-08's
 * "invalid input" state, T-04-02). No React/Next import — independently
 * testable, mirrors `lib/subnet/parse.ts`'s no-throw total-function
 * contract.
 *
 * Deliberately narrow, ASCII-only RFC 1035 §2.3.1-style syntax check — no
 * IDN/punycode, no wildcard-DNS syntax (04-RESEARCH.md "Don't Hand-Roll").
 * `isValidDomainInput` is a total function: it never throws for any string
 * input, however pathological (T-04-02 ReDoS mitigation).
 */

/** Bounded, non-backtracking per-label regex (T-04-02): a fixed `{0,61}`
 * quantifier with no nesting/overlap, so no input can trigger catastrophic
 * backtracking regardless of length. Checked only AFTER the total-length
 * ceiling below, so a pathologically long string is rejected before any
 * regex ever runs against it. */
const LABEL_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

/** QUAL-08's explicit boundary: a 253-char domain is valid, a 254-char
 * domain is not. */
export const MAX_DOMAIN_LENGTH = 253;

/**
 * Validates a raw domain-input string. Never throws. Tolerates one
 * trailing dot (absolute FQDN notation, e.g. "cloudflare.com."). Rejects
 * empty/whitespace-only input, anything over `MAX_DOMAIN_LENGTH`, any
 * label over 63 characters, and any label with a leading/trailing hyphen.
 */
export function isValidDomainInput(raw: string): boolean {
  const trimmed = raw.trim().replace(/\.$/, "");
  if (!trimmed || trimmed.length > MAX_DOMAIN_LENGTH) return false;

  const labels = trimmed.split(".");
  if (labels.length < 1) return false;

  return labels.every((label) => label.length <= 63 && LABEL_RE.test(label));
}
