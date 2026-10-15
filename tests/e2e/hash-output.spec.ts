import { expect, test } from "@playwright/test";

const SHA256_HEX =
  "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9";
const SHA256_B64 = "uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek=";
const CRC32_HEX = "0d4a1185";

test.describe("Hash Generator output encoding and copy (OUT-01, OUT-03)", () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  });

  test("encoding toggle re-formats digests and restores hex exactly (OUT-03)", async ({
    page,
  }) => {
    await page.goto("/tools/hash");
    const sha = page.getByTestId("hash-row-sha256-value");
    const crc = page.getByTestId("hash-row-crc32-value");
    await expect(sha).toHaveText(SHA256_HEX);

    await page.getByTestId("hash-encoding-HEX").click();
    await expect(sha).toHaveText(SHA256_HEX.toUpperCase());
    await expect(crc).toHaveText(CRC32_HEX.toUpperCase());

    await page.getByTestId("hash-encoding-base64").click();
    await expect(sha).toHaveText(SHA256_B64);
    await expect(crc).toHaveText(CRC32_HEX);

    await page.getByTestId("hash-encoding-hex").click();
    await expect(sha).toHaveText(SHA256_HEX);
    await expect(crc).toHaveText(CRC32_HEX);
  });

  test("copying a row writes the digest as displayed and confirms (OUT-01)", async ({
    page,
  }) => {
    await page.goto("/tools/hash");
    await page.getByTestId("hash-encoding-HEX").click();

    const copy = page.getByTestId("hash-row-sha256-copy");
    await copy.click();
    await expect(copy).toHaveAttribute("aria-label", "Copied!");
    await expect(page.getByTestId("hash-row-sha256-status")).toHaveText(
      "Copied!",
    );
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe(SHA256_HEX.toUpperCase());
  });
});
