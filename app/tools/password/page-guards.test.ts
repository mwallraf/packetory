// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Password page source guards (D-01, D-02, D-12, D-13, D-15). The page must
 * never persist, route, log, transmit, download or expose a generated
 * password, must generate only inside the client island, and must reach the
 * library only through the barrel.
 *
 * Sibling of lib/password/boundaries.test.ts (which also walks this folder for
 * the randomness and word-list rules). The analysis is pure
 * (`analyzePage(sources)` never touches the filesystem), so the mutant cases
 * below prove every rule family has teeth entirely in memory, without editing
 * any tracked file.
 *
 * Self-hygiene: forbidden snippets and rule patterns are assembled from parts
 * so no line of this file holds the forbidden text verbatim.
 */

const ROOT = path.resolve(__dirname, "../../..");
const PAGE_DIR = "app/tools/password";
const SELF = "app/tools/password/page-guards.test.ts";
const SKIP_DIRS = new Set(["node_modules", ".next"]);

const PAGE = `${PAGE_DIR}/page.tsx`;
const LOADER = `${PAGE_DIR}/PasswordToolLoader.tsx`;
const ISLAND = `${PAGE_DIR}/PasswordTool.tsx`;
const OUTPUT = `${PAGE_DIR}/PasswordOutput.tsx`;
const TEST_HELPER = `${PAGE_DIR}/password-test-utils`;
const BARREL = "lib/password";
// The one deep import the island may make (D-04): the lazy, memoized loader.
// The vendored list module behind it, and every other lib/password sub-path,
// stay forbidden everywhere.
const WORDLIST_LOADER = `${BARREL}/wordlist`;

// Forbidden words, assembled so they never sit verbatim in this file.
const LS = "local" + "Storage";
const SS = "session" + "Storage";
const IDB = "indexed" + "DB";
const DOC_COOKIE = "document" + ".cook" + "ie";
const NAV = "next/" + "navigation";
const ROUTER_MOD = "next/" + "router";
const USE_ROUTER = "use" + "Router";
const USE_SP = "use" + "SearchParams";
const PUSH_STATE = "push" + "State";
const ANALYTICS = "@vercel/" + "analytics";
const BEACON = "send" + "Beacon";
const XHR = "XMLHttp" + "Request";
const WS = "Web" + "Socket";
const ES = "Event" + "Source";
const OBJ_URL = "createObject" + "URL";
const DANGEROUS = "dangerouslySet" + "InnerHTML";
const CE = "content" + "Editable";
const USE_MEMO = "use" + "Memo";
const GEN_BATCH = "generate" + "Batch";
const GEN_ONE = "generate" + "Password";
const GEN_PHRASE_BATCH = "generatePass" + "phraseBatch";
const GEN_PHRASE = "generatePass" + "phrase";
const CONSOLE = "con" + "sole";
const FETCH = "fe" + "tch";
const TRACK = "tra" + "ck";
const TYPEOF_WINDOW = "typeof " + "window";

type Sources = Map<string, string>;
type Rule = readonly [label: string, re: RegExp];

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
  walk(path.join(ROOT, PAGE_DIR), files);
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
 * does not parse regex literals. Unterminated single- and double-quoted strings
 * end at the newline so a stray quote cannot swallow the rest of the file.
 * (Copied in shape from lib/password/boundaries.test.ts.)
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

function allSpecifiers(code: string): string[] {
  return [...staticSpecifiers(code), ...dynamicSpecifiers(code)];
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

const word = (w: string) => new RegExp(String.raw`\b${w}\b`);

const PERSISTENCE_RULES: readonly Rule[] = [
  [LS, word(LS)],
  [SS, word(SS)],
  [IDB, word(IDB)],
  ["document.cookie", new RegExp(String.raw`\bdocument\s*\.\s*cook${"ie"}\b`)],
];

const ROUTER_URL_RULES: readonly Rule[] = [
  [USE_ROUTER, word(USE_ROUTER)],
  [USE_SP, word(USE_SP)],
  ["router.replace/push", new RegExp(String.raw`\brouter\s*\.\s*(?:replace|push)\b`)],
  [PUSH_STATE, word(PUSH_STATE)],
  ["location.hash", new RegExp(String.raw`\blocation\s*\.\s*hash\b`)],
  ["location.assign", new RegExp(String.raw`\blocation\s*\.\s*assign\s*\(`)],
  ["location.replace", new RegExp(String.raw`\blocation\s*\.\s*replace\s*\(`)],
];
const ROUTER_SPECS = new Set([NAV, ROUTER_MOD]);

const DATA_EXIT_RULES: readonly Rule[] = [
  [`${TRACK}(`, new RegExp(String.raw`\b${TRACK}\s*\(`)],
  [`${CONSOLE}.`, new RegExp(String.raw`\b${CONSOLE}\s*\.`)],
  [`${FETCH}(`, new RegExp(String.raw`\b${FETCH}\s*\(`)],
  [XHR, word(XHR)],
  [BEACON, word(BEACON)],
  [WS, word(WS)],
  [ES, word(ES)],
  [OBJ_URL, word(OBJ_URL)],
  ["download attribute", new RegExp(String.raw`\sdown${"load"}(?:\s*=\s*["'{]|\s*/?>)`)],
];

const OUTPUT_SURFACE_RULES: readonly Rule[] = [
  [DANGEROUS, word(DANGEROUS)],
  ["form/output/fieldset/textarea element", new RegExp(String.raw`<(?:for${"m"}|out${"put"}|fieldset|text${"area"})[\s>/]`)],
  ['type="password"', new RegExp(String.raw`\btype\s*=\s*\{?\s*["']pass${"word"}["']`)],
  [CE, new RegExp(String.raw`\b${CE}\b`, "i")],
  ["title attribute", new RegExp(String.raw`\sti${"tle"}\s*=\s*["'{]`)],
];

const GENERATION_RE = new RegExp(
  String.raw`\b(?:${GEN_PHRASE_BATCH}|${GEN_PHRASE}|${GEN_BATCH}|${GEN_ONE})\s*\(`,
);
const USE_MEMO_RE = word(USE_MEMO);
const TYPEOF_WINDOW_RE = new RegExp(String.raw`\btypeof\s+window\b`);
const SSR_FALSE_RE = /ssr\s*:\s*false/;
const USE_CLIENT_RE = /^\s*(["'])use client\1/;

interface PageAnalysis {
  files: string[];
  codeOf: (file: string) => string;
  persistence: string[];
  routerUrl: string[];
  dataExits: string[];
  outputSurfaces: string[];
  generationOutsideIsland: string[];
  useMemoUsers: string[];
  windowGuard: string[];
  deepLibImports: string[];
  testHelperImporters: string[];
  pageImportsIsland: boolean;
  pageIsClient: boolean;
  loaderMissingSsrFalse: boolean;
}

function analyzePage(sources: Sources): PageAnalysis {
  const code = new Map<string, string>();
  for (const [file, text] of sources) code.set(file, stripComments(text));

  const all = [...code.keys()].sort();
  const nonTest = all.filter((f) => !isTest(f));
  const codeFor = (f: string) => code.get(f) ?? "";

  const ruleHits = (rules: readonly Rule[]) =>
    nonTest.flatMap((f) =>
      rules.filter(([, re]) => re.test(codeFor(f))).map(([label]) => `${f}::${label}`),
    );

  const routerSpecHits = nonTest.flatMap((f) =>
    allSpecifiers(codeFor(f))
      .filter((s) => ROUTER_SPECS.has(s))
      .map((s) => `${f}::${s}`),
  );
  const analyticsSpecHits = nonTest.flatMap((f) =>
    allSpecifiers(codeFor(f))
      .filter((s) => s.startsWith(ANALYTICS))
      .map((s) => `${f}::${s}`),
  );

  const loaderCode = codeFor(LOADER);
  const loaderDynamicOk = dynamicSpecifiers(loaderCode).some(
    (s) => resolveSpecifier(LOADER, s) === ISLAND.replace(/\.tsx$/, ""),
  );

  return {
    files: all,
    codeOf: codeFor,
    persistence: ruleHits(PERSISTENCE_RULES),
    routerUrl: [...routerSpecHits, ...ruleHits(ROUTER_URL_RULES)],
    dataExits: [...analyticsSpecHits, ...ruleHits(DATA_EXIT_RULES)],
    outputSurfaces: ruleHits(OUTPUT_SURFACE_RULES),
    generationOutsideIsland: nonTest.filter((f) => f !== ISLAND && GENERATION_RE.test(codeFor(f))),
    useMemoUsers: nonTest.filter((f) => USE_MEMO_RE.test(codeFor(f))),
    windowGuard: nonTest.filter((f) => f === ISLAND && TYPEOF_WINDOW_RE.test(codeFor(f))),
    deepLibImports: nonTest.flatMap((f) =>
      allSpecifiers(codeFor(f))
        .filter((s) => {
          const r = resolveSpecifier(f, s);
          if (f === ISLAND && r === WORDLIST_LOADER) return false;
          return r !== BARREL && r.startsWith(`${BARREL}/`);
        })
        .map((s) => `${f}::${s}`),
    ),
    testHelperImporters: nonTest.filter((f) =>
      allSpecifiers(codeFor(f)).some((s) => resolveSpecifier(f, s) === TEST_HELPER),
    ),
    pageImportsIsland: allSpecifiers(codeFor(PAGE)).some(
      (s) => resolveSpecifier(PAGE, s) === ISLAND.replace(/\.tsx$/, ""),
    ),
    pageIsClient: USE_CLIENT_RE.test(codeFor(PAGE)),
    loaderMissingSsrFalse: !SSR_FALSE_RE.test(loaderCode) || !loaderDynamicOk,
  };
}

const real = collectSources();
const realPage = analyzePage(real);

function mutatePage(file: string, snippet: string, append = true): PageAnalysis {
  const mutant: Sources = new Map(real);
  mutant.set(file, append ? `${real.get(file) ?? ""}\n${snippet}\n` : snippet);
  return analyzePage(mutant);
}

describe("password page bans (D-12, D-13, D-15)", () => {
  it("no storage: no local, session or indexed storage, no cookie", () => {
    expect(realPage.persistence).toEqual([]);
  });

  it("no router, fragment or history-push surface (D-12)", () => {
    expect(realPage.routerUrl).toEqual([]);
  });

  it("no analytics, console, network, download or other data exit (D-13)", () => {
    expect(realPage.dataExits).toEqual([]);
  });

  it("no raw-HTML, form, output, textarea, password-input, editable or title surface (POUT-05)", () => {
    expect(realPage.outputSurfaces).toEqual([]);
  });

  it("generation happens only in the island, never in render or a memo (D-02, PWD-01)", () => {
    expect(realPage.generationOutsideIsland).toEqual([]);
    expect(realPage.useMemoUsers).toEqual([]);
  });

  it("the island has no typeof-window guard, so a server run fails loudly", () => {
    expect(realPage.windowGuard).toEqual([]);
  });

  it("imports reach the library only through the barrel, and never the test helpers", () => {
    expect(realPage.deepLibImports).toEqual([]);
    expect(realPage.testHelperImporters).toEqual([]);
  });

  it("page.tsx is a Server Component that never imports the island (D-01)", () => {
    expect(realPage.pageIsClient).toBe(false);
    expect(realPage.pageImportsIsland).toBe(false);
  });

  it("the loader dynamically imports the island with ssr: false (D-01)", () => {
    expect(realPage.loaderMissingSsrFalse).toBe(false);
  });

  it("is non-vacuous: the walk sees the page files and the generation call", () => {
    const nonTest = realPage.files.filter((f) => !isTest(f));
    expect(nonTest.length).toBeGreaterThanOrEqual(7);
    for (const f of [PAGE, LOADER, ISLAND, OUTPUT]) {
      expect(realPage.files).toContain(f);
    }
    expect(GENERATION_RE.test(realPage.codeOf(ISLAND))).toBe(true);
    expect(SSR_FALSE_RE.test(realPage.codeOf(LOADER))).toBe(true);
    expect(allSpecifiers(realPage.codeOf(ISLAND))).toContain("@/lib/password");
    // The relaxation is non-vacuous: the island really makes the one allowed
    // deep import, exactly once (D-04).
    expect(
      allSpecifiers(realPage.codeOf(ISLAND)).filter((s) => s === `@/${WORDLIST_LOADER}`),
    ).toHaveLength(1);
  });
});

describe("page guards have teeth - in-memory mutants", () => {
  // persistence
  it("detects local storage use", () => {
    const a = mutatePage(ISLAND, `export const s = (v: string) => ${LS}.setItem("k", v);`);
    expect(a.persistence).toEqual([`${ISLAND}::${LS}`]);
  });

  it("detects session storage use", () => {
    const a = mutatePage(OUTPUT, `export const s = () => ${SS}.getItem("k");`);
    expect(a.persistence).toEqual([`${OUTPUT}::${SS}`]);
  });

  it("detects indexed storage use", () => {
    const a = mutatePage(OUTPUT, `export const s = () => ${IDB}.open("k");`);
    expect(a.persistence).toEqual([`${OUTPUT}::${IDB}`]);
  });

  it("detects a cookie write", () => {
    const a = mutatePage(ISLAND, `${DOC_COOKIE} = "k=v";`);
    expect(a.persistence).toEqual([`${ISLAND}::document.cookie`]);
  });

  // router and URL
  it("detects a search-params hook call", () => {
    const a = mutatePage(ISLAND, `export const p = () => ${USE_SP}();`);
    expect(a.routerUrl).toEqual([`${ISLAND}::${USE_SP}`]);
  });

  it("detects a router replace call", () => {
    const a = mutatePage(ISLAND, `router.replace("/x");`);
    expect(a.routerUrl).toEqual([`${ISLAND}::router.replace/push`]);
  });

  it("detects a history push call", () => {
    const a = mutatePage(ISLAND, `window.history.${PUSH_STATE}(null, "", "/x");`);
    expect(a.routerUrl).toEqual([`${ISLAND}::${PUSH_STATE}`]);
  });

  it("detects a location hash write", () => {
    const a = mutatePage(ISLAND, `window.location.hash = "#x";`);
    expect(a.routerUrl).toEqual([`${ISLAND}::location.hash`]);
  });

  it("detects a navigation module import", () => {
    const a = mutatePage(OUTPUT, `import { x } from "${NAV}";\nexport { x };`);
    expect(a.routerUrl).toEqual([`${OUTPUT}::${NAV}`]);
  });

  // data exits
  it("detects an analytics track call", () => {
    const a = mutatePage(ISLAND, `${TRACK}("event");`);
    expect(a.dataExits).toEqual([`${ISLAND}::${TRACK}(`]);
  });

  it("detects an analytics package import", () => {
    const a = mutatePage(OUTPUT, `import { x } from "${ANALYTICS}";\nexport { x };`);
    expect(a.dataExits).toEqual([`${OUTPUT}::${ANALYTICS}`]);
  });

  it("detects a console member call", () => {
    const a = mutatePage(ISLAND, `${CONSOLE}.log("x");`);
    expect(a.dataExits).toEqual([`${ISLAND}::${CONSOLE}.`]);
  });

  it("detects a network call", () => {
    const a = mutatePage(OUTPUT, `export const n = () => ${FETCH}("/x");`);
    expect(a.dataExits).toEqual([`${OUTPUT}::${FETCH}(`]);
  });

  it("detects a beacon call", () => {
    const a = mutatePage(OUTPUT, `navigator.${BEACON}("/x", "y");`);
    expect(a.dataExits).toEqual([`${OUTPUT}::${BEACON}`]);
  });

  it("detects a download attribute", () => {
    const a = mutatePage(OUTPUT, `export const d = <a href="#" down${"load"}="p.txt">x</a>;`);
    expect(a.dataExits).toEqual([`${OUTPUT}::download attribute`]);
  });

  it("detects an object URL", () => {
    const a = mutatePage(OUTPUT, `export const u = (b: Blob) => URL.${OBJ_URL}(b);`);
    expect(a.dataExits).toEqual([`${OUTPUT}::${OBJ_URL}`]);
  });

  // output surfaces
  it("detects a raw-HTML prop", () => {
    const a = mutatePage(OUTPUT, `export const h = <div ${DANGEROUS}={{ __html: "x" }} />;`);
    expect(a.outputSurfaces).toEqual([`${OUTPUT}::${DANGEROUS}`]);
  });

  it("detects a form element", () => {
    const a = mutatePage(OUTPUT, `export const f = <for${"m"}>x</for${"m"}>;`);
    expect(a.outputSurfaces).toEqual([`${OUTPUT}::form/output/fieldset/textarea element`]);
  });

  it("detects an output element", () => {
    const a = mutatePage(OUTPUT, `export const o = <out${"put"}>x</out${"put"}>;`);
    expect(a.outputSurfaces).toEqual([`${OUTPUT}::form/output/fieldset/textarea element`]);
  });

  it("detects a password-typed input", () => {
    const a = mutatePage(OUTPUT, `export const i = <input type="pass${"word"}" />;`);
    expect(a.outputSurfaces).toEqual([`${OUTPUT}::type="password"`]);
  });

  it("detects a title attribute", () => {
    const a = mutatePage(OUTPUT, `export const t = <span ti${"tle"}="x">y</span>;`);
    expect(a.outputSurfaces).toEqual([`${OUTPUT}::title attribute`]);
  });

  it("detects an editable surface", () => {
    const a = mutatePage(OUTPUT, `export const e = <div ${CE} />;`);
    expect(a.outputSurfaces).toEqual([`${OUTPUT}::${CE}`]);
  });

  // generation location
  it("detects batch generation outside the island", () => {
    const a = mutatePage(OUTPUT, `export const g = () => ${GEN_BATCH}({} as never, 1);`);
    expect(a.generationOutsideIsland).toEqual([OUTPUT]);
  });

  it("detects Passphrase batch generation outside the island", () => {
    const a = mutatePage(OUTPUT, `export const g = () => ${GEN_PHRASE_BATCH}({} as never, [], 1);`);
    expect(a.generationOutsideIsland).toEqual([OUTPUT]);
  });

  it("detects single Passphrase generation in the server page", () => {
    const a = mutatePage(PAGE, `export const g = () => ${GEN_PHRASE}({} as never, []);`);
    expect(a.generationOutsideIsland).toEqual([PAGE]);
  });

  it("detects single generation in the server page", () => {
    const a = mutatePage(PAGE, `export const g = () => ${GEN_ONE}({} as never);`);
    expect(a.generationOutsideIsland).toEqual([PAGE]);
  });

  it("detects a memo hook", () => {
    const a = mutatePage(OUTPUT, `export const m = () => ${USE_MEMO}(() => 1, []);`);
    expect(a.useMemoUsers).toEqual([OUTPUT]);
  });

  it("detects a typeof-window guard in the island", () => {
    const a = mutatePage(ISLAND, `export const w = ${TYPEOF_WINDOW} === "undefined";`);
    expect(a.windowGuard).toEqual([ISLAND]);
  });

  // import boundaries
  it("detects a deep import of the word-list loader from the output component", () => {
    const a = mutatePage(OUTPUT, `import { x } from "@/${WORDLIST_LOADER}";\nexport { x };`);
    expect(a.deepLibImports).toEqual([`${OUTPUT}::@/${WORDLIST_LOADER}`]);
  });

  it("allows exactly the loader specifier from the island, and only there (D-04)", () => {
    const a = mutatePage(ISLAND, `import { x } from "@/${WORDLIST_LOADER}";\nexport { x };`);
    expect(a.deepLibImports).toEqual([]);
    expect(realPage.deepLibImports).toEqual([]);
  });

  it("detects the word-list loader imported from the server page", () => {
    const a = mutatePage(PAGE, `import { x } from "@/${WORDLIST_LOADER}";\nexport { x };`);
    expect(a.deepLibImports).toEqual([`${PAGE}::@/${WORDLIST_LOADER}`]);
  });

  it("detects the word-list loader imported from the FAQ data or the worked example", () => {
    const snippet = `import { x } from "@/${WORDLIST_LOADER}";\nexport { x };`;
    for (const file of [`${PAGE_DIR}/faq-data.ts`, `${PAGE_DIR}/PasswordExample.tsx`]) {
      const a = mutatePage(file, snippet);
      expect(a.deepLibImports).toEqual([`${file}::@/${WORDLIST_LOADER}`]);
    }
  });

  it("detects a static import of the vendored list from the island, loader exception or not", () => {
    const a = mutatePage(ISLAND, `import list from "@/${WORDLIST_LOADER}/eff-large";\nexport default list;`);
    expect(a.deepLibImports).toEqual([`${ISLAND}::@/${WORDLIST_LOADER}/eff-large`]);
  });

  it("detects a dynamic import of the vendored list from the island", () => {
    const a = mutatePage(ISLAND, `export const l = () => import("@/${WORDLIST_LOADER}/eff-large");`);
    expect(a.deepLibImports).toEqual([`${ISLAND}::@/${WORDLIST_LOADER}/eff-large`]);
  });

  it("detects a deep import of the library test helpers", () => {
    const a = mutatePage(ISLAND, `import { x } from "@/${BARREL}/test-utils";\nexport { x };`);
    expect(a.deepLibImports).toEqual([`${ISLAND}::@/${BARREL}/test-utils`]);
  });

  it("detects a page-folder test-helper import from a non-test file", () => {
    const a = mutatePage(OUTPUT, `import { x } from "./password-test-utils";\nexport { x };`);
    expect(a.testHelperImporters).toEqual([OUTPUT]);
  });

  it("detects the server page importing the island", () => {
    const a = mutatePage(PAGE, `import { PasswordTool } from "./PasswordTool";\nexport { PasswordTool };`);
    expect(a.pageImportsIsland).toBe(true);
    expect(realPage.pageImportsIsland).toBe(false);
  });

  it("detects a client directive on the server page", () => {
    const a = mutatePage(PAGE, `"use client";\n${real.get(PAGE) ?? ""}`, false);
    expect(a.pageIsClient).toBe(true);
    expect(realPage.pageIsClient).toBe(false);
  });

  it("detects the loader turning server rendering back on", () => {
    const src = (real.get(LOADER) ?? "").replace(/ssr\s*:\s*false/, "ssr: true");
    expect(src).not.toBe(real.get(LOADER));
    const a = mutatePage(LOADER, src, false);
    expect(a.loaderMissingSsrFalse).toBe(true);
    expect(realPage.loaderMissingSsrFalse).toBe(false);
  });

  it("detects the loader dropping the island import", () => {
    const src = (real.get(LOADER) ?? "").replace(/import\(\s*["']\.\/PasswordTool["']\s*\)/, "Promise.resolve({})");
    expect(src).not.toBe(real.get(LOADER));
    const a = mutatePage(LOADER, src, false);
    expect(a.loaderMissingSsrFalse).toBe(true);
  });

  // comments and test files
  it("ignores the same snippets inside line and block comments", () => {
    const a = mutatePage(
      ISLAND,
      `// ${LS}.setItem("k", "v");\n/* ${CONSOLE}.log(1); ${GEN_BATCH}(x); ${USE_MEMO}(); */\nexport const z = 1;`,
    );
    expect(a.persistence).toEqual(realPage.persistence);
    expect(a.dataExits).toEqual(realPage.dataExits);
    expect(a.useMemoUsers).toEqual(realPage.useMemoUsers);
  });

  it("exempts test files from the bans", () => {
    const probe = `${PAGE_DIR}/Probe.test.tsx`;
    const mutant: Sources = new Map(real);
    mutant.set(
      probe,
      `${LS}.clear();\n${CONSOLE}.log(1);\n${GEN_BATCH}({} as never, 1);\n${USE_MEMO}(() => 1, []);\nimport { x } from "./password-test-utils";`,
    );
    const a = analyzePage(mutant);
    expect(a.persistence).toEqual(realPage.persistence);
    expect(a.dataExits).toEqual(realPage.dataExits);
    expect(a.generationOutsideIsland).toEqual(realPage.generationOutsideIsland);
    expect(a.useMemoUsers).toEqual(realPage.useMemoUsers);
    expect(a.testHelperImporters).toEqual(realPage.testHelperImporters);
    expect(a.files).toContain(probe);
  });
});
