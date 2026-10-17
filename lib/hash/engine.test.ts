// @vitest-environment node
import { createHash, getHashes } from "node:crypto";
import { crc32 } from "node:zlib";
import { describe, expect, it } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import { FACTORIES } from "./engine";
import { digestsToHex } from "./format";
import { hashBytes, hashText } from "./job";
import type { AlgorithmId } from "./types";

type Hex = Partial<Record<AlgorithmId, string>>;

// Shared inputs from the 08-RESEARCH vector appendix.
const A448 = "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq";
const A896 =
  "abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu";
const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const D80 = "1234567890".repeat(8);
const M = "a".repeat(1_000_000);

// Legacy Keccak constants - kept as strings only, never computed.
const KECCAK_256_EMPTY =
  "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
const KECCAK_512_EMPTY =
  "0eab42de4c3ceb9235fc91acffe746b29c29a8c366b7c60e4e67c466f36a4304c00fa9caf9d87976ba469bcbe06713b435f091ef2769fb160cdab33d3670680e";

const SHA3_256_EMPTY =
  "a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a";
const SHA3_512_EMPTY =
  "a69f73cca23a9ac5c8b567dc185a756e97c982164fe25859e0d1dcc1475c80a615b2123af1f5f94c11e3e9402c3ac558f500199d95b6d3e301758586281dcd26";

// Short labels only: the input text is never used as a test title (the
// million-'a' input in a title produced a 64 KB failure report).
const VECTORS: { name: string; input: string; expected: Hex }[] = [
  {
    name: "empty",
    input: "",
    expected: {
      md5: "d41d8cd98f00b204e9800998ecf8427e",
      sha1: "da39a3ee5e6b4b0d3255bfef95601890afd80709",
      sha224: "d14a028c2a3a2bc9476102bb288234c415a2b01f828ea62ac5b3e42f",
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      sha384:
        "38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da274edebfe76f65fbd51ad2f14898b95b",
      sha512:
        "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e",
      "sha3-256": SHA3_256_EMPTY,
      "sha3-512": SHA3_512_EMPTY,
      ripemd160: "9c1185a5c5e9fc54612808977ee8f548b2258d31",
      crc32: "00000000",
    },
  },
  {
    name: "a",
    input: "a",
    expected: {
      md5: "0cc175b9c0f1b6a831c399e269772661",
      ripemd160: "0bdc9d2d256b3ee9daae347be6f4dc835a467ffe",
      crc32: "e8b7be43",
    },
  },
  {
    name: "abc",
    input: "abc",
    expected: {
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
    },
  },
  {
    name: "message-digest",
    input: "message digest",
    expected: {
      md5: "f96b697d7cb7938d525a2f31aaf161d0",
      ripemd160: "5d0689ef49d2fae572b881b123a85ffa21595f36",
    },
  },
  {
    name: "alphabet",
    input: "abcdefghijklmnopqrstuvwxyz",
    expected: {
      md5: "c3fcd3d76192e4007dfb496cca67e13b",
      ripemd160: "f71c27109c692c1b56bbdceb5b9d2865b3708dbc",
    },
  },
  {
    name: "alnum",
    input: ALNUM,
    expected: {
      md5: "d174ab98d277d9f5a5611c2c9f419d9f",
      ripemd160: "b0e20b6e3116640286ed3a87a5713079b21f5189",
    },
  },
  {
    name: "digits80",
    input: D80,
    expected: {
      md5: "57edf4a22be3c955ac49da2e2107b67a",
      ripemd160: "9b752e45573d4b39f4dbd3323cab82bf63326bfb",
    },
  },
  {
    name: "a448",
    input: A448,
    expected: {
      sha1: "84983e441c3bd26ebaae4aa1f95129e5e54670f1",
      sha224: "75388b16512776cc5dba5da1fd890150b0c6455cb4f58b1952522525",
      sha256: "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
      "sha3-256":
        "41c0dba2a9d6240849100376a8235e2c82e1b9998a999e21db32dd97496d3376",
      ripemd160: "12a053384a9c0c88e405a06c27dcf49ada62eb2b",
    },
  },
  {
    name: "a896",
    input: A896,
    expected: {
      sha384:
        "09330c33f71147e83d192fc782cd1b4753111b173b3b05d22fa08086e3b0f712fcc7c71a557e2db966c3e9fa91746039",
      sha512:
        "8e959b75dae313da8cf4f72814fc143f8f7779c6eb9f7fa17299aeadb6889018501d289e4900f7e4331b99dec4b5433ac7d329eeb6dd26545e96e55b874be909",
    },
  },
  {
    name: "million-a",
    input: M,
    expected: {
      sha1: "34aa973cd4c4daa4f61eeb2bdbad27316534016f",
      sha224: "20794655980c91d8bbb4c1ea97618a4bf03f42581948b2ee4ee7ad67",
      sha256: "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0",
      sha384:
        "9d0e1809716474cb086e834e310a4a1ced149e9c00f248527972cec5704c2a5b07b8b3dc38ecc4ebae97ddd87f3d8985",
      sha512:
        "e718483d0ce769644e2e42c7bc15b4638e1f98b13b2044285632a803afa973ebde0ff244877ea60a4cb0432ce577c31beb009c5c2c49aa2e4eadb217ad8cc09b",
      "sha3-256":
        "5c8875ae474a3634ba4fd55ec85bffd661f32aca75c6d699d0cdcb6c115891c1",
      "sha3-512":
        "3c3a876da14034ab60627c077bb98f7e120a2a5370212dffb3385a18d4f38859ed311d0a9d5141ce9cc5c66ee689b266a8aa18ace8282a0e0db596c90b0a7b87",
      ripemd160: "52783243c1697bdbe16d37f97f68f08325dc1528",
    },
  },
  { name: "crc-catalogue", input: "123456789", expected: { crc32: "cbf43926" } },
  {
    name: "crc-fox",
    input: "The quick brown fox jumps over the lazy dog",
    expected: { crc32: "414fa339" },
  },
  { name: "crc-leading-zero", input: "62", expected: { crc32: "0012d20a" } },
];

const IDS = Object.keys(FACTORIES) as AlgorithmId[];

// Hash each shared input once for all algorithms.
const cache = new Map<string, Promise<Record<AlgorithmId, string>>>();
function hexOf(input: string): Promise<Record<AlgorithmId, string>> {
  let p = cache.get(input);
  if (!p) {
    p = hashText(input).then(digestsToHex);
    cache.set(input, p);
  }
  return p;
}

const ROWS = VECTORS.flatMap((v) =>
  (Object.entries(v.expected) as [AlgorithmId, string][]).map(
    ([id, hex]) => [`${v.name} ${id}`, v.input, id, hex] as const,
  ),
);

describe("published vectors (HASH-01)", () => {
  it("covers the appendix row counts per algorithm", () => {
    const counts: Record<string, number> = {};
    for (const [, , id] of ROWS) counts[id] = (counts[id] ?? 0) + 1;
    expect(counts).toEqual({
      md5: 7,
      sha1: 4,
      sha224: 4,
      sha256: 4,
      sha384: 4,
      sha512: 4,
      "sha3-256": 4,
      "sha3-512": 3,
      ripemd160: 9,
      crc32: 6,
    });
  });

  it.each(ROWS)("%s", async (_label, input, id, expected) => {
    const hex = await hexOf(input);
    expect(hex[id]).toBe(expected);
  });
});

const BOUNDARY_LENGTHS = [
  0, 1, 55, 56, 57, 63, 64, 65, 71, 72, 73, 111, 112, 113, 127, 128, 129, 135,
  136, 137,
];

function oracle(id: AlgorithmId, bytes: Uint8Array): string {
  if (id === "crc32") return crc32(bytes).toString(16).padStart(8, "0");
  return createHash(id).update(bytes).digest("hex");
}

describe("node oracle availability (HASH-01)", () => {
  it("node:zlib crc32 exists (Node >= 22.2 required)", () => {
    expect(
      typeof crc32,
      "node:zlib crc32 missing - Node >= 22.2 required",
    ).toBe("function");
  });

  it("node:crypto exposes ripemd160", () => {
    expect(
      getHashes(),
      "node:crypto lacks ripemd160 - this OpenSSL build cannot serve as the RIPEMD-160 oracle",
    ).toContain("ripemd160");
  });
});

describe("padding and sponge-rate boundaries (HASH-01)", () => {
  it.each(BOUNDARY_LENGTHS)("len %i: all 10 digests equal node oracles", async (len) => {
    const bytes = Uint8Array.from({ length: len }, (_, i) => (i * 31 + 7) & 255);
    const hex = digestsToHex(await hashBytes(bytes));
    for (const id of IDS) {
      expect(hex[id], `${id} @ ${len}`).toBe(oracle(id, bytes));
    }
  });
});

describe("SHA3 is FIPS 202, not legacy Keccak (HASH-01)", () => {
  it("SHA3-256 of empty input is the FIPS 202 value, not Keccak-256", async () => {
    const hex = (await hexOf(""))["sha3-256"];
    expect(hex).toBe(SHA3_256_EMPTY);
    expect(hex).not.toBe(KECCAK_256_EMPTY);
  });

  it("SHA3-512 of empty input is the FIPS 202 value, not Keccak-512", async () => {
    const hex = (await hexOf(""))["sha3-512"];
    expect(hex).toBe(SHA3_512_EMPTY);
    expect(hex).not.toBe(KECCAK_512_EMPTY);
  });
});

describe("UTF-8 bytes, no trim, no normalize (HASH-02)", () => {
  const sha256 = async (s: string) => (await hexOf(s)).sha256;

  it("hashes the UTF-8 bytes of e-acute, euro, and rocket", async () => {
    expect(await sha256("é€🚀")).toBe(
      "a35e1b37e8a63f0d00821d46edab7e38a4bd3ac0e749ad52b5cce7715edf2211",
    );
  });

  it("NFC and NFD forms of e-acute hash differently", async () => {
    const nfc = await sha256("é");
    const nfd = await sha256("é");
    expect(nfc).toBe(
      "4a99557e4033c3539de2eb65472017cad5f9557f7a0625a09f1c3f6e2ba69c4c",
    );
    expect(nfd).toBe(
      "bf12767b0f2a56b2190075bae8169f656e3ce8d6357d4aff184bc6c7ea48f9f6",
    );
    expect(nfc).not.toBe(nfd);
  });

  it("a lone surrogate encodes as EF BF BD", async () => {
    const lone = await sha256("\ud83d");
    expect(lone).toBe(
      "83d544ccc223c057d2bf80d3f2a32982c32c3c0db8e2674820da5064783fb097",
    );
    const replacement = digestsToHex(
      await hashBytes(new Uint8Array([0xef, 0xbf, 0xbd])),
    ).sha256;
    expect(lone).toBe(replacement);
  });

  it("a leading space or trailing newline changes the digest", async () => {
    const base = await sha256("abc");
    expect(await sha256(" abc")).not.toBe(base);
    expect(await sha256("abc\n")).not.toBe(base);
  });

  fcIt.prop([fc.string({ unit: "binary" })])(
    "SHA-256 of any string equals node UTF-8 sha256",
    async (s) => {
      const got = digestsToHex(await hashText(s)).sha256;
      expect(got).toBe(createHash("sha256").update(s, "utf8").digest("hex"));
    },
  );
});

describe("empty and single-character input (HASH-01, HASH-02)", () => {
  it("empty bytes yield the published digests", async () => {
    const hex = digestsToHex(await hashBytes(new Uint8Array(0)));
    expect(hex.sha256).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(hex.md5).toBe("d41d8cd98f00b204e9800998ecf8427e");
    expect(hex["sha3-256"]).toBe(SHA3_256_EMPTY);
    expect(hex.crc32).toBe("00000000");
  });

  it("'a' yields the published digests", async () => {
    const hex = await hexOf("a");
    expect(hex.md5).toBe("0cc175b9c0f1b6a831c399e269772661");
    expect(hex.ripemd160).toBe("0bdc9d2d256b3ee9daae347be6f4dc835a467ffe");
    expect(hex.crc32).toBe("e8b7be43");
  });
});

describe("single-use hashers and byte-only input (HASH-01, HASH-02)", () => {
  // noble's SHA2/MD-family hashers report "hash was destroyed"; its Keccak
  // (SHA3) class reports "digest() was already called". Both are single-use.
  const SINGLE_USE = /hash was destroyed|digest\(\) was already called/;

  it.each(IDS)("%s: update() and digest() after digest() throw", (id) => {
    const h = FACTORIES[id]();
    h.update(new Uint8Array([1, 2, 3]));
    h.digest();
    expect(() => h.digest()).toThrow(SINGLE_USE);
    expect(() => h.update(new Uint8Array(1))).toThrow(SINGLE_USE);
  });

  it.each(IDS.filter((id) => id !== "crc32"))(
    "%s: a string chunk is rejected with a TypeError",
    (id) => {
      const h = FACTORIES[id]();
      expect(() => h.update("abc" as unknown as Uint8Array)).toThrow(TypeError);
    },
  );
});
