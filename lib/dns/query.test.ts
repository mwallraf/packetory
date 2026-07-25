import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CLOUDFLARE_URL,
  GOOGLE_URL,
  queryResolver,
  RESOLVER_TIMEOUT_MS,
} from "./query";

describe("queryResolver", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("builds the Cloudflare request with the Accept: application/dns-json header and name/type params", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    await queryResolver(
      "cloudflare.com",
      "A",
      CLOUDFLARE_URL,
      controller.signal,
      RESOLVER_TIMEOUT_MS
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    const url = new URL(String(calledUrl));
    expect(url.origin + url.pathname).toBe(CLOUDFLARE_URL);
    expect(url.searchParams.get("name")).toBe("cloudflare.com");
    expect(url.searchParams.get("type")).toBe("A");
    expect(
      (calledInit?.headers as Record<string, string> | undefined)?.accept
    ).toBe("application/dns-json");
  });

  it("builds the Google request with name/type params and no special header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    await queryResolver(
      "cloudflare.com",
      "MX",
      GOOGLE_URL,
      controller.signal,
      RESOLVER_TIMEOUT_MS
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl] = fetchMock.mock.calls[0];
    const url = new URL(String(calledUrl));
    expect(url.origin + url.pathname).toBe(GOOGLE_URL);
    expect(url.searchParams.get("name")).toBe("cloudflare.com");
    expect(url.searchParams.get("type")).toBe("MX");
  });

  it("rejects with a timeout after RESOLVER_TIMEOUT_MS when the resolver never responds", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    const promise = queryResolver(
      "cloudflare.com",
      "A",
      CLOUDFLARE_URL,
      controller.signal,
      RESOLVER_TIMEOUT_MS
    );
    const assertion = expect(promise).rejects.toThrow();

    await vi.advanceTimersByTimeAsync(RESOLVER_TIMEOUT_MS + 10);
    await assertion;
  });

  it("propagates an externally-aborted signal without waiting for the timeout", async () => {
    const fetchMock = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    const promise = queryResolver(
      "cloudflare.com",
      "A",
      CLOUDFLARE_URL,
      controller.signal,
      RESOLVER_TIMEOUT_MS
    );
    controller.abort();

    await expect(promise).rejects.toThrow();
  });
});
