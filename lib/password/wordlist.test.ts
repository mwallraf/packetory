// @vitest-environment node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ANNOUNCEMENT_URL,
  CC_BY_3_US_URL,
  CC_BY_4_URL,
  COPYRIGHT_URL,
  SOURCE_URL,
  diceIndices,
  parseEffWordlist,
  renderModule,
} from "../../scripts/generate-eff-wordlist.mjs";
import {
  EFF_HYPHENATED_WORDS,
  EFF_HYPHENATED_WORD_COUNT,
  EFF_WORD_COUNT,
} from "./constants";
import EFF from "./wordlist/eff-large";
import { createWordlistLoader, loadWordlist } from "./wordlist";

const JOINED_SHA256 =
  "c523ba7b5e0d3f77cc6cf0d83bed3f250143c0c90c255d6a646dd992f8453675";
const RAW_SHA256 =
  "addd35536511597a02fa0a9ff1e5284677b8883b83e986e43f15a3db996b903e";
const HYPHENATED = ["drop-down", "felt-tip", "t-shirt", "yo-yo"];

const FILE = path.resolve(__dirname, "wordlist/eff-large.ts");
const sha = (text: string) =>
  createHash("sha256").update(text, "utf8").digest("hex");

const words = EFF.split(" ");
const idx: string[] = diceIndices();
const rebuiltRaw = words.map((w, i) => `${idx[i]}\t${w}\n`).join("");
const fileText = readFileSync(FILE, "utf8");

function withLines(edit: (lines: string[]) => string[]): string {
  const lines = rebuiltRaw.split("\n");
  lines.pop();
  return edit(lines).join("\n") + "\n";
}

describe("EFF Large integrity (D-12)", () => {
  it("has exactly 7776 unique words", () => {
    expect(words.length).toBe(EFF_WORD_COUNT);
    expect(EFF_WORD_COUNT).toBe(7776);
    expect(new Set(words).size).toBe(7776);
  });

  it("every word is lowercase letters and hyphens, 3 to 9 long", () => {
    for (const w of words) {
      expect(w).toMatch(/^[a-z-]+$/);
    }
    expect(Math.min(...words.map((w) => w.length))).toBe(3);
    expect(Math.max(...words.map((w) => w.length))).toBe(9);
  });

  it("starts with abacus and ends with zoom", () => {
    expect(words[0]).toBe("abacus");
    expect(words[7775]).toBe("zoom");
  });

  it("has exactly the four hyphenated words", () => {
    const hyphenated = words.filter((w) => w.includes("-"));
    expect(hyphenated).toEqual(["drop-down", "felt-tip", "t-shirt", "yo-yo"]);
    expect(hyphenated).toEqual(HYPHENATED);
    expect(hyphenated).toEqual([...EFF_HYPHENATED_WORDS]);
    expect(hyphenated).toHaveLength(EFF_HYPHENATED_WORD_COUNT);
  });

  it("the joined string hashes to the pinned SHA-256", () => {
    expect(sha(EFF)).toBe(JOINED_SHA256);
  });

  it("the original file rebuilt from the words hashes to the pinned SHA-256", () => {
    expect(sha(rebuiltRaw)).toBe(RAW_SHA256);
  });

  it("the file header carries source, licence and attribution", () => {
    for (const needle of [
      SOURCE_URL,
      ANNOUNCEMENT_URL,
      COPYRIGHT_URL,
      CC_BY_4_URL,
      CC_BY_3_US_URL,
      "CC BY",
      "Electronic Frontier Foundation",
      RAW_SHA256,
      JOINED_SHA256,
      "Changes: none to the words",
      "do not edit",
    ]) {
      expect(fileText).toContain(needle);
    }
    expect(fileText).toMatch(/Retrieved: \d{4}-\d{2}-\d{2}/);
  });
});

describe("generation script (D-11)", () => {
  it("renders the committed module byte for byte", () => {
    const retrieved = /Retrieved: (\d{4}-\d{2}-\d{2})/.exec(fileText)![1]!;
    const parsed = parseEffWordlist(rebuiltRaw);
    expect(parsed).toEqual(words);
    expect(
      renderModule(parsed, {
        retrieved,
        rawSha256: sha(rebuiltRaw),
        joinedSha256: sha(parsed.join(" ")),
      }),
    ).toBe(fileText);
  });

  it("accepts the rebuilt original", () => {
    expect(parseEffWordlist(rebuiltRaw)).toHaveLength(7776);
  });

  it("rejects a missing line", () => {
    expect(() => parseEffWordlist(withLines((l) => l.slice(0, -1)))).toThrow(
      /7776 lines/,
    );
  });

  it("rejects an extra line", () => {
    expect(() =>
      parseEffWordlist(withLines((l) => [...l, "66666\textra"])),
    ).toThrow(/7776 lines/);
  });

  it("rejects a duplicate word", () => {
    expect(() =>
      parseEffWordlist(
        withLines((l) => {
          l[1] = `${idx[1]}\t${words[0]}`;
          return l;
        }),
      ),
    ).toThrow(/Line 2 repeats/);
  });

  it("rejects an uppercase word", () => {
    expect(() =>
      parseEffWordlist(
        withLines((l) => {
          l[0] = `${idx[0]}\tAbacus`;
          return l;
        }),
      ),
    ).toThrow(/Line 1/);
  });

  it("rejects a 4-digit index", () => {
    expect(() =>
      parseEffWordlist(
        withLines((l) => {
          l[0] = "1111\tabacus";
          return l;
        }),
      ),
    ).toThrow(/Line 1/);
  });

  it("rejects swapped lines", () => {
    expect(() =>
      parseEffWordlist(
        withLines((l) => {
          [l[0], l[1]] = [l[1]!, l[0]!];
          return l;
        }),
      ),
    ).toThrow(/Line 1 has dice index/);
  });

  it("rejects CRLF endings", () => {
    expect(() => parseEffWordlist(rebuiltRaw.replace(/\n/g, "\r\n"))).toThrow(
      /carriage return/,
    );
  });

  it("renderModule rejects a malformed retrieval date", () => {
    expect(() =>
      renderModule(words, {
        retrieved: "11/11/2026",
        rawSha256: RAW_SHA256,
        joinedSha256: JOINED_SHA256,
      }),
    ).toThrow(/YYYY-MM-DD/);
  });
});

type Deferred = {
  promise: Promise<{ default: string }>;
  resolve: (v: { default: string }) => void;
  reject: (e: unknown) => void;
};

function deferred(): Deferred {
  let resolve!: Deferred["resolve"];
  let reject!: Deferred["reject"];
  const promise = new Promise<{ default: string }>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function deferredImporter() {
  const queue: Deferred[] = [];
  const importer = () => {
    const d = deferred();
    queue.push(d);
    return d.promise;
  };
  return { queue, importer };
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe("loadWordlist (D-12, PHR-03 guarantee)", () => {
  it("creating the loader imports nothing", () => {
    let calls = 0;
    createWordlistLoader(() => {
      calls++;
      return Promise.resolve({ default: "a" });
    });
    expect(calls).toBe(0);
  });

  it("concurrent and repeated calls share one import", async () => {
    let calls = 0;
    const load = createWordlistLoader(() => {
      calls++;
      return Promise.resolve({ default: "a b c" });
    });
    const p1 = load();
    const p2 = load();
    expect(p2).toBe(p1);
    await p1;
    expect(load()).toBe(p1);
    expect(calls).toBe(1);
  });

  it("resolves a frozen list split on spaces", async () => {
    const load = createWordlistLoader(() =>
      Promise.resolve({ default: "a b c" }),
    );
    const list = await load();
    expect(list).toEqual(["a", "b", "c"]);
    expect(Object.isFrozen(list)).toBe(true);
  });

  it("a failed import rejects with its own error, then the next call retries and succeeds", async () => {
    const { queue, importer } = deferredImporter();
    const load = createWordlistLoader(importer);
    const boom = new Error("chunk failed");
    const first = load();
    queue[0]!.reject(boom);
    await expect(first).rejects.toBe(boom);
    await tick();
    expect(queue).toHaveLength(1);

    const second = load();
    expect(second).not.toBe(first);
    expect(queue).toHaveLength(2);
    queue[1]!.resolve({ default: "x y z" });
    await expect(second).resolves.toEqual(["x", "y", "z"]);
  });

  it("a stale failure does not clear a newer in-flight promise", async () => {
    const { queue, importer } = deferredImporter();
    const load = createWordlistLoader(importer);
    const p1 = load();
    queue[0]!.reject(new Error("first failed"));
    await expect(p1).rejects.toThrow("first failed");
    await tick();

    const p2 = load();
    const p3 = load();
    expect(p3).toBe(p2);
    expect(queue).toHaveLength(2);

    queue[1]!.resolve({ default: "a b" });
    await expect(p2).resolves.toEqual(["a", "b"]);
  });

  it("a rejection never yields another list", async () => {
    const load = createWordlistLoader(() => Promise.reject(new Error("nope")));
    await expect(load()).rejects.toThrow("nope");
  });

  it("the real loader resolves to a frozen 7776-word list equal to the default export", async () => {
    const list = await loadWordlist();
    expect(list).toHaveLength(7776);
    expect(Object.isFrozen(list)).toBe(true);
    expect([...list]).toEqual(EFF.split(" "));
  });
});
