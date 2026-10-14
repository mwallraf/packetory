// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * HASH-04 import-boundary guard. The engine must be reachable only through
 * hash.worker.ts -> worker-core.ts -> job.ts -> engine.ts, and only engine.ts
 * may import @noble/hashes, so none of it lands in initial page JS.
 *
 * The analysis is pure (`analyze(sources)` never touches the filesystem) so
 * the injected-mutation cases below can prove the guard has teeth entirely in
 * memory, without editing any tracked file.
 */

const ROOT = path.resolve(__dirname, "../..");
const WALK_DIRS = ["app", "components", "lib", "tools", "tests"];
const SKIP_DIRS = new Set(["node_modules", ".next"]);
const SELF = "lib/hash/boundaries.test.ts";

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

/** from "x" | bare import "x" | import("x") | require("x"), single or double quotes. */
const SPECIFIER_RE =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)(["'])([^"'\n]+)\1/g;

function importSpecifiers(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(SPECIFIER_RE)) out.push(m[2]);
  return out;
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

interface Analysis {
  nobleImporters: string[];
  importersOf: (target: string, opts?: { includeTests?: boolean }) => string[];
  clientSpecifiers: string[];
  workerLiteralFiles: string[];
  lib: string[];
  specifiersOf: (file: string) => string[];
}

function analyze(sources: Sources): Analysis {
  const specs = new Map<string, string[]>();
  for (const [file, text] of sources) specs.set(file, importSpecifiers(text));

  const nobleImporters = [...specs]
    .filter(([, list]) => list.some((s) => s === "@noble/hashes" || s.startsWith("@noble/hashes/")))
    .map(([file]) => file)
    .sort();

  const importersOf = (target: string, opts: { includeTests?: boolean } = {}) =>
    [...specs]
      .filter(([file]) => opts.includeTests || !isTest(file))
      .filter(([file, list]) => list.some((s) => resolveSpecifier(file, s) === target))
      .map(([file]) => file)
      .sort();

  const clientSpecifiers = (specs.get("lib/hash/client.ts") ?? []).map((s) =>
    resolveSpecifier("lib/hash/client.ts", s),
  );

  const workerLiteralFiles = [...sources]
    .filter(([file, text]) => !isTest(file) && text.includes('new URL("./hash.worker.ts"'))
    .map(([file]) => file)
    .sort();

  return {
    nobleImporters,
    importersOf,
    clientSpecifiers,
    workerLiteralFiles,
    lib: [...sources.keys()].filter((f) => f.startsWith("lib/hash/")),
    specifiersOf: (file) => specs.get(file) ?? [],
  };
}

const real = collectSources();
const realAnalysis = analyze(real);

describe("hash engine import boundaries (HASH-04)", () => {
  it("only lib/hash/engine.ts imports @noble/hashes (HASH-04)", () => {
    expect(realAnalysis.nobleImporters).toEqual(["lib/hash/engine.ts"]);
  });

  it("only job.ts imports the engine (HASH-04)", () => {
    expect(realAnalysis.importersOf("lib/hash/engine")).toEqual(["lib/hash/job.ts"]);
  });

  it("only worker-core.ts imports job.ts (HASH-04)", () => {
    expect(realAnalysis.importersOf("lib/hash/job")).toEqual(["lib/hash/worker-core.ts"]);
  });

  it("only hash.worker.ts imports worker-core.ts (HASH-04)", () => {
    expect(realAnalysis.importersOf("lib/hash/worker-core")).toEqual(["lib/hash/hash.worker.ts"]);
  });

  it("every import in client.ts resolves to lib/hash/types (HASH-04)", () => {
    expect(realAnalysis.clientSpecifiers.length).toBeGreaterThan(0);
    for (const spec of realAnalysis.clientSpecifiers) {
      expect(spec).toBe("lib/hash/types");
    }
  });

  it("exactly one non-test file holds the static Worker literal: client.ts (HASH-04)", () => {
    expect(realAnalysis.workerLiteralFiles).toEqual(["lib/hash/client.ts"]);
  });

  it("is non-vacuous: the walk sees the hash module and engine's noble subpaths (HASH-04)", () => {
    expect(realAnalysis.lib.length).toBeGreaterThanOrEqual(8);
    const engineSpecs = realAnalysis.specifiersOf("lib/hash/engine.ts");
    expect(engineSpecs).toContain("@noble/hashes/sha2.js");
    expect(engineSpecs).toContain("@noble/hashes/sha3.js");
    expect(engineSpecs).toContain("@noble/hashes/legacy.js");
  });
});

describe("boundary guard has teeth - injected mutations in memory (HASH-04)", () => {
  it("detects an engine import appended to client.ts", () => {
    const mutant = new Map(real);
    mutant.set(
      "lib/hash/client.ts",
      `${real.get("lib/hash/client.ts")}\nimport { FACTORIES } from "./engine";\n`,
    );
    const a = analyze(mutant);

    expect(a.importersOf("lib/hash/engine")).toContain("lib/hash/client.ts");
    expect(a.importersOf("lib/hash/engine")).not.toEqual(realAnalysis.importersOf("lib/hash/engine"));
    expect(a.clientSpecifiers.some((s) => s !== "lib/hash/types")).toBe(true);
  });

  it("detects a dynamic import() of job.ts from UI code", () => {
    const mutant = new Map(real);
    mutant.set("components/Probe.tsx", `export const m = import("@/lib/hash/job");`);
    const a = analyze(mutant);

    expect(a.importersOf("lib/hash/job")).toContain("components/Probe.tsx");
    expect(a.importersOf("lib/hash/job")).not.toEqual(realAnalysis.importersOf("lib/hash/job"));
  });

  it("detects a require() of @noble/hashes outside the engine", () => {
    const mutant = new Map(real);
    mutant.set("app/probe.ts", `export const n = require("@noble/hashes/sha2.js");`);
    const a = analyze(mutant);

    expect(a.nobleImporters).toContain("app/probe.ts");
    expect(a.nobleImporters).not.toEqual(realAnalysis.nobleImporters);
  });
});
