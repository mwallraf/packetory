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
  "sha3-256": "3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532",
  "sha3-512":
    "b751850b1a57168a5693cd924b6b096e08f621827444f70d884f5d0240d2712e10e116e9192af3c91a7ec57647e3934057340b4cf408d5a56592f8274eec53f0",
  ripemd160: "8eb208f7e05d987a9b044a8e98c6b087f15a0bfc",
  crc32: "352441c2",
} as const;

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
});
