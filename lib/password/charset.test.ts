import { describe, expect, it } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import {
  clampBatchCount,
  normalizePassphraseOptions,
  normalizePasswordOptions,
  normalizeSymbols,
  normalizeToolOptions,
  resolveAlphabet,
} from "./charset";
import {
  DEFAULT_OPTIONS,
  DEFAULT_POOL_SIZE,
  DEFAULT_SYMBOLS,
  DEFAULT_SYMBOLS_SIZE,
  DIGITS,
  DIGITS_SIZE,
  LOOK_ALIKES,
  LOWERCASE,
  LOWERCASE_SIZE,
  SYMBOL_SET_MAX,
  UPPERCASE,
  UPPERCASE_SIZE,
} from "./constants";

const ALL_PRINTABLE = Array.from({ length: 94 }, (_, i) =>
  String.fromCharCode(0x21 + i),
).join("");

const ALL_OFF = {
  uppercase: false,
  lowercase: false,
  digits: false,
  symbols: false,
};

function isAlnum(code: number): boolean {
  return (
    (code >= 0x30 && code <= 0x39) ||
    (code >= 0x41 && code <= 0x5a) ||
    (code >= 0x61 && code <= 0x7a)
  );
}

describe("constants (D-06, D-18)", () => {
  it("set strings match their declared sizes", () => {
    expect(UPPERCASE).toHaveLength(UPPERCASE_SIZE);
    expect(UPPERCASE_SIZE).toBe(26);
    expect(LOWERCASE).toHaveLength(LOWERCASE_SIZE);
    expect(LOWERCASE_SIZE).toBe(26);
    expect(DIGITS).toHaveLength(DIGITS_SIZE);
    expect(DIGITS_SIZE).toBe(10);
    expect(DEFAULT_SYMBOLS).toHaveLength(DEFAULT_SYMBOLS_SIZE);
    expect(DEFAULT_SYMBOLS_SIZE).toBe(23);
  });

  it("the default pool is 26 + 26 + 10 + 23 = 85", () => {
    expect(DEFAULT_POOL_SIZE).toBe(
      UPPERCASE_SIZE + LOWERCASE_SIZE + DIGITS_SIZE + DEFAULT_SYMBOLS_SIZE,
    );
    expect(DEFAULT_POOL_SIZE).toBe(85);
  });

  it("LOOK_ALIKES and SYMBOL_SET_MAX", () => {
    expect(LOOK_ALIKES).toBe("0Oo1lI|");
    expect(SYMBOL_SET_MAX).toBe(32);
    let nonAlnum = 0;
    for (let code = 0x21; code <= 0x7e; code++) {
      if (!isAlnum(code)) nonAlnum++;
    }
    expect(SYMBOL_SET_MAX).toBe(nonAlnum);
  });
});

describe("normalizeSymbols (D-07)", () => {
  it("dedupes in first-seen order", () => {
    expect(normalizeSymbols("!!@@##")).toBe("!@#");
    expect(normalizeSymbols("?!?")).toBe("?!");
  });

  it("restores the default for empty, all-alphanumeric and whitespace input", () => {
    expect(normalizeSymbols("abc123")).toBe(DEFAULT_SYMBOLS);
    expect(normalizeSymbols("")).toBe(DEFAULT_SYMBOLS);
    expect(normalizeSymbols(" ")).toBe(DEFAULT_SYMBOLS);
  });

  it("drops spaces, non-ASCII, astral and control characters", () => {
    expect(normalizeSymbols(" ! ")).toBe("!");
    expect(normalizeSymbols("é😀abc!!")).toBe("!");
    expect(normalizeSymbols("\u0000\u007F!")).toBe("!");
  });

  it("caps at 32 and keeps first-seen order for all printable ASCII reversed", () => {
    const reversed = [...ALL_PRINTABLE].reverse().join("");
    const expected = [...reversed].filter((c) => !isAlnum(c.charCodeAt(0)));
    const result = normalizeSymbols(reversed);
    expect(result).toHaveLength(32);
    expect([...result]).toEqual(expected);
  });

  it("non-string input gives the default", () => {
    expect(normalizeSymbols(undefined)).toBe(DEFAULT_SYMBOLS);
    expect(normalizeSymbols(null)).toBe(DEFAULT_SYMBOLS);
    expect(normalizeSymbols(42)).toBe(DEFAULT_SYMBOLS);
    expect(normalizeSymbols(["!"])).toBe(DEFAULT_SYMBOLS);
  });

  for (const [label, arb] of [
    ["fc.string()", fc.string()],
    ['fc.string({ unit: "binary" })', fc.string({ unit: "binary" })],
  ] as const) {
    fcIt.prop([arb], { numRuns: 300 })(`properties over ${label}`, (input) => {
      const out = normalizeSymbols(input);
      // idempotent
      expect(normalizeSymbols(out)).toBe(out);
      expect(out.length).toBeGreaterThanOrEqual(1);
      expect(out.length).toBeLessThanOrEqual(32);
      expect(new Set(out).size).toBe(out.length);
      for (const ch of out) {
        const code = ch.charCodeAt(0);
        expect(code).toBeGreaterThanOrEqual(0x21);
        expect(code).toBeLessThanOrEqual(0x7e);
        expect(isAlnum(code)).toBe(false);
      }
      if (out !== DEFAULT_SYMBOLS) {
        let previous = -1;
        for (const ch of out) {
          const at = input.indexOf(ch);
          expect(at).toBeGreaterThan(previous);
          previous = at;
        }
      }
    });
  }
});

describe("resolveAlphabet (D-08, D-09)", () => {
  it("default pool is the 85-character A-Z a-z 0-9 default symbols string", () => {
    const a = resolveAlphabet(DEFAULT_OPTIONS);
    expect(a.pool).toBe(UPPERCASE + LOWERCASE + DIGITS + DEFAULT_SYMBOLS);
    expect(a.poolSize).toBe(85);
  });

  it("avoidLookalikes gives 79 characters with set sizes [24,24,8,23]", () => {
    const a = resolveAlphabet({ ...DEFAULT_OPTIONS, avoidLookalikes: true });
    expect(a.poolSize).toBe(79);
    expect(a.pool).toHaveLength(79);
    expect(a.sets.map((s) => s.length)).toEqual([24, 24, 8, 23]);
    for (const ch of LOOK_ALIKES) expect(a.pool.includes(ch)).toBe(false);
  });

  it("all flags off yields all four sets", () => {
    const a = resolveAlphabet({ ...DEFAULT_OPTIONS, ...ALL_OFF });
    expect(a.sets).toHaveLength(4);
    expect(a.poolSize).toBe(85);
  });

  it("a look-alike symbols-only set falls back to the default symbols", () => {
    const only = { ...ALL_OFF, symbols: true, symbolSet: "|" };
    expect(resolveAlphabet({ ...only, avoidLookalikes: true }).pool).toBe(
      DEFAULT_SYMBOLS,
    );
    expect(resolveAlphabet({ ...only, avoidLookalikes: true }).poolSize).toBe(
      23,
    );
    expect(resolveAlphabet(only).pool).toBe("|");
    expect(resolveAlphabet(only).poolSize).toBe(1);
  });

  it("digits-only with avoidLookalikes gives 23456789", () => {
    const a = resolveAlphabet({
      ...ALL_OFF,
      digits: true,
      avoidLookalikes: true,
    });
    expect(a.pool).toBe("23456789");
  });

  fcIt.prop(
    [
      fc.record({
        length: fc.oneof(fc.integer({ min: -10, max: 300 }), fc.constant(NaN)),
        uppercase: fc.oneof(fc.boolean(), fc.anything()),
        lowercase: fc.oneof(fc.boolean(), fc.anything()),
        digits: fc.oneof(fc.boolean(), fc.anything()),
        symbols: fc.oneof(fc.boolean(), fc.anything()),
        symbolSet: fc.string({ unit: "binary" }),
        avoidLookalikes: fc.boolean(),
      }),
    ],
    { numRuns: 300 },
  )("alphabet invariants over arbitrary raw inputs", (raw) => {
    const a = resolveAlphabet(raw);
    expect(new Set(a.pool).size).toBe(a.pool.length);
    expect(a.poolSize).toBe(a.pool.length);
    expect(a.sets.join("")).toBe(a.pool);
    const seen = new Set<string>();
    for (const set of a.sets) {
      expect(set.length).toBeGreaterThan(0);
      for (const ch of set) {
        expect(seen.has(ch)).toBe(false);
        seen.add(ch);
      }
    }
    for (const ch of a.pool) {
      const code = ch.charCodeAt(0);
      expect(code).toBeGreaterThanOrEqual(0x21);
      expect(code).toBeLessThanOrEqual(0x7e);
      if (raw.avoidLookalikes) expect(LOOK_ALIKES.includes(ch)).toBe(false);
    }
  });
});

describe("option normalization (D-04)", () => {
  it("normalizePasswordOptions clamps length", () => {
    expect(normalizePasswordOptions({ length: 999 }).length).toBe(128);
    expect(normalizePasswordOptions({ length: 1 }).length).toBe(4);
    expect(normalizePasswordOptions({ length: 3.9 }).length).toBe(4);
    expect(normalizePasswordOptions({ length: 20.7 }).length).toBe(20);
    for (const bad of [NaN, Infinity, "20"]) {
      expect(normalizePasswordOptions({ length: bad }).length).toBe(20);
    }
  });

  it("normalizePasswordOptions ignores non-boolean flags and extra keys", () => {
    expect(normalizePasswordOptions({ uppercase: "true" }).uppercase).toBe(
      true,
    );
    const out = normalizePasswordOptions({ password: "x" });
    expect(Object.keys(out)).toHaveLength(7);
    expect("password" in out).toBe(false);
  });

  it("normalizePassphraseOptions", () => {
    expect(normalizePassphraseOptions({ words: 2 }).words).toBe(3);
    expect(normalizePassphraseOptions({ words: 99 }).words).toBe(20);
    expect(normalizePassphraseOptions({ words: NaN }).words).toBe(6);
    expect(normalizePassphraseOptions({ separator: "," }).separator).toBe("-");
    expect(normalizePassphraseOptions({ separator: " " }).separator).toBe(" ");
    expect(normalizePassphraseOptions({ capitalize: "yes" }).capitalize).toBe(
      false,
    );
  });

  it("normalizeToolOptions", () => {
    expect(normalizeToolOptions({ mode: "hax" }).mode).toBe("password");
    expect(normalizeToolOptions({ batch: 0 }).batch).toBe(1);
    expect(normalizeToolOptions({ batch: 21 }).batch).toBe(20);
    expect(normalizeToolOptions({ batch: 3.9 }).batch).toBe(3);
    expect(normalizeToolOptions({ batch: NaN }).batch).toBe(1);
    expect(normalizeToolOptions(DEFAULT_OPTIONS)).toEqual(DEFAULT_OPTIONS);
    expect(Object.keys(normalizeToolOptions({})).sort()).toEqual(
      Object.keys(DEFAULT_OPTIONS).sort(),
    );
  });

  it("clampBatchCount", () => {
    for (const bad of [-5, 0, NaN, Infinity, "5"]) {
      expect(clampBatchCount(bad)).toBe(1);
    }
    expect(clampBatchCount(1)).toBe(1);
    expect(clampBatchCount(3.9)).toBe(3);
    expect(clampBatchCount(20)).toBe(20);
    expect(clampBatchCount(21)).toBe(20);
  });

  fcIt.prop([fc.anything()], { numRuns: 200 })(
    "normalizeToolOptions is idempotent and total",
    (input) => {
      const once = normalizeToolOptions(input);
      expect(normalizeToolOptions(once)).toEqual(once);
    },
  );
});

describe("Edge cases (PWD-04)", () => {
  it("Edge (PWD-04, adjacency): sets are pairwise disjoint and duplicate symbols collapse to one pool entry", () => {
    expect(normalizeSymbols("!!!aA1")).toBe("!");
    const pool = resolveAlphabet({ ...DEFAULT_OPTIONS, symbolSet: "!!" }).pool;
    expect([...pool].filter((c) => c === "!")).toHaveLength(1);
  });

  it("Edge (PWD-04, empty / single-element / null): empty inputs restore defaults and a single symbol works", () => {
    expect(
      resolveAlphabet({ ...DEFAULT_OPTIONS, ...ALL_OFF }).sets,
    ).toHaveLength(4);
    expect(normalizeSymbols("")).toBe(DEFAULT_SYMBOLS);
    expect(normalizeSymbols("abc123")).toBe(DEFAULT_SYMBOLS);
    const lookAlikeOnly = resolveAlphabet({
      ...ALL_OFF,
      symbols: true,
      symbolSet: "|",
      avoidLookalikes: true,
    });
    expect(lookAlikeOnly.pool).toBe(DEFAULT_SYMBOLS);
    const single = resolveAlphabet({ ...DEFAULT_OPTIONS, symbolSet: "!" });
    expect(single.pool.endsWith("!")).toBe(true);
    expect(single.poolSize).toBe(26 + 26 + 10 + 1);
    for (const bad of [null, undefined, 42, []]) {
      expect(normalizePasswordOptions(bad)).toEqual({
        length: DEFAULT_OPTIONS.length,
        uppercase: true,
        lowercase: true,
        digits: true,
        symbols: true,
        symbolSet: DEFAULT_SYMBOLS,
        avoidLookalikes: false,
      });
      expect(normalizeToolOptions(bad)).toEqual(DEFAULT_OPTIONS);
      expect(resolveAlphabet(bad).poolSize).toBe(DEFAULT_POOL_SIZE);
    }
  });

  it("Edge (PWD-04, encoding): only printable ASCII ever enters the pool", () => {
    const raw = "áé😀\u0000\u007F !\u{1F600}?​#";
    const { pool } = resolveAlphabet({ ...DEFAULT_OPTIONS, symbolSet: raw });
    expect(Array.from(pool).length).toBe(pool.length);
    for (const ch of pool) {
      const code = ch.charCodeAt(0);
      expect(code).toBeGreaterThanOrEqual(0x21);
      expect(code).toBeLessThanOrEqual(0x7e);
    }
    expect(pool.endsWith("!?#")).toBe(true);
  });

  it("Edge (PWD-04, ordering): set order and first-seen symbol order are fixed", () => {
    expect([
      ...resolveAlphabet({ ...DEFAULT_OPTIONS, uppercase: false }).sets,
    ]).toEqual([LOWERCASE, DIGITS, DEFAULT_SYMBOLS]);
    expect(normalizeSymbols("}{")).toBe("}{");
    expect(
      resolveAlphabet({ ...DEFAULT_OPTIONS, symbolSet: "?!" }).pool.endsWith(
        "?!",
      ),
    ).toBe(true);
  });
});
