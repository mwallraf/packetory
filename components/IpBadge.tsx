"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";

type IpState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "available"; ip: string };

/**
 * Visitor-IP widget (SHELL-03, D-05/D-06/D-07/D-08): a small secondary
 * badge/pill, not a tool card. Fetches `/api/ip` (which reads the request's
 * forwarded-IP header server-side — no third-party IP-echo service, D-05)
 * and renders whichever single address family the response provides (D-06).
 *
 * When the IP can't be determined, the badge renders nothing at all — no
 * placeholder, no error copy (D-07). While the request is in flight, a
 * zero-content spacer of the same height is rendered so the page doesn't
 * shift once the badge appears or resolves to unavailable (CLS backstop).
 */
export function IpBadge() {
  const [state, setState] = useState<IpState>({ status: "loading" });
  const { copy, copied } = useCopyToClipboard();

  useEffect(() => {
    let cancelled = false;

    fetch("/api/ip", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { ip: string | null }) => {
        if (cancelled) return;
        setState(
          data.ip ? { status: "available", ip: data.ip } : { status: "unavailable" }
        );
      })
      .catch(() => {
        if (!cancelled) setState({ status: "unavailable" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "unavailable") {
    return null;
  }

  if (state.status === "loading") {
    // Reserved-height spacer only — no visible content, so this never reads
    // as a placeholder/loading UI (D-07), just a CLS guard for the brief
    // same-origin fetch window.
    return <div aria-hidden="true" className="h-11" />;
  }

  const { ip } = state;

  return (
    <div
      data-testid="ip-badge"
      className="inline-flex flex-wrap items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5"
    >
      {/* Label role: 14px / 600 / 1.4 (UI-SPEC Typography) */}
      <span className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
        Your IP:
      </span>
      {/* Body role in Geist Mono: 16px / 400 / 1.5 — copyable technical value,
          wraps rather than clipping/truncating at 320px (long-text backstop). */}
      <span
        data-testid="ip-badge-value"
        className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground"
      >
        {ip}
      </span>
      <button
        type="button"
        onClick={() => copy(ip)}
        aria-label={copied ? "Copied!" : "Copy IP address"}
        data-testid="ip-badge-copy"
        // 44x44 minimum hit area (QUAL-05/WCAG target-size) via padding
        // around a smaller icon; accent-tinted per UI-SPEC's reserved list.
        className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-primary outline-none transition-colors hover:bg-muted hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {copied ? (
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
      {/* Not color-alone: icon+label swap above is the primary confirmation
          signal; this announces the same change to screen readers
          (QUAL-04/QUAL-05). */}
      <span aria-live="polite" className="sr-only" data-testid="ip-badge-copy-status">
        {copied ? "Copied!" : ""}
      </span>
    </div>
  );
}
