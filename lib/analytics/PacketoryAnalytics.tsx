"use client";

import { Analytics } from "@vercel/analytics/next";
import type { BeforeSendEvent } from "@vercel/analytics/next";
import { DEFAULT_ALLOW_LIST, redactParams } from "@/lib/analytics/redact";

/**
 * Cookie-free Vercel Analytics (D-12), mounted once in app/layout.tsx so
 * every route is tracked. Vercel Analytics itself sets no cookies and
 * introduces no cross-visit identifier/fingerprint (QUAL-07) — this
 * wrapper's only responsibility is to guarantee the reported page URL's
 * query-string portion NEVER leaves the browser unredacted: it always
 * passes through redactParams(DEFAULT_ALLOW_LIST) first (QUAL-06, D-13), so
 * a non-allow-listed param (a future MAC, private IP, internal hostname, or
 * secret/token) is stripped before transmission. The pathname itself is
 * never sensitive and is left untouched.
 *
 * Do NOT report `event.url` directly — always route it through
 * `redactBeforeSend` below.
 */
export function PacketoryAnalytics() {
  return <Analytics beforeSend={redactBeforeSend} />;
}

/**
 * `beforeSend` middleware: strips every query param from the reported event
 * URL except those explicitly present in DEFAULT_ALLOW_LIST. With Phase 1's
 * empty allow-list, this strips ALL query params — safe-by-default until a
 * later phase deliberately adds a specific, reviewed param name.
 */
function redactBeforeSend(event: BeforeSendEvent): BeforeSendEvent {
  const [path, query] = event.url.split("?");

  if (!query) {
    // No query string to redact — nothing sensitive to strip.
    return event;
  }

  const allowed = redactParams(query, DEFAULT_ALLOW_LIST);
  const allowedEntries = Object.entries(allowed);

  if (allowedEntries.length === 0) {
    return { ...event, url: path };
  }

  const redactedQuery = new URLSearchParams(allowed).toString();
  return { ...event, url: `${path}?${redactedQuery}` };
}
