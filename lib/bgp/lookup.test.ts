import { afterEach, describe, expect, it, vi } from "vitest";
import { createLookupClient, parseLookup } from "./lookup";

const query = parseLookup("8.8.8.8")!;
const peer = { prefix: "8.8.8.0/24", asn_origin: "15169", as_path: "123 123 15169" };
const response = () => Response.json({ status: "ok", data: {
  latest_time: "2026-11-27T15:51:42",
  rrcs: [{ rrc: "RRC00", location: "Amsterdam", peers: [peer, { ...peer, asn_origin: 64500 }] }],
} });

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("BGP lookup", () => {
  it("normalizes resources and rejects invalid and local input", () => {
    expect(parseLookup(" 8.8.8.8/24 ")?.resource).toBe("8.8.8.0/24");
    expect(parseLookup("2606:4700:4700:0:0:0:0:1111")?.resource).toBe("2606:4700:4700::1111");
    for (const value of ["", "10.0.0.1", "fc00::1", "8.8.8.8/33", "example.com", "::ffff:192.168.1.1"]) {
      expect(parseLookup(value)).toBeNull();
    }
  });

  it("preserves multiple origins, repeated hops, address bounds and UTC timestamps", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response()));
    expect(await createLookupClient().lookup(query)).toMatchObject({
      kind: "success", snapshot: { observed: "2026-11-27T15:51:42.000Z", matches: [{
        prefix: "8.8.8.0/24", first: "8.8.8.0", last: "8.8.8.255",
        origins: ["15169", "64500"], collectors: [{ peers: [{ path: ["123", "123", "15169"], confirmed: null }, {}] }],
      }] },
    });
    expect(await createLookupClient().lookup(parseLookup("8.8.8.8/32")!))
      .toMatchObject({ kind: "success", snapshot: { matches: [] } });
  });

  it("returns a covering IPv6 route with exact address bounds", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ status: "ok", data: {
      rrcs: [{ rrc: "RRC00", peers: [{ ...peer, prefix: "2606:4700:4700::/48" }] }],
    } })));
    expect(await createLookupClient().lookup(parseLookup("2606:4700:4700::1111")!)).toMatchObject({
      kind: "success", snapshot: { matches: [{ first: "2606:4700:4700::", last: "2606:4700:4700:ffff:ffff:ffff:ffff:ffff" }] },
    });
  });

  it("blocks concurrent calls and reuses equivalent keys until expiration", async () => {
    let resolve!: (value: Response) => void;
    const fetcher = vi.fn(() => new Promise<Response>((done) => { resolve = done; }));
    vi.stubGlobal("fetch", fetcher);
    const now = vi.spyOn(Date, "now").mockReturnValue(1000);
    const client = createLookupClient();
    const first = client.lookup(query);
    expect(await client.lookup(query)).toEqual({ kind: "busy" });
    resolve(response());
    await first;
    expect(await client.lookup(parseLookup(" 8.8.8.8 ")!)).toMatchObject({ cached: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
    now.mockReturnValue(31_000);
    const afterExpiry = client.lookup(query);
    resolve(response());
    expect(await afterExpiry).toMatchObject({ cached: false });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each(["60", "Fri, 27 Nov 2026 16:01:00 GMT", null])("applies cooldown for Retry-After %s", async (header) => {
    const start = Date.parse("2026-11-27T16:00:00Z");
    const now = vi.spyOn(Date, "now").mockReturnValue(start);
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(null, {
      status: 429, headers: header ? { "Retry-After": header } : {},
    })).mockImplementation(async () => response());
    vi.stubGlobal("fetch", fetcher);
    const client = createLookupClient();
    const until = start + (header ? 60_000 : 30_000);
    expect(await client.lookup(query)).toEqual({ kind: "limited", until });
    expect(await client.lookup(query)).toEqual({ kind: "limited", until });
    expect(fetcher).toHaveBeenCalledTimes(1);
    now.mockReturnValue(until);
    expect(await client.lookup(query)).toMatchObject({ kind: "success" });
  });

  it("distinguishes malformed responses and timeout from a valid empty result", async () => {
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new DOMException("Timeout", "TimeoutError"))
      .mockResolvedValueOnce(Response.json({ status: "ok", data: {} }))
      .mockResolvedValueOnce(Response.json({ status: "ok", data: { rrcs: [] } }));
    vi.stubGlobal("fetch", fetcher);
    const client = createLookupClient();
    expect(await client.lookup(query)).toEqual({ kind: "failure" });
    expect(await client.lookup(query)).toEqual({ kind: "failure" });
    expect(await client.lookup(query)).toMatchObject({ kind: "success", snapshot: { matches: [] } });
  });
});
