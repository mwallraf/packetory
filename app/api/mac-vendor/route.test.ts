import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

/**
 * First Route Handler unit test in this codebase (`app/api/ip/route.ts` has
 * none yet) — per 05-RESEARCH.md's Wave 0 Gaps / 05-PATTERNS.md's "No Analog
 * Found" approach: import the exported `GET` directly, construct a real
 * `NextRequest`, and `vi.stubGlobal("fetch", ...)` to simulate each upstream
 * outcome.
 */
describe("GET /api/mac-vendor", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function requestFor(query: string) {
    return new NextRequest(`http://localhost/api/mac-vendor${query}`);
  }

  it("returns 400 with no oui param, and never calls fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET(requestFor(""));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "oui must be exactly 6 hex characters",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for an oui shorter than 6 hex characters, and never calls fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET(requestFor("?oui=3C22F"));

    expect(response.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for an oui longer than 6 hex characters, and never calls fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET(requestFor("?oui=3C22FBAA"));

    expect(response.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-hex oui, and never calls fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET(requestFor("?oui=ZZZZZZ"));

    expect(response.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 200 { status: 'ok', found: true, company } on a successful, found upstream response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, found: true, company: "Apple, Inc." }),
          { status: 200 }
        )
      )
    );

    const response = await GET(requestFor("?oui=3C22FB"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      found: true,
      company: "Apple, Inc.",
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 200 { status: 'ok', found: false, company: null } on a successful, not-found upstream response (Pitfall 3 — distinct from unavailable)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true, found: false }), {
          status: 200,
        })
      )
    );

    const response = await GET(requestFor("?oui=AAAAAA"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      found: false,
      company: null,
    });
  });

  it("returns 200 { status: 'unavailable' } when fetch throws (network error/timeout), never a 5xx crash (D-11)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("network error"))
    );

    const response = await GET(requestFor("?oui=3C22FB"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "unavailable" });
  });

  it("returns 200 { status: 'unavailable' } on a non-2xx upstream response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Internal Server Error", { status: 500 }))
    );

    const response = await GET(requestFor("?oui=3C22FB"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "unavailable" });
  });

  it("returns 200 { status: 'unavailable' } on a literal JSON `null` upstream body, never a 500 crash (CR-01)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("null", { status: 200 }))
    );

    const response = await GET(requestFor("?oui=3C22FB"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "unavailable" });
  });

  it("returns 200 { status: 'unavailable' } on malformed/non-JSON upstream body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("not json", { status: 200 }))
    );

    const response = await GET(requestFor("?oui=3C22FB"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "unavailable" });
  });

  it("returns 200 { status: 'unavailable' } when the upstream body itself reports success:false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: false }), { status: 200 })
      )
    );

    const response = await GET(requestFor("?oui=3C22FB"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "unavailable" });
  });

  it("interpolates only the validated oui into the hardcoded maclookup.app host literal", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, found: true, company: "Apple, Inc." }), {
        status: 200,
      })
    );
    vi.stubGlobal("fetch", fetchSpy);

    await GET(requestFor("?oui=3C22FB"));

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.maclookup.app/v2/macs/3C22FB",
      expect.objectContaining({ signal: expect.anything() })
    );
  });
});
