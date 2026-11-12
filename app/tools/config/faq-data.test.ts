// @vitest-environment node
import { describe, expect, it } from "vitest";
import { highlightConfig } from "@/lib/config/highlight";
import { faqItems, SAMPLE_CONFIG } from "./faq-data";

// The ConfigTool footer sentence, verbatim (D-15). The privacy answer may claim
// no more than this.
const SHIPPED_PRIVACY_CLAIM =
  "Your configuration stays in this browser tab and is never uploaded or saved.";

// Any processing, location or storage term. Applied to the privacy answer after
// the shipped sentence is removed (D-15, "uses ONLY").
const PRIVACY_REMAINDER_FORBIDDEN =
  /\b(brows\w*|tabs?|local\w*|device|computer|offline|runs?|running|process\w*|upload\w*|saved?|sav(es|ing)|stor\w*|sent|send\w*|server\w*|reload\w*|gone|clos\w*|transmit\w*)\b/i;

// Data-handling terms that must not creep into the other three answers (D-15).
const DATA_HANDLING_TERMS =
  /\b(upload\w*|local\w*|offline|server\w*|stor(e|ed|age)|saved|private|privacy)\b/i;

const IPV4_LITERAL = /\b\d{1,3}(?:\.\d{1,3}){3}\b/g;

// Non-documentation IPv4 literals the sample may contain, and why:
// - 0.0.0.0           default route destination and mask
// - 255.255.255.252   /30 netmask on the uplink interface
// - 0.0.0.255         wildcard mask in the access-list entry
const ALLOWED_NON_DOC_IPV4 = ["0.0.0.0", "255.255.255.252", "0.0.0.255"];
const DOC_PREFIXES = ["192.0.2.", "198.51.100.", "203.0.113."];

const SECRET_TERMS = [
  "password",
  "secret",
  "community",
  "snmp-server",
  "username",
  "key",
  "crypto",
];

function answerAt(index: number): string {
  return faqItems[index]?.answer ?? "";
}

describe("Config SAMPLE_CONFIG (CFG-01)", () => {
  it("has exactly 11 lines starting with the hostname (CFG-01)", () => {
    const lines = SAMPLE_CONFIG.split("\n");
    expect(lines).toHaveLength(11);
    expect(lines[0]).toBe("hostname edge-rtr-01");
  });

  it("uses only RFC 5737 documentation addresses plus the allow-list (CFG-01)", () => {
    const literals = SAMPLE_CONFIG.match(IPV4_LITERAL) ?? [];
    expect(literals.length).toBeGreaterThan(0);
    let docCount = 0;
    for (const literal of literals) {
      const isDoc = DOC_PREFIXES.some((prefix) => literal.startsWith(prefix));
      if (isDoc) docCount += 1;
      expect(isDoc || ALLOWED_NON_DOC_IPV4.includes(literal)).toBe(true);
    }
    expect(docCount).toBeGreaterThanOrEqual(2);
  });

  it("contains no secret-like term (CFG-01)", () => {
    const lowered = SAMPLE_CONFIG.toLowerCase();
    for (const term of SECRET_TERMS) {
      expect(lowered).not.toContain(term);
    }
  });

  it("exercises every highlighter token kind (CFG-01)", () => {
    const kinds = new Set(
      highlightConfig(SAMPLE_CONFIG, "cisco")
        .flat()
        .map((token) => token.kind),
    );
    for (const kind of [
      "comment",
      "command",
      "keyword",
      "interface",
      "address",
      "number",
      "string",
    ] as const) {
      expect(kinds.has(kind)).toBe(true);
    }
  });
});

describe("Config faqItems (CFG-02)", () => {
  it("has between 4 and 6 items (CFG-02)", () => {
    expect(faqItems.length).toBeGreaterThanOrEqual(4);
    expect(faqItems.length).toBeLessThanOrEqual(6);
  });

  it("has non-empty trimmed questions and answers (CFG-02)", () => {
    for (const item of faqItems) {
      expect(item.question.trim()).toBe(item.question);
      expect(item.question.length).toBeGreaterThan(0);
      expect(item.answer.trim()).toBe(item.answer);
      expect(item.answer.length).toBeGreaterThan(0);
    }
  });

  it("has unique questions (CFG-02)", () => {
    const questions = faqItems.map((item) => item.question);
    expect(new Set(questions).size).toBe(questions.length);
  });

  it("lists the questions in D-13 topic order (CFG-02)", () => {
    expect(faqItems.map((item) => item.question)).toEqual([
      "Is my configuration uploaded anywhere?",
      "How do I paste highlighted config into Outlook, Word or Google Docs?",
      "Which vendors and syntaxes are supported?",
      "What is the Monochrome option for?",
    ]);
  });

  it("limits the privacy answer to the shipped claim plus the tip (D-15)", () => {
    const answer = answerAt(0);
    const lead = `No. ${SHIPPED_PRIVACY_CLAIM}`;
    expect(answer.startsWith(lead)).toBe(true);
    expect(answer).toContain("never uploaded or saved");
    expect(answer).not.toMatch(/\b(stored|sent|reload|gone)\b/i);

    const remainder = answer.slice(lead.length);
    expect(remainder).toContain(
      "remove passwords, keys and SNMP community strings",
    );
    expect(remainder).not.toMatch(PRIVACY_REMAINDER_FORBIDDEN);
    // Control: the guard must fire on a real processing claim.
    expect("highlighting and copying both run in your browser").toMatch(
      PRIVACY_REMAINDER_FORBIDDEN,
    );
  });

  it("keeps data-handling terms out of the other answers (D-15)", () => {
    for (const index of [1, 2, 3]) {
      expect(answerAt(index)).not.toMatch(DATA_HANDLING_TERMS);
    }
  });

  it("phrases rich copy as should keep, not will keep (D-17)", () => {
    const answer = answerAt(1);
    expect(answer).toContain("should keep");
    expect(answer).toContain("Copy plain text");
    expect(answer).not.toMatch(/\b(will|always) keep\b/i);
  });

  it("makes no quality claim about other vendors (CFG-02)", () => {
    const answer = answerAt(2);
    expect(answer).toContain("Plain text");
    expect(answer).toContain("IPv6");
    expect(answer).toContain("are not specifically supported");
    expect(answer).not.toMatch(/\b(often|usually|generally|mostly|reasonably)\b/i);
  });

  it("mentions printing in the monochrome answer (CFG-02)", () => {
    expect(answerAt(3)).toContain("printing");
  });

  it("makes no find-in-page claim in any answer (CFG-02)", () => {
    for (const item of faqItems) {
      expect(item.answer).not.toMatch(/find[- ]in[- ]page|ctrl\+f|cmd\+f/i);
    }
  });
});
