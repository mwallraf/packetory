// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  APPEND_NUMBER_BITS,
  BITS_PER_WORD,
  DEFAULT_OPTIONS,
  DEFAULT_POOL_SIZE,
  EFF_HYPHENATED_WORDS,
  EFF_WORD_COUNT,
  GUESS_RATES,
  GUESS_RATE_LABELS,
  STRENGTH_LABELS,
  STRENGTH_THRESHOLDS,
  crackTimeLog10Seconds,
  formatBits,
  formatCrackTime,
  passphraseEntropyBits,
  passwordEntropyBits,
} from "@/lib/password";
import { faqItems } from "./faq-data";

/**
 * Every expected value is computed from the same library the answers read
 * (PREG-02, D-14). Q5 and Q6 are the human-gated D-15 drafts, pinned exactly.
 */

const Q5 =
  "No. Passwords and passphrases are generated in this browser tab with the Web Crypto API and are never sent to a server, written to the address bar, or saved. Only your options (length, character sets, word count and so on) appear in the URL, so you can bookmark them.";
const Q6 =
  "No. A copied password sits in your system clipboard like anything else you copy, and your operating system or a clipboard-manager extension may keep it in a clipboard history that this page cannot see or clear. Paste it straight into your password manager, then copy something else or clear your clipboard history if that matters to you.";

const passwordBits = passwordEntropyBits(DEFAULT_OPTIONS);
const passphraseBits = passphraseEntropyBits(DEFAULT_OPTIONS);

describe("password faqItems (PREG-02, D-14)", () => {
  it("has six items with the D-14 questions in order", () => {
    expect(faqItems.map((i) => i.question)).toEqual([
      "How strong is the default password?",
      "How are passphrases generated?",
      "Why does the word list contain hyphenated words?",
      "How are strength and crack time estimated?",
      "Is my password sent anywhere or saved?",
      "Does Packetory clear my clipboard?",
    ]);
    for (const item of faqItems) {
      expect(item.answer.trim().length).toBeGreaterThan(0);
    }
  });

  it("Q1 states the pool, bits, label and both crack times from the library", () => {
    const a = faqItems[0].answer;
    expect(a).toContain(`${DEFAULT_POOL_SIZE}-character pool`);
    expect(a).toContain(formatBits(passwordBits));
    expect(a).toContain(STRENGTH_LABELS.veryStrong);
    expect(a).toContain(
      formatCrackTime(crackTimeLog10Seconds(passwordBits, GUESS_RATES.fast)),
    );
    expect(a).toContain(
      formatCrackTime(crackTimeLog10Seconds(passwordBits, GUESS_RATES.slow)),
    );
    expect(a).not.toMatch(/about (more|less) than/);
  });

  it("Q2 states the list size, per-word bits, default bits and the random source", () => {
    const a = faqItems[1].answer;
    expect(a).toContain(EFF_WORD_COUNT.toLocaleString("en-US"));
    expect(a).toContain(BITS_PER_WORD.toFixed(1));
    expect(a).toContain(APPEND_NUMBER_BITS.toFixed(1));
    expect(a).toContain(formatBits(passphraseBits));
    expect(a).toContain("crypto.getRandomValues");
  });

  it("Q3 names every hyphenated word in order and stays honest", () => {
    const a = faqItems[2].answer;
    const head = EFF_HYPHENATED_WORDS.slice(0, -1).join(", ");
    const tail = EFF_HYPHENATED_WORDS[EFF_HYPHENATED_WORDS.length - 1];
    expect(a).toContain(`${head} and ${tail}`);
    expect(a).toContain(`${EFF_HYPHENATED_WORDS.length} of its words`);
    expect(a).toContain("no practical effect");
    expect(a).not.toMatch(/exactly zero|no effect at all/i);
  });

  it("Q4 states the thresholds and both guess-rate labels verbatim", () => {
    const a = faqItems[3].answer;
    const { fair, strong, veryStrong } = STRENGTH_THRESHOLDS;
    expect(a).toContain(`Below ${fair}`);
    expect(a).toContain(`${fair} to ${strong - 1}`);
    expect(a).toContain(`${strong} to ${veryStrong - 1}`);
    expect(a).toContain(`${veryStrong} or more`);
    expect(a).toContain(GUESS_RATE_LABELS.fast);
    expect(a).toContain(GUESS_RATE_LABELS.slow);
  });

  it("Q5 and Q6 are the D-15 drafts exactly and make no clipboard-clearing promise", () => {
    expect(faqItems[4].answer).toBe(Q5);
    expect(faqItems[5].answer).toBe(Q6);
    for (const item of faqItems) {
      expect(item.answer).not.toMatch(
        /auto-clear|clears your clipboard|unhackable|uncrackable|guarantee/i,
      );
    }
  });

  it("contains no sample password: no 20+ character run with all four classes", () => {
    for (const item of faqItems) {
      for (const token of item.answer.split(/\s+/)) {
        if (token.length < 20) continue;
        const allClasses =
          /[A-Z]/.test(token) &&
          /[a-z]/.test(token) &&
          /[0-9]/.test(token) &&
          /[^A-Za-z0-9]/.test(token);
        expect(allClasses, token).toBe(false);
      }
    }
  });

  it("renders today's constants as 85, 128 bits, 7,776, 77 bits, 12.9 and 3.3", () => {
    const all = faqItems.map((i) => i.answer).join(" ");
    expect(all).toContain("85-character pool");
    expect(all).toContain("128 bits");
    expect(all).toContain("7,776");
    expect(all).toContain("77 bits");
    expect(all).toContain("12.9");
    expect(all).toContain("3.3");
  });
});
