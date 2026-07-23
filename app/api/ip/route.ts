import { NextRequest, NextResponse } from "next/server";
import { parseForwardedIp } from "@/lib/network/parseForwardedIp";

// Reading request headers on every hit — never cache this response, it must
// reflect the current requester's own address (D-05).
export const dynamic = "force-dynamic";

/**
 * GET /api/ip — returns the visitor's own public IP, read server-side from
 * the request's forwarded-IP header (D-05). Never calls a third-party
 * IP-echo service. Always responds 200 with `{ ip: string | null }` — a
 * missing/unparseable header is a normal, expected outcome (D-07), not an
 * error, so the client can hide the widget instead of throwing.
 *
 * Privacy: the IP is never logged, persisted, or sent anywhere else by this
 * route — it is read and returned in the same response, nothing more.
 */
export async function GET(request: NextRequest) {
  const ip = parseForwardedIp(request.headers);

  return NextResponse.json(
    { ip },
    { headers: { "Cache-Control": "no-store" } }
  );
}
