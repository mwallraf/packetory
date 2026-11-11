import { describe, expect, it } from "vitest";
import { faqItems } from "@/app/tools/uuid/faq-data";
import { buildFaqJsonLd, serializeJsonLd, type FaqItem } from "./jsonld";

const FIXTURE: FaqItem[] = [
  { question: "First?", answer: "One." },
  { question: "Second?", answer: "Two." },
  { question: "Third?", answer: "Three." },
];

describe("buildFaqJsonLd (INFO-03)", () => {
  it("has the FAQPage envelope and one entry per item", () => {
    const data = buildFaqJsonLd(FIXTURE);
    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity).toHaveLength(FIXTURE.length);
  });

  it("preserves input order and maps question/answer exactly", () => {
    const data = buildFaqJsonLd(FIXTURE);
    FIXTURE.forEach((item, i) => {
      expect(data.mainEntity[i]).toEqual({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      });
    });
  });

  it("gives an empty mainEntity for an empty array", () => {
    expect(buildFaqJsonLd([]).mainEntity).toEqual([]);
  });
});

describe("serializeJsonLd", () => {
  it("escapes every < and round-trips through JSON.parse (T-10-01)", () => {
    const hostile: FaqItem[] = [
      { question: "Q?", answer: '</script><b>x</b> & "quotes"' },
    ];
    const built = buildFaqJsonLd(hostile);
    const out = serializeJsonLd(built);
    expect(out).not.toContain("<");
    expect(out).toContain("\\u003c");
    expect(JSON.parse(out)).toEqual(built);
  });

  it("is byte-identical to the legacy per-page output (INFO-05)", () => {
    const legacy = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    }).replace(/</g, "\\u003c");
    expect(serializeJsonLd(buildFaqJsonLd(faqItems))).toBe(legacy);
  });
});
