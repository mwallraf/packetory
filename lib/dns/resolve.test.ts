import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveWithFallback } from "./resolve";
import { RateLimitError, ResolverFailureError } from "./types";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("resolveWithFallback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns resolverUsed \"primary\" on a Status-3 NXDOMAIN response, with NO Google fetch call", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { Status: 3, Answer: undefined })
    );
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    const result = await resolveWithFallback(
      "does-not-exist.invalid",
      "A",
      controller.signal
    );

    expect(result.resolverUsed).toBe("primary");
    expect(result.response.Status).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns resolverUsed \"primary\" on a Status-0 empty-Answer response, with NO Google fetch call", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { Status: 0, Answer: [] })
    );
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    const result = await resolveWithFallback(
      "cloudflare.com",
      "TXT",
      controller.signal
    );

    expect(result.resolverUsed).toBe("primary");
    expect(result.response.Status).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to Google on a Cloudflare network error, returning resolverUsed \"fallback\"", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network error"))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          Status: 0,
          Answer: [{ name: "cloudflare.com.", type: 1, TTL: 300, data: "1.1.1.1" }],
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    const result = await resolveWithFallback(
      "cloudflare.com",
      "A",
      controller.signal
    );

    expect(result.resolverUsed).toBe("fallback");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to Google on a Cloudflare non-2xx HTTP status, returning resolverUsed \"fallback\"", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(500, { Status: 2 }))
      .mockResolvedValueOnce(jsonResponse(200, { Status: 0, Answer: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    const result = await resolveWithFallback(
      "cloudflare.com",
      "A",
      controller.signal
    );

    expect(result.resolverUsed).toBe("fallback");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to Google on a Cloudflare Status-2 SERVFAIL response (Assumption A1), returning resolverUsed \"fallback\"", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { Status: 2 }))
      .mockResolvedValueOnce(jsonResponse(200, { Status: 0, Answer: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    const result = await resolveWithFallback(
      "cloudflare.com",
      "A",
      controller.signal
    );

    expect(result.resolverUsed).toBe("fallback");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws RateLimitError when Cloudflare and Google both respond 429", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, {}))
      .mockResolvedValueOnce(jsonResponse(429, {}));
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    await expect(
      resolveWithFallback("cloudflare.com", "A", controller.signal)
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it("throws ResolverFailureError when both resolvers fail", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network error"))
      .mockRejectedValueOnce(new TypeError("network error"));
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    await expect(
      resolveWithFallback("cloudflare.com", "A", controller.signal)
    ).rejects.toBeInstanceOf(ResolverFailureError);
  });

  it("falls back to Google when Cloudflare returns a 2xx response with a malformed JSON body (WR-02)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("<html>not json</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        })
      )
      .mockResolvedValueOnce(jsonResponse(200, { Status: 0, Answer: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    const result = await resolveWithFallback(
      "cloudflare.com",
      "A",
      controller.signal
    );

    expect(result.resolverUsed).toBe("fallback");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws ResolverFailureError when both resolvers return a 2xx response with a malformed JSON body (WR-02)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("<html>not json</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    await expect(
      resolveWithFallback("cloudflare.com", "A", controller.signal)
    ).rejects.toBeInstanceOf(ResolverFailureError);
  });

  it("re-throws without attempting a fallback when the signal is already aborted", async () => {
    const fetchMock = vi.fn().mockRejectedValue(
      new DOMException("Aborted", "AbortError")
    );
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    controller.abort();

    await expect(
      resolveWithFallback("cloudflare.com", "A", controller.signal)
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
