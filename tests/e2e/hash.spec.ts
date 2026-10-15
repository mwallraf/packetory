import { createHash } from "node:crypto";
import { crc32 } from "node:zlib";
import { expect, test } from "@playwright/test";

const IDS = [
  "md5",
  "sha1",
  "sha224",
  "sha256",
  "sha384",
  "sha512",
  "sha3-256",
  "sha3-512",
  "ripemd160",
  "crc32",
] as const;

type Id = (typeof IDS)[number];

/** Pinned fallback for runtimes whose OpenSSL lacks ripemd160. */
const SAMPLE_RIPEMD160 = "98c615784ccb5fe5936fbc0cbe9dfdb408d92f0f";

/** Node-side oracle: lowercase hex digest of `text` (UTF-8) for algorithm `id`. */
function expectedHex(id: Id, text: string): string {
  if (id === "crc32") {
    return crc32(Buffer.from(text, "utf8")).toString(16).padStart(8, "0");
  }
  if (id === "ripemd160") {
    try {
      return createHash("ripemd160").update(text, "utf8").digest("hex");
    } catch {
      if (text === "hello world") return SAMPLE_RIPEMD160;
      throw new Error("ripemd160 oracle unavailable");
    }
  }
  return createHash(id).update(text, "utf8").digest("hex");
}

test.describe("Hash Generator live text hashing (TEXT-01, TEXT-02)", () => {
  test("renders all 10 sample digests on load", async ({ page }) => {
    await page.goto("/tools/hash");
    await expect(page.getByTestId("hash-input")).toHaveValue("hello world");
    for (const id of IDS) {
      await expect(page.getByTestId(`hash-row-${id}-value`)).toHaveText(
        expectedHex(id, "hello world"),
      );
    }
    await expect(
      page.locator('[data-testid^="hash-row-"][data-testid$="-value"]'),
    ).toHaveCount(10);
  });

  test("typing hashes in the worker and updates every digest", async ({
    page,
  }) => {
    await page.goto("/tools/hash");
    await expect(page.getByTestId("hash-input")).toHaveValue("hello world");
    const urlBefore = page.url();
    await page.getByTestId("hash-input").fill("abc");
    await expect(page.getByTestId("hash-row-sha256-value")).toHaveText(
      expectedHex("sha256", "abc"),
    );
    await expect(page.getByTestId("hash-row-sha256-value")).toHaveText(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    await expect(page.getByTestId("hash-row-crc32-value")).toHaveText(
      "352441c2",
    );
    expect(page.url()).toBe(urlBefore);
  });

  test("select-on-focus replaces the sample (D-03)", async ({ page }) => {
    await page.goto("/tools/hash");
    await expect(page.getByTestId("hash-input")).toHaveValue("hello world");
    await page.getByTestId("hash-input").click();
    await page.keyboard.type("z");
    await expect(page.getByTestId("hash-input")).toHaveValue("z");
  });

  test("pasted CRLF is hashed as LF (TEXT-03)", async ({ page }) => {
    await page.goto("/tools/hash");
    await expect(page.getByTestId("hash-input")).toHaveValue("hello world");
    await page.getByTestId("hash-input").fill("a\r\nb");
    await expect(page.getByTestId("hash-bytes")).toHaveText("3 bytes (UTF-8)");
    await expect(page.getByTestId("hash-row-sha256-value")).toHaveText(
      expectedHex("sha256", "a\nb"),
    );
  });
});
