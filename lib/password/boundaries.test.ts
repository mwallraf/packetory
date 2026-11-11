// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Password library source guards (D-05, SC-2). Randomness comes only from the
 * Web Crypto sampler in random.ts, the vendored word list is reachable only
 * through the loader's literal dynamic import, and lib/password is never a
 * data exit (no network, storage or console).
 *
 * The analysis is pure (`analyze(sources)` never touches the filesystem), so
 * the mutation cases below prove the guard has teeth entirely in memory,
 * without editing any tracked file.
 *
 * Self-hygiene: every forbidden snippet is assembled from parts, so no line of
 * this file holds the forbidden text verbatim and the shell gates of the
 * earlier plans stay green on the final tree.
 */

const ROOT = path.resolve(__dirname, "../..");
// Phase 13 appends "app/tools/password" here (D-05).
const WALK_DIRS = ["lib/password"];
const SKIP_DIRS = new Set(["node_modules", ".next"]);
const SELF = "lib/password/boundaries.test.ts";
const LIB_PREFIX = "lib/password/";

const RANDOM_TS = "lib/password/random.ts";
const LIST_MODULE = "lib/password/wordlist/eff-large";
const LOADER_MODULE = "lib/password/wordlist";
const TEST_UTILS_MODULE = "lib/password/test-utils";

const M = "Ma" + "th";
const GRV = "getRandom" + "Values";
const REACT = "re" + "act";

type Sources = Map<string, string>;

const isTest = (file: string) => /\.(test|spec)\.tsx?$/.test(file);

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name)) out.push(full);
  }
}

function collectSources(): Sources {
  const files: string[] = [];
  for (const d of WALK_DIRS) walk(path.join(ROOT, d), files);
  const sources: Sources = new Map();
  for (const full of files) {
    const rel = path.relative(ROOT, full).split(path.sep).join("/");
    if (rel === SELF) continue; // contains the patterns it searches for
    sources.set(rel, readFileSync(full, "utf-8"));
  }
  return sources;
}

/**
 * Replaces comment characters with spaces (newlines kept) and leaves string and
 * template contents untouched, so a "//" inside a string never hides code. It
 * does not parse regex literals (no lib/password source has one containing a
 * quote or a comment opener). Unterminated single- and double-quoted strings
 * end at the newline so a stray quote cannot swallow the rest of the file.
 */
function stripComments(source: string): string {
  type State = "code" | "line" | "block" | "sq" | "dq" | "tpl";
  let state: State = "code";
  let out = "";
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    const n = source[i + 1];
    if (state === "code") {
      if (c === "/" && n === "/") {
        state = "line";
        out += "  ";
        i += 2;
      } else if (c === "/" && n === "*") {
        state = "block";
        out += "  ";
        i += 2;
      } else {
        if (c === '"') state = "dq";
        else if (c === "'") state = "sq";
        else if (c === "`") state = "tpl";
        out += c;
        i += 1;
      }
    } else if (state === "line") {
      if (c === "\n") {
        state = "code";
        out += c;
      } else {
        out += " ";
      }
      i += 1;
    } else if (state === "block") {
      if (c === "*" && n === "/") {
        state = "code";
        out += "  ";
        i += 2;
      } else {
        out += c === "\n" ? "\n" : " ";
        i += 1;
      }
    } else {
      if (c === "\\") {
        out += c + (n ?? "");
        i += 2;
      } else {
        const closes =
          (state === "sq" && c === "'") ||
          (state === "dq" && c === '"') ||
          (state === "tpl" && c === "`") ||
          ((state === "sq" || state === "dq") && c === "\n");
        if (closes) state = "code";
        out += c;
        i += 1;
      }
    }
  }
  return out;
}

const STATIC_SPEC_RE =
  /(?:\bfrom\s*|\bimport\s+|\brequire\s*\(\s*)(["'])([^"'\n]+)\1/g;
const DYNAMIC_SPEC_RE = /\bimport\s*\(\s*(["'])([^"'\n]+)\1\s*\)/g;

function staticSpecifiers(code: string): string[] {
  return [...code.matchAll(STATIC_SPEC_RE)].map((m) => m[2]);
}

function dynamicSpecifiers(code: string): string[] {
  return [...code.matchAll(DYNAMIC_SPEC_RE)].map((m) => m[2]);
}

function resolveSpecifier(fromFile: string, spec: string): string {
  let resolved: string;
  if (spec.startsWith(".")) {
    resolved = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), spec));
  } else if (spec.startsWith("@/")) {
    resolved = spec.slice(2);
  } else {
    return spec; // bare package specifier
  }
  return resolved.replace(/\.(tsx?|js)$/, "");
}

const MATH_RANDOM_RES: readonly RegExp[] = [
  // member access
  new RegExp(String.raw`\b${M}\s*\.\s*random\b`),
  // optional chaining
  new RegExp(String.raw`\b${M}\s*\?\.\s*random\b`),
  // bracket access with a quoted member name
  new RegExp(String.raw`\b${M}\s*\[\s*["'\x60]random["'\x60]\s*\]`),
  // object destructuring from the Math object
  new RegExp(String.raw`\{[^}]*\brandom\b[^}]*\}\s*=\s*${M}\b`),
];

const GRV_RE = new RegExp(String.raw`\b${GRV}\b`);

const SIDE_CHANNEL_RES: readonly RegExp[] = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bsendBeacon\b/,
  /\bWebSocket\b/,
  /\bEventSource\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bindexedDB\b/,
  /\bdocument\s*\.\s*cookie\b/,
  /\bconsole\s*\./,
];

const FRAMEWORK_BARE = new Set([REACT, `${REACT}-dom`, "next"]);

function isFrameworkSpecifier(file: string, spec: string): boolean {
  const head = spec.split("/")[0];
  if (FRAMEWORK_BARE.has(head)) return true;
  const resolved = resolveSpecifier(file, spec);
  return resolved.startsWith("app/") || resolved.startsWith("components/");
}

interface Analysis {
  files: string[];
  codeOf: (file: string) => string;
  mathRandom: string[];
  grvOutsideRandom: string[];
  wordlistStaticImporters: string[];
  wordlistDynamicImporters: string[];
  loaderImporters: string[];
  testUtilsImporters: string[];
  cryptoModuleImporters: string[];
  frameworkImporters: string[];
  sideChannels: string[];
}

function analyze(sources: Sources): Analysis {
  const code = new Map<string, string>();
  for (const [file, text] of sources) code.set(file, stripComments(text));

  const all = [...code.keys()].sort();
  const nonTest = all.filter((f) => !isTest(f));
  const lib = nonTest.filter((f) => f.startsWith(LIB_PREFIX));

  const resolvesTo = (file: string, specs: string[], target: string) =>
    specs.some((s) => resolveSpecifier(file, s) === target);

  return {
    files: all,
    codeOf: (file) => code.get(file) ?? "",
    mathRandom: all.filter((f) => MATH_RANDOM_RES.some((re) => re.test(code.get(f)!))),
    grvOutsideRandom: nonTest.filter((f) => f !== RANDOM_TS && GRV_RE.test(code.get(f)!)),
    wordlistStaticImporters: nonTest.filter((f) =>
      resolvesTo(f, staticSpecifiers(code.get(f)!), LIST_MODULE),
    ),
    wordlistDynamicImporters: nonTest.filter((f) =>
      resolvesTo(f, dynamicSpecifiers(code.get(f)!), LIST_MODULE),
    ),
    loaderImporters: lib.filter((f) => {
      const specs = [...staticSpecifiers(code.get(f)!), ...dynamicSpecifiers(code.get(f)!)];
      return resolvesTo(f, specs, LOADER_MODULE);
    }),
    testUtilsImporters: lib.filter((f) => {
      const specs = [...staticSpecifiers(code.get(f)!), ...dynamicSpecifiers(code.get(f)!)];
      return resolvesTo(f, specs, TEST_UTILS_MODULE);
    }),
    cryptoModuleImporters: nonTest.filter((f) =>
      [...staticSpecifiers(code.get(f)!), ...dynamicSpecifiers(code.get(f)!)].some(
        (s) => s === "crypto" || s === "node:crypto",
      ),
    ),
    frameworkImporters: lib.filter((f) =>
      [...staticSpecifiers(code.get(f)!), ...dynamicSpecifiers(code.get(f)!)].some((s) =>
        isFrameworkSpecifier(f, s),
      ),
    ),
    sideChannels: lib.filter((f) => SIDE_CHANNEL_RES.some((re) => re.test(code.get(f)!))),
  };
}

const real = collectSources();
const realAnalysis = analyze(real);

function mutate(base: Sources, file: string, snippet: string, append = true): Analysis {
  const mutant: Sources = new Map(base);
  mutant.set(file, append ? `${real.get(file) ?? ""}\n${snippet}\n` : snippet);
  return analyze(mutant);
}

describe("password library boundaries (D-05, SC-2)", () => {
  it("no file references the Math object's random member in any form", () => {
    expect(realAnalysis.mathRandom).toEqual([]);
  });

  it("only random.ts names the Web Crypto sampling method", () => {
    expect(realAnalysis.grvOutsideRandom).toEqual([]);
  });

  it("the vendored list has no static importer", () => {
    expect(realAnalysis.wordlistStaticImporters).toEqual([]);
  });

  it("wordlist.ts is the only dynamic importer of the vendored list", () => {
    expect(realAnalysis.wordlistDynamicImporters).toEqual(["lib/password/wordlist.ts"]);
  });

  it("no library file imports the loader or the test helpers", () => {
    expect(realAnalysis.loaderImporters).toEqual([]);
    expect(realAnalysis.testUtilsImporters).toEqual([]);
  });

  it("no crypto module, react, react-dom or next import in lib/password", () => {
    expect(realAnalysis.cryptoModuleImporters).toEqual([]);
    expect(realAnalysis.frameworkImporters).toEqual([]);
  });

  it("lib/password is not a data exit: no network, storage, cookie or console", () => {
    expect(realAnalysis.sideChannels).toEqual([]);
  });

  it("is non-vacuous: the walk sees the library, the loader and the vendored list", () => {
    const nonTest = realAnalysis.files.filter((f) => !isTest(f));
    expect(nonTest.length).toBeGreaterThanOrEqual(14);
    for (const f of [
      "lib/password/random.ts",
      "lib/password/wordlist.ts",
      "lib/password/wordlist/eff-large.ts",
      "lib/password/index.ts",
    ]) {
      expect(realAnalysis.files).toContain(f);
    }
    expect(realAnalysis.codeOf("lib/password/wordlist/eff-large.ts").length).toBeGreaterThan(60_000);
    expect(GRV_RE.test(realAnalysis.codeOf(RANDOM_TS))).toBe(true);
    expect(staticSpecifiers(realAnalysis.codeOf("lib/password/index.ts")).length).toBeGreaterThan(5);
    expect(dynamicSpecifiers(realAnalysis.codeOf("lib/password/wordlist.ts"))).toEqual([
      "./wordlist/eff-large",
    ]);
  });
});

describe("guards have teeth - in-memory mutants (D-05)", () => {
  const PROBE = "lib/password/probe.ts";

  it("detects the member form of the Math random call", () => {
    const a = mutate(new Map(real), PROBE, `export const r = ${M}.random();`, false);
    expect(a.mathRandom).toEqual([PROBE]);
    expect(a.mathRandom).not.toEqual(realAnalysis.mathRandom);
  });

  it("detects the optional-chaining form", () => {
    const a = mutate(new Map(real), PROBE, `export const r = ${M}?.random();`, false);
    expect(a.mathRandom).toEqual([PROBE]);
  });

  it("detects the bracket form", () => {
    const a = mutate(new Map(real), PROBE, `export const r = ${M}["random"]();`, false);
    expect(a.mathRandom).toEqual([PROBE]);
  });

  it("detects the destructuring form", () => {
    const a = mutate(new Map(real), PROBE, `const { random } = ${M};\nexport const r = random();`, false);
    expect(a.mathRandom).toEqual([PROBE]);
  });

  it("detects a Math random call appended to an existing real file", () => {
    const a = mutate(new Map(real), "lib/password/generate.ts", `export const leak = ${M}.random();`);
    expect(a.mathRandom).toEqual(["lib/password/generate.ts"]);
  });

  it("detects the call in a test file too (tests are scanned)", () => {
    const a = mutate(new Map(real), "lib/password/probe.test.ts", `const r = ${M}.random();`, false);
    expect(a.mathRandom).toEqual(["lib/password/probe.test.ts"]);
  });

  it("ignores the same call inside a line comment and a block comment", () => {
    const a = mutate(new Map(real), PROBE, `// ${M}.random()\n/* ${M}.random() */\nexport const x = 1;`, false);
    expect(a.mathRandom).toEqual(realAnalysis.mathRandom);
  });

  it("still scans code after a string containing a URL scheme", () => {
    const a = mutate(new Map(real), 
      PROBE,
      `const u = "http://example.test/a";\nexport const r = ${M}.random();`,
      false,
    );
    expect(a.mathRandom).toEqual([PROBE]);
  });

  it("detects the Web Crypto method called outside random.ts", () => {
    const a = mutate(new Map(real), PROBE, `export const f = (b: Uint32Array) => crypto.${GRV}(b);`, false);
    expect(a.grvOutsideRandom).toEqual([PROBE]);
    expect(a.grvOutsideRandom).not.toEqual(realAnalysis.grvOutsideRandom);
  });

  it("detects a static import of the vendored list", () => {
    const a = mutate(new Map(real), PROBE, `import list from "./wordlist/eff-large";\nexport default list;`, false);
    expect(a.wordlistStaticImporters).toEqual([PROBE]);
  });

  it("detects a static import of the vendored list in the barrel", () => {
    const a = mutate(new Map(real), "lib/password/index.ts", `import "./wordlist/eff-large";`);
    expect(a.wordlistStaticImporters).toEqual(["lib/password/index.ts"]);
  });

  it("detects an export-from of the vendored list", () => {
    const a = mutate(new Map(real), PROBE, `export { default } from "./wordlist/eff-large";`, false);
    expect(a.wordlistStaticImporters).toEqual([PROBE]);
  });

  it("detects a second dynamic importer of the vendored list", () => {
    const a = mutate(new Map(real), PROBE, `export const l = () => import("./wordlist/eff-large");`, false);
    expect(a.wordlistDynamicImporters).toEqual([PROBE, "lib/password/wordlist.ts"].sort());
    expect(a.wordlistDynamicImporters).not.toEqual(realAnalysis.wordlistDynamicImporters);
  });

  it("detects a dynamic import of the vendored list from UI code through the alias", () => {
    const a = mutate(new Map(real), 
      "app/tools/password/Probe.tsx",
      `export const l = () => import("@/lib/password/wordlist/eff-large");`,
      false,
    );
    expect(a.wordlistDynamicImporters).toContain("app/tools/password/Probe.tsx");
  });

  it("detects a barrel re-export of the loader", () => {
    const a = mutate(new Map(real), "lib/password/index.ts", `export * from "./wordlist";`);
    expect(a.loaderImporters).toEqual(["lib/password/index.ts"]);
    expect(a.loaderImporters).not.toEqual(realAnalysis.loaderImporters);
  });

  it("detects a test-helper import from a library file", () => {
    const a = mutate(new Map(real), PROBE, `import { queueFill } from "./test-utils";\nexport { queueFill };`, false);
    expect(a.testUtilsImporters).toEqual([PROBE]);
  });

  it("detects a network call", () => {
    const a = mutate(new Map(real), PROBE, `export const send = (s: string) => fetch("/x", { body: s });`, false);
    expect(a.sideChannels).toEqual([PROBE]);
  });

  it("detects a console call", () => {
    const a = mutate(new Map(real), PROBE, `export const log = (s: string) => console.log(s);`, false);
    expect(a.sideChannels).toEqual([PROBE]);
  });

  it("detects a storage use", () => {
    const a = mutate(new Map(real), PROBE, `export const save = (s: string) => localStorage.setItem("k", s);`, false);
    expect(a.sideChannels).toEqual([PROBE]);
  });

  it("detects a node crypto import", () => {
    const a = mutate(new Map(real), PROBE, `import { randomBytes } from "node:crypto";\nexport { randomBytes };`, false);
    expect(a.cryptoModuleImporters).toEqual([PROBE]);
  });

  it("detects a UI framework import", () => {
    const a = mutate(new Map(real), PROBE, `import { useState } from "${REACT}";\nexport { useState };`, false);
    expect(a.frameworkImporters).toEqual([PROBE]);
  });

  it("scopes the framework, side-channel and loader rules to lib/password only", () => {
    const mutant: Sources = new Map(real);
    mutant.set(
      "app/tools/password/Tool.tsx",
      `import { useState } from "${REACT}";\nimport { loadWordlist } from "@/lib/password/wordlist";\nexport const a = fetch;\nexport { useState, loadWordlist };`,
    );
    const a = analyze(mutant);
    expect(a.frameworkImporters).toEqual(realAnalysis.frameworkImporters);
    expect(a.loaderImporters).toEqual(realAnalysis.loaderImporters);
    expect(a.sideChannels).toEqual(realAnalysis.sideChannels);
  });

  it("still applies the randomness rules outside lib/password", () => {
    const mutant: Sources = new Map(real);
    mutant.set(
      "app/tools/password/Tool.tsx",
      `export const r = ${M}.random();\nexport const g = (b: Uint32Array) => crypto.${GRV}(b);`,
    );
    const a = analyze(mutant);
    expect(a.mathRandom).toEqual(["app/tools/password/Tool.tsx"]);
    expect(a.grvOutsideRandom).toEqual(["app/tools/password/Tool.tsx"]);
  });
});
