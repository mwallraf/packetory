// @vitest-environment node
import { describe, expect, it } from "vitest";
import { faqItems } from "./faq-data";

const FORBIDDEN_PHRASES = [
  "tracking",
  "never leaves",
  "never stored",
  "never sent",
  "private",
  "100%",
];

describe("hash faqItems (INTG-02, D-26)", () => {
  it("has exactly five items with non-empty question and answer", () => {
    expect(faqItems).toHaveLength(5);
    for (const item of faqItems) {
      expect(item.question.trim().length).toBeGreaterThan(0);
      expect(item.answer.trim().length).toBeGreaterThan(0);
    }
  });

  it("covers the five required topics in order", () => {
    expect(faqItems.map((item) => item.question)).toEqual([
      "What's the difference between SHA3-256 and Keccak-256?",
      "Why doesn't my hash match echo 'text' | sha256sum?",
      "Are MD5 and SHA-1 safe for security?",
      "Does a matching hash prove the text or file is authentic?",
      "Where does the hashing happen?",
    ]);
  });

  it("explains SHA3-256 vs Keccak-256", () => {
    const answer = faqItems[0].answer;
    expect(answer).toContain("FIPS 202");
    expect(answer).toContain("Keccak-256");
    expect(answer.toLowerCase()).toContain("different digests");
  });

  it("explains echo vs printf, echo -n and CRLF", () => {
    const answer = faqItems[1].answer;
    expect(answer).toContain("printf '%s'");
    expect(answer).toContain("echo -n");
    expect(answer).toContain("CRLF");
  });

  it("states MD5 and SHA-1 are not safe for security", () => {
    const answer = faqItems[2].answer;
    expect(answer).toContain("not safe for security");
    expect(answer).toContain("CRC32");
    expect(answer).toContain("accidental");
    expect(answer).toContain("SHA-256");
  });

  it("states a match does not prove authenticity", () => {
    const answer = faqItems[3].answer.toLowerCase();
    expect(answer).toContain("who published");
    expect(answer).toMatch(/signature|trust/);
  });

  it("limits the 'where' answer to exactly the two approved D-27 statements", () => {
    expect(faqItems[4].answer).toBe(
      "Hashing runs in your browser. If you use Copy link, the link contains your text."
    );
  });

  it("contains no forbidden privacy or legal phrases (D-27)", () => {
    for (const item of faqItems) {
      const text = `${item.question} ${item.answer}`.toLowerCase();
      for (const phrase of FORBIDDEN_PHRASES) {
        expect(text, `"${phrase}" in "${item.question}"`).not.toContain(phrase);
      }
    }
  });
});
