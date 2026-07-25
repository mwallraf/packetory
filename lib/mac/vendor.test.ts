import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetVendorCacheForTests, lookupVendor } from "./vendor";

describe("lookupVendor", () => {
  beforeEach(() => {
    __resetVendorCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps { status: 'ok', found: true, company } to a 'found' VendorState", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ status: "ok", found: true, company: "Apple, Inc." }),
          { status: 200 }
        )
      )
    );

    const result = await lookupVendor("3C22FB");

    expect(result).toEqual({ kind: "found", company: "Apple, Inc." });
  });

  it("maps { status: 'ok', found: false, company: null } to a 'not-found' VendorState (distinct from unavailable)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ status: "ok", found: false, company: null }),
          { status: 200 }
        )
      )
    );

    const result = await lookupVendor("AAAAAA");

    expect(result).toEqual({ kind: "not-found" });
  });

  it("maps { status: 'unavailable' } to an 'unavailable' VendorState", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: "unavailable" }), {
          status: 200,
        })
      )
    );

    const result = await lookupVendor("BBBBBB");

    expect(result).toEqual({ kind: "unavailable" });
  });

  it("maps a network-level fetch throw to an 'unavailable' VendorState (never an unclassified crash)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    const result = await lookupVendor("CCCCCC");

    expect(result).toEqual({ kind: "unavailable" });
  });

  it("re-throws untouched when the caller's AbortSignal is already aborted (cancellation, not a failure)", async () => {
    const controller = new AbortController();
    controller.abort();
    const abortError = new DOMException("Aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    await expect(
      lookupVendor("DDDDDD", controller.signal)
    ).rejects.toBe(abortError);
  });

  it("retries the fetch on a second call after an 'unavailable' result — unavailable is never cached (WR-03)", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "unavailable" }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ status: "ok", found: true, company: "Apple, Inc." }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetchSpy);

    const first = await lookupVendor("FFFFFF");
    const second = await lookupVendor("FFFFFF");

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(first).toEqual({ kind: "unavailable" });
    expect(second).toEqual({ kind: "found", company: "Apple, Inc." });
  });

  it("does not fetch again for a second call with a cached ouiHex (D-03 session cache)", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ status: "ok", found: true, company: "Cisco Systems, Inc." }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchSpy);

    const first = await lookupVendor("EEEEEE");
    const second = await lookupVendor("EEEEEE");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
    expect(second).toEqual({ kind: "found", company: "Cisco Systems, Inc." });
  });

  it("fetches independently for two distinct ouiHex values (cache is keyed per-OUI, not global)", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", found: false, company: null }), {
        status: 200,
      })
    );
    vi.stubGlobal("fetch", fetchSpy);

    await lookupVendor("111111");
    await lookupVendor("222222");

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("sends only the ouiHex in the request URL, never a full MAC (MAC-10 by construction)", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", found: false, company: null }), {
        status: 200,
      })
    );
    vi.stubGlobal("fetch", fetchSpy);

    await lookupVendor("3C22FB");

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/mac-vendor?oui=3C22FB",
      expect.objectContaining({})
    );
  });
});
