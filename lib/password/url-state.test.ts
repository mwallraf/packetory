import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { normalizeSymbols } from "./charset";
import {
  BATCH_MAX,
  BATCH_MIN,
  DEFAULT_OPTIONS,
  DEFAULT_SYMBOLS,
  LENGTH_MAX,
  LENGTH_MIN,
  MODES,
  SEPARATORS,
  WORDS_MAX,
  WORDS_MIN,
} from "./constants";
import type { ToolOptions } from "./types";
import {
  MAX_SEARCH_LENGTH,
  PASSWORD_URL_KEYS,
  parseOptions,
  serializeOptions,
} from "./url-state";

const nonDefault = {
  ...DEFAULT_OPTIONS,
  length: 32,
  avoidLookalikes: true,
  symbolSet: "!?",
  mode: "passphrase" as const,
  words: 8,
};

describe("URL options codec tracer (D-19, D-20)", () => {
  it("serializes the defaults to an empty query", () => {
    expect(serializeOptions(DEFAULT_OPTIONS)).toBe("");
  });

  it("serializes non-default options in the fixed key order", () => {
    expect(serializeOptions(nonDefault)).toBe(
      "mode=passphrase&len=32&sym=%21%3F&amb=1&words=8",
    );
  });

  it("parses back to the same options, with or without a leading ?", () => {
    const qs = "mode=passphrase&len=32&sym=%21%3F&amb=1&words=8";
    expect(parseOptions(qs)).toEqual(nonDefault);
    expect(parseOptions("?" + qs)).toEqual(nonDefault);
  });

  it("returns a fresh defaults object for an empty search", () => {
    const parsed = parseOptions("");
    expect(parsed).toEqual(DEFAULT_OPTIONS);
    expect(parsed).not.toBe(DEFAULT_OPTIONS);
  });
});

const GRID: ReadonlyArray<[string, Partial<ToolOptions>]> = [
  ["len=999", { length: 128 }],
  ["len=1", { length: 4 }],
  ["len=0", { length: 4 }],
  ["len=20abc", { length: 20 }],
  ["len=-5", { length: 20 }],
  ["len=1e3", { length: 20 }],
  ["len=", { length: 20 }],
  ["len=%EF%BC%92%EF%BC%90", { length: 20 }], // full-width "20"
  ["len=20%0A", { length: 20 }],
  ["len=12345", { length: 20 }],
  ["len=%2B20", { length: 20 }], // "+20" literal
  ["len=+20", { length: 20 }], // "+" decodes to a space
  ["len=20.5", { length: 20 }],
  ["len=0128", { length: 128 }],
  ["words=2", { words: 3 }],
  ["words=99", { words: 20 }],
  ["n=0", { batch: 1 }],
  ["n=21", { batch: 20 }],
  ["u=0&l=0&d=0&s=0", { uppercase: true, lowercase: true, digits: true, symbols: true }],
  ["u=2", { uppercase: true }],
  ["u=true", { uppercase: true }],
  ["u=", { uppercase: true }],
  ["u=01", { uppercase: true }],
  ["amb=true", { avoidLookalikes: false }],
  [`sym=${"!".repeat(65)}`, { symbolSet: DEFAULT_SYMBOLS }],
  [`sym=${"!".repeat(64)}`, { symbolSet: "!" }],
  ["sym=%C3%A9%F0%9F%98%80abc!!", { symbolSet: "!" }],
  ["sym=abc123", { symbolSet: DEFAULT_SYMBOLS }],
  ["sym=%ED%A0%80%ED%B0%80", { symbolSet: DEFAULT_SYMBOLS }],
  ["sym=%20", { symbolSet: DEFAULT_SYMBOLS }],
  ["sym=", { symbolSet: DEFAULT_SYMBOLS }],
  ["mode=hax", { mode: "password" }],
  ["mode=PASSPHRASE", { mode: "password" }],
  ["mode=passphrase", { mode: "passphrase" }],
  ["sep=%20", { separator: "-" }],
  ["sep=comma", { separator: "-" }],
  ["sep=-", { separator: "-" }],
  ["sep=dash&sep=dot", { separator: "-" }],
  ["sep=dot&sep=dash", { separator: "." }],
  ["sep=underscore", { separator: "_" }],
  ["sep=space", { separator: " " }],
];

describe("hostile input (D-21)", () => {
  it.each(GRID)("%s", (search, expected) => {
    expect(parseOptions(search)).toMatchObject(expected);
    expect(parseOptions("?" + search)).toMatchObject(expected);
  });

  it("is total for non-string input", () => {
    for (const bad of [undefined, null, 123, {}]) {
      expect(parseOptions(bad as never)).toEqual(DEFAULT_OPTIONS);
    }
  });

  it("applies the 2048-character cap exactly at the boundary", () => {
    const at = "?len=64&x=".padEnd(2048, "a");
    expect(at).toHaveLength(2048);
    expect(parseOptions(at).length).toBe(64);
    expect(parseOptions(at + "a")).toEqual(DEFAULT_OPTIONS);
    expect(parseOptions("?" + "a=b&".repeat(1000) + "len=64")).toEqual(DEFAULT_OPTIONS);
  });

  it("strips exactly one leading question mark and is case-sensitive", () => {
    expect(parseOptions("len=64").length).toBe(64);
    expect(parseOptions("??len=64").length).toBe(20);
    expect(parseOptions("?LEN=64").length).toBe(20);
    expect(parseOptions("?len=64&len=10").length).toBe(64);
  });

  it("parses passphrase options", () => {
    expect(
      parseOptions("?cap=1&num=1&words=8&sep=underscore&mode=passphrase&n=5"),
    ).toMatchObject({
      capitalize: true,
      appendNumber: true,
      words: 8,
      separator: "_",
      mode: "passphrase",
      batch: 5,
    });
  });

  it("ignores unknown and prototype keys without polluting Object.prototype", () => {
    const result = parseOptions("?__proto__=x&constructor=y&toString=z&x=1");
    expect(({} as Record<string, unknown>).x).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(result).toEqual(DEFAULT_OPTIONS);
    expect(Object.keys(parseOptions("?__proto__[polluted]=1&__proto__=%7B%7D"))).toHaveLength(13);
  });
});

const printable = Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) =>
  String.fromCharCode(0x20 + i),
);

const validOptions = fc.record({
  mode: fc.constantFrom(...MODES),
  length: fc.integer({ min: LENGTH_MIN, max: LENGTH_MAX }),
  sets: fc.integer({ min: 1, max: 15 }),
  symbolSet: fc
    .string({ unit: fc.constantFrom(...printable) })
    .map(normalizeSymbols),
  avoidLookalikes: fc.boolean(),
  words: fc.integer({ min: WORDS_MIN, max: WORDS_MAX }),
  separator: fc.constantFrom(...SEPARATORS),
  capitalize: fc.boolean(),
  appendNumber: fc.boolean(),
  batch: fc.integer({ min: BATCH_MIN, max: BATCH_MAX }),
}).map(({ sets, ...rest }): ToolOptions => ({
  ...rest,
  uppercase: (sets & 1) !== 0,
  lowercase: (sets & 2) !== 0,
  digits: (sets & 4) !== 0,
  symbols: (sets & 8) !== 0,
}));

const structured = fc
  .array(
    fc.tuple(
      fc.constantFrom(...PASSWORD_URL_KEYS, "__proto__", "constructor", "x"),
      fc.constantFrom(
        "0", "1", "2", "-5", "1e3", "999", "0128", "20abc", "", "%ZZ", "%ED%A0%80",
        "dash", "space", "comma", "passphrase", "%2B", "!".repeat(65), "%C3%A9!",
      ),
    ),
    { maxLength: 30 },
  )
  .map((pairs) => "?" + pairs.map(([k, v]) => `${k}=${v}`).join("&"));

const anySearch = fc.oneof(
  fc.string({ unit: "binary" }),
  fc.webQueryParameters(),
  structured,
);

describe("properties (D-22)", () => {
  it("parseOptions never throws and always returns bounded, normalized options", () => {
    fc.assert(
      fc.property(anySearch, (search) => {
        const r = parseOptions(search);
        expect(Object.keys(r).sort()).toEqual(Object.keys(DEFAULT_OPTIONS).sort());
        expect(Object.keys(r)).toHaveLength(13);
        for (const [v, lo, hi] of [
          [r.length, LENGTH_MIN, LENGTH_MAX],
          [r.words, WORDS_MIN, WORDS_MAX],
          [r.batch, BATCH_MIN, BATCH_MAX],
        ] as const) {
          expect(Number.isInteger(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(lo);
          expect(v).toBeLessThanOrEqual(hi);
        }
        expect(SEPARATORS).toContain(r.separator);
        expect(MODES).toContain(r.mode);
        expect(r.uppercase || r.lowercase || r.digits || r.symbols).toBe(true);
        expect(r.symbolSet).toBe(normalizeSymbols(r.symbolSet));
        expect(r.symbolSet.length).toBeGreaterThanOrEqual(1);
        expect(r.symbolSet.length).toBeLessThanOrEqual(32);
      }),
      { numRuns: 500 },
    );
  });

  it("round-trips every valid option set, with and without a leading ?", () => {
    fc.assert(
      fc.property(validOptions, (o) => {
        const s = serializeOptions(o);
        expect(parseOptions(s)).toEqual(o);
        expect(parseOptions("?" + s)).toEqual(o);
      }),
      { numRuns: 500 },
    );
  });

  it("serialize(parse(s)) is idempotent", () => {
    fc.assert(
      fc.property(anySearch, (search) => {
        const once = serializeOptions(parseOptions(search));
        expect(serializeOptions(parseOptions(once))).toBe(once);
      }),
      { numRuns: 500 },
    );
  });

  it("serialized keys are unique, whitelisted and in order", () => {
    fc.assert(
      fc.property(validOptions, (o) => {
        const s = serializeOptions(o);
        const keys = [...new URLSearchParams(s).keys()];
        expect(new Set(keys).size).toBe(keys.length);
        let from = 0;
        for (const key of keys) {
          const at = PASSWORD_URL_KEYS.indexOf(key as (typeof PASSWORD_URL_KEYS)[number]);
          expect(at).toBeGreaterThanOrEqual(from);
          from = at + 1;
        }
        expect(s.length).toBeLessThan(MAX_SEARCH_LENGTH);
      }),
      { numRuns: 300 },
    );
  });

  it("the maximal serialization stays under the search cap", () => {
    const maximal: ToolOptions = {
      mode: "passphrase",
      length: 128,
      uppercase: false,
      lowercase: false,
      digits: false,
      symbols: true,
      symbolSet: "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~".slice(0, 32),
      avoidLookalikes: true,
      words: 20,
      separator: " ",
      capitalize: true,
      appendNumber: true,
      batch: 20,
    };
    expect(normalizeSymbols(maximal.symbolSet)).toHaveLength(32);
    const s = serializeOptions(maximal);
    expect(s.length).toBeLessThan(MAX_SEARCH_LENGTH);
    expect(parseOptions(s)).toEqual(maximal);
  });
});

describe("no field can carry generated output (D-22)", () => {
  it("serializeOptions accepts only ToolOptions", () => {
    // @ts-expect-error serializeOptions takes ToolOptions only, never a generated string
    expect(serializeOptions("hunter2")).toBe("");
    // @ts-expect-error excess property: a password field is not part of ToolOptions
    expect(serializeOptions({ ...DEFAULT_OPTIONS, password: "hunter2" })).toBe("");
  });

  it("an extra field never reaches the string", () => {
    const s = serializeOptions({ ...DEFAULT_OPTIONS, password: "hunter2" } as never);
    expect(s).not.toContain("hunter2");
    expect(s).toBe("");
  });

  it("normalizes its input", () => {
    expect(serializeOptions({ ...DEFAULT_OPTIONS, length: 999, symbolSet: "abc" })).toBe(
      "len=128",
    );
  });
});
