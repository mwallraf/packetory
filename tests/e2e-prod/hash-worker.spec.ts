import { createHash, getHashes } from "node:crypto";
import { crc32 } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";

/** Published "abc" vectors (MD5 RFC 1321, FIPS 180-4, FIPS 202, RIPEMD-160, CRC32 IEEE). */
const ABC = {
  md5: "900150983cd24fb0d6963f7d28e17f72",
  sha1: "a9993e364706816aba3e25717850c26c9cd0d89d",
  sha224: "23097d223405d8228642a477bda255b32aadbce4bda0b3f7e36c9da7",
  sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  sha384:
    "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7",
  sha512:
    "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
  "sha3-256":
    "3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532",
  "sha3-512":
    "b751850b1a57168a5693cd924b6b096e08f621827444f70d884f5d0240d2712e10e116e9192af3c91a7ec57647e3934057340b4cf408d5a56592f8274eec53f0",
  ripemd160: "8eb208f7e05d987a9b044a8e98c6b087f15a0bfc",
  crc32: "352441c2",
} as const;

const SHA256_EMPTY =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

const ORIGIN = "http://localhost:3101";

/**
 * Node-side oracle: all 10 digests of `bytes` as lowercase hex. Every oracle is
 * mandatory (no skips); availability is hard-asserted by the Blob test.
 */
function oracleHex(bytes: Buffer): Record<string, string> {
  const out: Record<string, string> = {};
  for (const algo of [
    "md5",
    "sha1",
    "sha224",
    "sha256",
    "sha384",
    "sha512",
    "sha3-256",
    "sha3-512",
    "ripemd160",
  ]) {
    out[algo] = createHash(algo).update(bytes).digest("hex");
  }
  out.crc32 = crc32(bytes).toString(16).padStart(8, "0");
  return out;
}

/** Thrown by noble's aexists guard in utils.js; absent from every repo source. */
const NOBLE_MARKER = "digest() was already called";

async function hashAbc(page: Page) {
  // Helpers defined outside the callback are not available in the page.
  return page.evaluate(async () => {
    const outcome = await window.__hashSmoke!.start({
      kind: "text",
      text: "abc",
    });
    if (outcome.status !== "done") return { status: outcome.status };
    const hex: Record<string, string> = {};
    for (const [id, bytes] of Object.entries(outcome.digests)) {
      hex[id] = Array.from(bytes as Uint8Array)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
    return { status: outcome.status, hex };
  });
}

test.describe("Hash worker in a production build (HASH-01, HASH-04)", () => {
  test("worker returns the published digests for text in a production build (HASH-04, HASH-01)", async ({
    page,
  }) => {
    await page.goto("/hash-smoke");
    await expect(page.getByTestId("hash-smoke-ready")).toHaveText("ready");

    const result = await hashAbc(page);

    expect(result.status).toBe("done");
    expect(Object.keys(result.hex ?? {}).sort()).toEqual(
      Object.keys(ABC).sort(),
    );
    expect(result.hex).toEqual(ABC);
  });

  test("@noble/hashes ships only in the worker chunk, never in main-thread JS (HASH-04)", async ({
    page,
  }) => {
    const bodies: Promise<{ url: string; body: string }>[] = [];
    page.on("response", (response) => {
      if (!new URL(response.url()).pathname.endsWith(".js")) return;
      bodies.push(
        response
          .text()
          .catch(() => "")
          .then((body) => ({ url: response.url(), body })),
      );
    });

    await page.goto("/hash-smoke");
    await expect(page.getByTestId("hash-smoke-ready")).toHaveText("ready");

    // The worker and its chunks are created lazily on first start.
    const result = await hashAbc(page);
    expect(result.status).toBe("done");

    const all = await Promise.all(bodies);
    const markerUrls = all
      .filter((r) => r.body.includes(NOBLE_MARKER))
      .map((r) => r.url);

    // Non-vacuous: fails loudly if a noble upgrade renames the marker string.
    expect(markerUrls.length).toBeGreaterThanOrEqual(1);

    // Main-thread resource timing excludes worker-fetched scripts.
    const mainThreadResources = await page.evaluate(() =>
      performance.getEntriesByType("resource").map((e) => e.name),
    );
    for (const url of markerUrls) {
      expect(mainThreadResources).not.toContain(url);
    }
  });
  test("worker hashes a Blob through 1 MiB slices and matches node oracles (HASH-03, HASH-04)", async ({
    page,
  }) => {
    expect(
      getHashes(),
      "node:crypto lacks ripemd160 - this OpenSSL build cannot serve as the RIPEMD-160 oracle",
    ).toContain("ripemd160");
    expect(
      typeof crc32,
      "node:zlib crc32 missing - Node >= 22.2 required",
    ).toBe("function");

    const size = 3 * 1024 * 1024 + 5;
    const expected = oracleHex(Buffer.alloc(size, 97));
    expect(Object.keys(expected)).toHaveLength(10);

    await page.goto("/hash-smoke");
    await expect(page.getByTestId("hash-smoke-ready")).toHaveText("ready");

    const result = await page.evaluate(async () => {
      const file = new Blob([new Uint8Array(3 * 1024 * 1024 + 5).fill(97)]);
      const ticks: [number, number][] = [];
      const outcome = await window.__hashSmoke!.start(
        { kind: "file", file },
        { onProgress: (done, total) => ticks.push([done, total]) },
      );
      if (outcome.status !== "done") return { status: outcome.status, ticks };
      const hex: Record<string, string> = {};
      for (const [id, bytes] of Object.entries(outcome.digests)) {
        hex[id] = Array.from(bytes as Uint8Array)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      }
      return { status: outcome.status, hex, ticks };
    });

    expect(result.status).toBe("done");
    expect(result.hex).toEqual(expected);

    expect(result.ticks.length).toBeGreaterThan(0);
    for (let i = 1; i < result.ticks.length; i++) {
      expect(result.ticks[i][0]).toBeGreaterThanOrEqual(result.ticks[i - 1][0]);
    }
    for (const [, total] of result.ticks) expect(total).toBe(size);
    expect(size).toBe(3145733);
    expect(result.ticks[result.ticks.length - 1]).toEqual([3145733, 3145733]);
  });

  test("a 0-byte Blob yields the empty-input digests (HASH-04)", async ({
    page,
  }) => {
    await page.goto("/hash-smoke");
    await expect(page.getByTestId("hash-smoke-ready")).toHaveText("ready");

    const result = await page.evaluate(async () => {
      const outcome = await window.__hashSmoke!.start({
        kind: "file",
        file: new Blob([]),
      });
      if (outcome.status !== "done") return { status: outcome.status };
      const hex: Record<string, string> = {};
      for (const [id, bytes] of Object.entries(outcome.digests)) {
        hex[id] = Array.from(bytes as Uint8Array)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      }
      return { status: outcome.status, hex };
    });

    expect(result.status).toBe("done");
    expect(result.hex?.sha256).toBe(SHA256_EMPTY);
    expect(result.hex?.crc32).toBe("00000000");
  });

  test("superseding a 96 MiB job stops the worker within 2 s (HASH-04)", async ({
    page,
  }) => {
    await page.goto("/hash-smoke");
    await expect(page.getByTestId("hash-smoke-ready")).toHaveText("ready");

    const result = await page.evaluate(async () => {
      const client = window.__hashSmoke!;
      const big = "x".repeat(96 * 1024 * 1024);
      const p1 = client.start({ kind: "text", text: big });
      await new Promise((resolve) => setTimeout(resolve, 300));
      const t1 = performance.now();
      const o2 = await client.start({ kind: "text", text: "abc" });
      const elapsed = performance.now() - t1;
      const o1 = await p1;
      const sha256 =
        o2.status === "done"
          ? Array.from(o2.digests.sha256 as Uint8Array)
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("")
          : undefined;
      return { s1: o1.status, s2: o2.status, elapsed, sha256 };
    });

    expect(result.s1).toBe("cancelled");
    expect(result.s2).toBe("done");
    expect(result.sha256).toBe(ABC.sha256);
    expect(result.elapsed).toBeLessThan(2000);
  });

  test("dispose is final: in-flight job cancelled, later starts never deliver (HASH-04)", async ({
    page,
  }) => {
    await page.goto("/hash-smoke");
    await expect(page.getByTestId("hash-smoke-ready")).toHaveText("ready");

    const result = await page.evaluate(async () => {
      const client = window.__hashSmoke!;
      const inFlight = client.start({
        kind: "text",
        text: "y".repeat(8 * 1024 * 1024),
      });
      client.dispose();
      const o1 = await inFlight;
      const o2 = await client.start({ kind: "text", text: "abc" });
      return {
        s1: o1.status,
        s2: o2.status,
        delivered: "digests" in o2,
      };
    });

    expect(result.s1).toBe("cancelled");
    expect(result.s2).toBe("cancelled");
    expect(result.delivered).toBe(false);
  });

  test("hashing makes no third-party requests (HASH-04 privacy)", async ({
    page,
  }) => {
    const urls: string[] = [];
    page.on("request", (r) => urls.push(r.url()));

    await page.goto("/hash-smoke");
    await expect(page.getByTestId("hash-smoke-ready")).toHaveText("ready");

    const statuses = await page.evaluate(async () => {
      const client = window.__hashSmoke!;
      const t = await client.start({ kind: "text", text: "abc" });
      const f = await client.start({
        kind: "file",
        file: new Blob([new Uint8Array(64 * 1024).fill(97)]),
      });
      return [t.status, f.status];
    });
    expect(statuses).toEqual(["done", "done"]);

    // Non-vacuous: the page itself must have produced requests.
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      const { protocol, origin } = new URL(url);
      if (protocol !== "http:" && protocol !== "https:") continue; // data:, blob:
      expect(origin, `unexpected non-same-origin request: ${url}`).toBe(ORIGIN);
    }
  });
});
