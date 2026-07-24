"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { useKeyboardShortcut } from "@/lib/hooks/useKeyboardShortcut";
import { isParseError, parseCidr, type ParsedCidr } from "@/lib/subnet/parse";
import { computeIpv4, type Ipv4Result } from "@/lib/subnet/ipv4";
import { computeIpv6, type Ipv6Result } from "@/lib/subnet/ipv6";
import { ipv4ReverseZone, ipv6ReverseZone } from "@/lib/subnet/reverse-dns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/** D-02 (locked): the default/example CIDR shown before any URL param or
 * user input — a familiar private-range example, never a public/
 * documentation range. Per D-01 it is never reported to analytics
 * regardless of family. */
const DEFAULT_CIDR = "192.168.1.0/24";

const INVALID_CIDR_MESSAGE =
  "Enter a valid IPv4 or IPv6 CIDR, like 192.168.1.0/24 or 2001:db8::/32.";

function sharedLinkInvalidMessage(rawParam: string): string {
  return `The shared link's CIDR ("${rawParam}") isn't valid — showing the default example instead.`;
}

/** UI-SPEC Copywriting Contract's reverse-DNS non-aligned-prefix note —
 * an explicit PLANNER ASSUMPTION (RESEARCH.md Open Question 1 / Assumption
 * A1, 03-02-PLAN.md's "Surfaced assumption"), not a locked user decision.
 * Shown only when `ipv4ReverseZone`'s `aligned` flag is false. */
function ipv4ReverseDnsNote(prefixLength: number): string {
  return `Zone shown to the nearest fully covered octet boundary — /${prefixLength} doesn't align exactly.`;
}

/** Same UI-SPEC assumption as `ipv4ReverseDnsNote`, worded for IPv6's
 * 4-bit nibble boundary instead of IPv4's 8-bit octet boundary. */
function ipv6ReverseDnsNote(prefixLength: number): string {
  return `Zone shown to the nearest fully covered nibble boundary — /${prefixLength} doesn't align exactly.`;
}

/** Fixed, deterministic field order (SUBNET-06 ordering edge) — equal
 * values (e.g. a /32's network == broadcast) never reorder the grid because
 * this is a static array, not derived from the result object's own key
 * order. */
const IPV4_FIELDS: Array<{
  key: string;
  label: string;
  getValue: (result: Ipv4Result) => string;
}> = [
  { key: "network", label: "Network address", getValue: (r) => r.network },
  { key: "broadcast", label: "Broadcast address", getValue: (r) => r.broadcast },
  { key: "first-host", label: "First usable host", getValue: (r) => r.firstHost },
  { key: "last-host", label: "Last usable host", getValue: (r) => r.lastHost },
  { key: "host-count", label: "Usable host count", getValue: (r) => r.usableHostCount },
  { key: "mask", label: "Subnet mask", getValue: (r) => r.subnetMask },
  { key: "wildcard", label: "Wildcard mask", getValue: (r) => r.wildcardMask },
  { key: "binary", label: "Binary", getValue: (r) => r.binary },
];

/** Fixed, deterministic field order for the IPv6 grid (SUBNET-05, SUBNET-06
 * ordering edge) — mirrors `IPV4_FIELDS`'s static-array rationale. The
 * reverse-DNS field is rendered separately, alongside this array, exactly
 * like `IPV4_FIELDS`'s reverse-dns row. */
const IPV6_FIELDS: Array<{
  key: string;
  label: string;
  getValue: (result: Ipv6Result) => string;
}> = [
  { key: "normalized-prefix", label: "Normalized prefix", getValue: (r) => r.normalizedPrefix },
  { key: "compressed", label: "Compressed", getValue: (r) => r.compressed },
  { key: "expanded", label: "Expanded", getValue: (r) => r.expanded },
  { key: "first", label: "First address", getValue: (r) => r.firstAddress },
  { key: "last", label: "Last address", getValue: (r) => r.lastAddress },
  { key: "address-count", label: "Address count", getValue: (r) => r.addressCount },
];

/**
 * Reads the initial CIDR from the URL entirely client-side (RESEARCH.md
 * Pattern 1) — never `useSearchParams()`, since this component is never
 * server-rendered (`ssr:false`). `URLSearchParams.get()` already returns
 * the FIRST occurrence when a param key appears more than once (SUBNET-07
 * malformed-param edge), so no extra handling is needed here.
 */
function getInitialCidrFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("cidr");
}

/**
 * Writes the current CIDR to the URL via the raw History API (RESEARCH.md
 * Pattern 2) — never `router.replace()`, which would trigger App Router's
 * client-navigation machinery on every keystroke.
 */
function syncCidrToUrl(cidr: string): void {
  const url = `${window.location.pathname}?cidr=${encodeURIComponent(cidr)}`;
  window.history.replaceState(null, "", url);
}

type SubnetToolState = {
  /** Always reflects exactly what's typed in the input — single source of
   * truth for the controlled field. */
  rawCidr: string;
  /** The most recent CIDR that parsed as valid (either family) — the grid
   * always renders from this, so an invalid in-progress edit never blanks
   * or half-populates the result (SUBNET-03, UI-SPEC partial state). */
  lastValidCidr: string;
  /** Set once, at mount, when an invalid `?cidr=` URL param falls back to
   * the D-02 default (SUBNET-07 malformed edge); cleared on the next edit. */
  urlFallbackNote: string | null;
};

/**
 * One independently-copyable output field, shared by both the IPv4 and IPv6
 * grids (SUBNET-06). Each instance owns its own `useCopyToClipboard()` —
 * confirmation state never bleeds between fields, even when two fields
 * render the same value (e.g. a /32's network and broadcast, or a /128's
 * first and last address).
 */
function CopyableField({
  fieldKey,
  label,
  value,
  note,
}: {
  fieldKey: string;
  label: string;
  value: string;
  /** Optional short explanatory note (D-04-style — a real value plus a
   * note, never N/A/hidden). Rendered `text-muted-foreground`, never
   * accent — informational, not actionable (UI-SPEC Color). */
  note?: string | null;
}) {
  const { copy, copied, error, reset } = useCopyToClipboard();

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset is a stable useCallback identity; omitted to avoid re-running on hook-identity changes.
  }, [value]);

  return (
    <div
      data-testid={`subnet-field-${fieldKey}`}
      className="flex flex-col gap-1 rounded-md border border-border bg-secondary px-4 py-3"
    >
      <span className="text-[14px] leading-[1.4] font-semibold text-foreground">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <span
          data-testid={`subnet-field-${fieldKey}-value`}
          className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => copy(value)}
          aria-label={copied ? "Copied!" : `Copy ${label.toLowerCase()}`}
          data-testid={`subnet-copy-${fieldKey}`}
          // 44x44 minimum hit area via padding around a smaller icon;
          // accent-tinted per UI-SPEC's reserved list (every copy action).
          className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-primary outline-none transition-colors hover:bg-muted hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {copied ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            <Copy aria-hidden="true" className="size-4" />
          )}
        </button>
      </div>
      {/* Not color-alone: icon swap above is the primary confirmation
          signal; this announces the same change to screen readers
          (QUAL-04/QUAL-05), mirroring UuidTool's exact pattern. */}
      <span
        aria-live="polite"
        className="sr-only"
        data-testid={`subnet-copy-${fieldKey}-status`}
      >
        {copied ? "Copied!" : ""}
      </span>
      {error && (
        <span className="text-[14px] leading-[1.4] font-normal text-muted-foreground">
          Couldn&apos;t copy — select the text and copy manually.
        </span>
      )}
      {note && (
        <span
          data-testid={`subnet-field-${fieldKey}-note`}
          className="text-[14px] leading-[1.4] font-normal text-muted-foreground"
        >
          {note}
        </span>
      )}
    </div>
  );
}

/**
 * The interactive walking-skeleton island (SUBNET-01/02/03/04/05/06/07).
 * `rawCidr` is the single source of truth for the controlled input;
 * `lastValidCidr` is the single source of truth for what the grid renders,
 * so an in-progress invalid edit shows an inline message without ever
 * blanking the last good result (SUBNET-03). Either family (IPv4 or IPv6)
 * is valid input — the rendered grid is chosen by the parsed family
 * (SUBNET-01 auto-detect), never both at once.
 */
export function SubnetTool() {
  // Lazy initializer (not a mount effect + setState, which would trigger a
  // cascading second render): this component only ever mounts client-side
  // (the `ssr:false` loader boundary), so `window` is always defined the
  // first time this function body runs — reading the URL here, once, is
  // both correct and avoids an extra render pass (RESEARCH.md Pattern 1).
  const [state, setState] = useState<SubnetToolState>(() => {
    const urlCidr = getInitialCidrFromUrl();
    if (urlCidr === null) {
      return { rawCidr: DEFAULT_CIDR, lastValidCidr: DEFAULT_CIDR, urlFallbackNote: null };
    }

    const parsed = parseCidr(urlCidr);
    if (isParseError(parsed)) {
      return {
        rawCidr: DEFAULT_CIDR,
        lastValidCidr: DEFAULT_CIDR,
        urlFallbackNote: sharedLinkInvalidMessage(urlCidr),
      };
    }
    return { rawCidr: urlCidr, lastValidCidr: urlCidr, urlFallbackNote: null };
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    copy: copyHero,
    copied: heroCopied,
    error: heroError,
    reset: resetHeroCopy,
  } = useCopyToClipboard();

  const currentParsed = parseCidr(state.rawCidr);
  const isCurrentValid = !isParseError(currentParsed);
  const lastValidParsed = parseCidr(state.lastValidCidr) as ParsedCidr;
  const displayParsed = isCurrentValid ? currentParsed : lastValidParsed;
  const isIpv6 = displayParsed.family === "ipv6";

  const ipv4Result = isIpv6 ? null : computeIpv4(displayParsed);
  const ipv6Result = isIpv6 ? computeIpv6(displayParsed) : null;
  const boundaryNote = isIpv6 ? ipv6Result!.boundaryNote : ipv4Result!.boundaryNote;
  const heroValue = isIpv6
    ? ipv6Result!.normalizedPrefix
    : `${ipv4Result!.network}/${ipv4Result!.prefixLength}`;

  // Reverse-DNS zone (SUBNET-04's 8th IPv4 field / SUBNET-05's 7th IPv6
  // field) is derived from the NETWORK address, not the raw parsed address
  // — the already-correctly-masked network address (IPv4 dotted-decimal /
  // IPv6 compressed) is reparsed back to a bigint via the same tested
  // `parseCidr` rather than duplicating `ipv4.ts`/`ipv6.ts`'s masking math
  // here. The `isParseError` branch is defensive-only (unreachable in
  // practice: both compute modules always produce a valid network address
  // string).
  const networkAddressCidr = isIpv6
    ? `${ipv6Result!.compressed}/128`
    : `${ipv4Result!.network}/32`;
  const networkParsed = parseCidr(networkAddressCidr);
  const networkAddress = isParseError(networkParsed)
    ? displayParsed.address
    : networkParsed.address;
  const reverseDns = isIpv6
    ? ipv6ReverseZone(networkAddress, ipv6Result!.prefixLength)
    : ipv4ReverseZone(networkAddress, ipv4Result!.prefixLength);

  const inputHasError = !isCurrentValid;
  const validationMessage = inputHasError
    ? INVALID_CIDR_MESSAGE
    : state.urlFallbackNote;

  useEffect(() => {
    resetHeroCopy();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetHeroCopy is a stable useCallback identity; omitted to avoid re-running on hook-identity changes.
  }, [heroValue]);

  function handleReset() {
    setState({
      rawCidr: DEFAULT_CIDR,
      lastValidCidr: DEFAULT_CIDR,
      urlFallbackNote: null,
    });
    syncCidrToUrl(DEFAULT_CIDR);
  }

  useKeyboardShortcut({
    slash: () => inputRef.current?.focus(),
    enter: () => inputRef.current?.blur(),
    escape: () => handleReset(),
    copy: () => copyHero(heroValue),
  });

  function handleCidrChange(value: string) {
    const parsed = parseCidr(value);
    const valid = !isParseError(parsed);
    setState((prev) => ({
      ...prev,
      rawCidr: value,
      lastValidCidr: valid ? value : prev.lastValidCidr,
      urlFallbackNote: null,
    }));
    if (valid) syncCidrToUrl(value);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <Label
            htmlFor="subnet-cidr-input"
            className="text-[14px] leading-[1.4] font-semibold"
          >
            CIDR
          </Label>
          <Badge
            variant="outline"
            data-testid="subnet-family-badge"
            className="uppercase"
          >
            {displayParsed.family === "ipv4" ? "IPv4" : "IPv6"}
          </Badge>
        </div>
        <Input
          id="subnet-cidr-input"
          ref={inputRef}
          data-testid="subnet-cidr-input"
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          value={state.rawCidr}
          onChange={(event) => handleCidrChange(event.target.value)}
          aria-invalid={inputHasError || !!validationMessage}
          aria-describedby={validationMessage ? "subnet-validation-note" : undefined}
        />
        {validationMessage && (
          <span
            id="subnet-validation-note"
            data-testid="subnet-validation-note"
            className="text-[14px] leading-[1.4] font-normal text-muted-foreground"
          >
            {validationMessage}
          </span>
        )}
      </div>

      <div
        data-testid="subnet-hero"
        className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-secondary px-4 py-4"
      >
        <span
          data-testid="subnet-hero-value"
          className="font-mono text-[20px] leading-[1.2] font-semibold break-all text-foreground"
        >
          {heroValue}
        </span>
        <button
          type="button"
          onClick={() => copyHero(heroValue)}
          aria-label={heroCopied ? "Copied!" : "Copy CIDR"}
          data-testid="subnet-copy-hero"
          className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-primary outline-none transition-colors hover:bg-muted hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {heroCopied ? (
            <>
              <Check aria-hidden="true" className="size-4" />
              <span className="text-[14px] leading-[1.4] font-semibold whitespace-nowrap">
                Copied!
              </span>
            </>
          ) : (
            <Copy aria-hidden="true" className="size-5" />
          )}
        </button>
        <span
          aria-live="polite"
          className="sr-only"
          data-testid="subnet-copy-hero-status"
        >
          {heroCopied ? "Copied!" : ""}
        </span>
        {heroError && (
          <span className="w-full text-[14px] leading-[1.4] font-normal text-muted-foreground">
            Couldn&apos;t copy — select the text and copy manually.
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {isIpv6 ? (
          <div
            data-testid="subnet-ipv6-grid"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {IPV6_FIELDS.map((field) => (
              <CopyableField
                key={field.key}
                fieldKey={field.key}
                label={field.label}
                value={field.getValue(ipv6Result!)}
              />
            ))}
            <CopyableField
              fieldKey="reverse-dns"
              label="Reverse DNS zone"
              value={reverseDns.zone}
              note={
                reverseDns.aligned
                  ? null
                  : ipv6ReverseDnsNote(ipv6Result!.prefixLength)
              }
            />
          </div>
        ) : (
          <div
            data-testid="subnet-ipv4-grid"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {IPV4_FIELDS.map((field) => (
              <CopyableField
                key={field.key}
                fieldKey={field.key}
                label={field.label}
                value={field.getValue(ipv4Result!)}
              />
            ))}
            <CopyableField
              fieldKey="reverse-dns"
              label="Reverse DNS zone"
              value={reverseDns.zone}
              note={
                reverseDns.aligned
                  ? null
                  : ipv4ReverseDnsNote(ipv4Result!.prefixLength)
              }
            />
          </div>
        )}
        {boundaryNote && (
          <p
            data-testid="subnet-boundary-note"
            className="text-[16px] leading-[1.5] font-normal text-muted-foreground"
          >
            {boundaryNote}
          </p>
        )}
        {/* Placeholder Separator ahead of the IPv6 "Subdivide this block"
            section (D-05/D-06, UI-SPEC page structure step 5), which ships
            in 03-04 — reserved here so that plan doesn't need to touch this
            grid's structural boundary again. IPv4 has no subdivision
            section (SUBNET-05 is IPv6-only), so nothing renders for it. */}
        {isIpv6 && <Separator data-testid="subnet-subdivision-separator" />}
      </div>
    </div>
  );
}

export default SubnetTool;
