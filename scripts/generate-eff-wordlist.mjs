#!/usr/bin/env node
/**
 * Generates lib/password/wordlist/eff-large.ts from the EFF Large Wordlist.
 *
 * Manual tool (D-11): plain Node, no dependencies, never run in CI or the
 * build. Usage:
 *
 *   node scripts/generate-eff-wordlist.mjs [path-to-local-copy] [--retrieved YYYY-MM-DD]
 *
 * With no path it downloads SOURCE_URL. The input is validated strictly
 * (format, dice-index order, count, uniqueness) and the printed SHA-256
 * values are meant to be compared with the pins in wordlist.test.ts.
 *
 * Importing this module never runs main (the run guard at the bottom), so
 * the pure functions can be tested.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SOURCE_URL =
  "https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt";
export const ANNOUNCEMENT_URL =
  "https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases";
export const COPYRIGHT_URL = "https://www.eff.org/copyright";
export const CC_BY_4_URL = "https://creativecommons.org/licenses/by/4.0/";
export const CC_BY_3_US_URL = "https://creativecommons.org/licenses/by/3.0/us/";
export const EXPECTED_WORD_COUNT = 7776;

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const OUTPUT_PATH = path.resolve(
  HERE,
  "../lib/password/wordlist/eff-large.ts",
);

/** The 7,776 five-dice indices "11111".."66666" in lexicographic order. */
export function diceIndices() {
  const out = [];
  for (let a = 1; a <= 6; a++)
    for (let b = 1; b <= 6; b++)
      for (let c = 1; c <= 6; c++)
        for (let d = 1; d <= 6; d++)
          for (let e = 1; e <= 6; e++) out.push(`${a}${b}${c}${d}${e}`);
  return out;
}

/** Parses the EFF file into its words, throwing on the first violation. */
export function parseEffWordlist(rawText) {
  if (rawText.includes("\r")) {
    throw new Error("Input contains a carriage return; expected LF endings.");
  }
  const lines = rawText.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  if (lines.length !== EXPECTED_WORD_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_WORD_COUNT} lines, found ${lines.length}.`,
    );
  }
  const indices = diceIndices();
  const seen = new Set();
  const words = [];
  for (let i = 0; i < lines.length; i++) {
    const match = /^([1-6]{5})\t([a-z-]+)$/.exec(lines[i]);
    if (!match) {
      throw new Error(`Line ${i + 1} is not "NNNNN<TAB>word" in the expected format.`);
    }
    if (match[1] !== indices[i]) {
      throw new Error(
        `Line ${i + 1} has dice index ${match[1]}, expected ${indices[i]}.`,
      );
    }
    if (seen.has(match[2])) {
      throw new Error(`Line ${i + 1} repeats a word seen earlier.`);
    }
    seen.add(match[2]);
    words.push(match[2]);
  }
  return words;
}

export function sha256Hex(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** Renders the committed TypeScript module for the given words. */
export function renderModule(words, { retrieved, rawSha256, joinedSha256 }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(retrieved)) {
    throw new Error("retrieved must be a YYYY-MM-DD date.");
  }
  const hyphenated = words.filter((w) => w.includes("-"));
  const header = [
    "EFF Large Wordlist for passphrases: 7,776 words, vendored unmodified.",
    "",
    `Source: ${SOURCE_URL}`,
    `About: ${ANNOUNCEMENT_URL}`,
    `Retrieved: ${retrieved}`,
    `SHA-256 of the downloaded file: ${rawSha256}`,
    `SHA-256 of the space-joined word string below: ${joinedSha256}`,
    "",
    "Attribution: EFF Large Wordlist for Passphrases (2016) by the Electronic Frontier Foundation (EFF),",
    `licensed under Creative Commons Attribution (CC BY). ${COPYRIGHT_URL} (retrieved ${retrieved}) states`,
    `CC BY 4.0 International (${CC_BY_4_URL}) in its text, while its licence badge links`,
    `CC BY 3.0 US (${CC_BY_3_US_URL}). This attribution is written to satisfy both versions.`,
    "Changes: none to the words. The dice-roll index column is dropped and the 7,776 words are joined with",
    `single spaces in their original order. The list keeps its ${hyphenated.length} hyphenated words: ${hyphenated.join(", ")}.`,
    "",
    "Generated file: do not edit. Regenerate with: node scripts/generate-eff-wordlist.mjs [path-to-local-copy]",
  ];
  const comment = ["/**", ...header.map((l) => (l === "" ? " *" : ` * ${l}`)), " */"].join("\n");
  return (
    `${comment}\n\nconst EFF_LARGE_WORDLIST =\n  ${JSON.stringify(words.join(" "))};\n\nexport default EFF_LARGE_WORDLIST;\n`
  );
}

export async function main(argv) {
  let localPath;
  let retrieved = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--retrieved") {
      retrieved = argv[++i] ?? "";
    } else if (!argv[i].startsWith("--")) {
      localPath = argv[i];
    } else {
      throw new Error(`Unknown option ${argv[i]}.`);
    }
  }
  let raw;
  if (localPath) {
    raw = readFileSync(localPath, "utf8");
  } else {
    const res = await fetch(SOURCE_URL);
    if (!res.ok) {
      throw new Error(`Download failed: HTTP ${res.status}.`);
    }
    raw = await res.text();
  }
  const words = parseEffWordlist(raw);
  const rawSha256 = sha256Hex(raw);
  const joinedSha256 = sha256Hex(words.join(" "));
  writeFileSync(
    OUTPUT_PATH,
    renderModule(words, { retrieved, rawSha256, joinedSha256 }),
  );
  console.log(`words: ${words.length}`);
  console.log(`raw sha256: ${rawSha256}`);
  console.log(`joined sha256: ${joinedSha256}`);
  console.log("wrote lib/password/wordlist/eff-large.ts");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
}
