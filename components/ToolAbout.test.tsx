import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ToolAbout } from "./ToolAbout";
import type { FaqItem } from "@/lib/seo/jsonld";

const FIXTURE: FaqItem[] = [
  { question: "Q1?", answer: "A1." },
  { question: "Q2?", answer: "A2 with </script> inside." },
  { question: "Q3?", answer: "A3." },
  { question: "Q4?", answer: "A4." },
];

function render(items: FaqItem[] = FIXTURE, className?: string) {
  const html = renderToStaticMarkup(
    <ToolAbout slug="demo" faqItems={items} className={className}>
      <p>example body</p>
    </ToolAbout>
  );
  const root = document.createElement("div");
  root.innerHTML = html;
  return { html, root };
}

describe("ToolAbout server markup", () => {
  it("renders two details, both closed on load (INFO-02)", () => {
    const { html, root } = render();
    const details = root.querySelectorAll("details");
    expect(details).toHaveLength(2);
    details.forEach((d) => expect(d.hasAttribute("open")).toBe(false));
    expect(html).not.toMatch(/<details[^>]*\sopen/);
    expect(details[0].getAttribute("data-testid")).toBe("demo-worked-example");
    expect(details[1].getAttribute("data-testid")).toBe("demo-faq");
  });

  it("never opens details for an empty faq either (INFO-02)", () => {
    const { html } = render([]);
    expect(html).not.toMatch(/<details[^>]*\sopen/);
  });

  it("has the muted About heading and section wiring (INFO-01)", () => {
    const { root } = render();
    expect(root.querySelector("h2#about-heading")?.textContent).toBe(
      "About this tool"
    );
    const section = root.querySelector('section[data-testid="about-tool"]');
    expect(section?.getAttribute("aria-labelledby")).toBe("about-heading");
    for (const token of ["mt-16", "border-t", "max-w-3xl"]) {
      expect(section?.classList.contains(token)).toBe(true);
    }
  });

  it("merges a className prop onto the section (INFO-01)", () => {
    const { root } = render(FIXTURE, "extra");
    expect(
      root
        .querySelector('section[data-testid="about-tool"]')
        ?.classList.contains("extra")
    ).toBe(true);
  });

  it("derives the FAQ count label from faqItems.length (INFO-02)", () => {
    const labels = (items: FaqItem[]) =>
      Array.from(render(items).root.querySelectorAll("summary")).map(
        (s) => s.textContent
      );
    expect(labels(FIXTURE)).toEqual(["Worked example", "FAQ (4 questions)"]);
    const six = [...FIXTURE, { question: "Q5?", answer: "A5." }, { question: "Q6?", answer: "A6." }];
    expect(labels(six)[1]).toBe("FAQ (6 questions)");
  });

  it("keeps worked-example content in the closed details (INFO-02)", () => {
    const { root } = render();
    const first = root.querySelector("details");
    expect(first?.textContent).toContain("example body");
  });

  it("emits exactly one escaped FAQPage script in input order (INFO-03)", () => {
    const { root } = render();
    const scripts = root.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);
    const text = scripts[0].textContent ?? "";
    expect(text).not.toContain("<");
    const parsed = JSON.parse(text);
    expect(parsed["@type"]).toBe("FAQPage");
    expect(
      parsed.mainEntity.map((e: { name: string }) => e.name)
    ).toEqual(FIXTURE.map((i) => i.question));
  });

  it("renders each FAQ item with exactly two p children (INFO-03)", () => {
    const { root } = render();
    const items = root.querySelectorAll('[data-testid="demo-faq-item"]');
    expect(items).toHaveLength(FIXTURE.length);
    items.forEach((el, i) => {
      const ps = Array.from(el.children).filter((c) => c.tagName === "P");
      expect(ps).toHaveLength(2);
      expect(ps[0].textContent).toBe(FIXTURE[i].question);
      expect(ps[1].textContent).toBe(FIXTURE[i].answer);
    });
  });

  it("gives each summary a rotating chevron and focus/hit-target classes (INFO-02)", () => {
    const { root } = render();
    root.querySelectorAll("summary").forEach((s) => {
      const svg = s.querySelector("svg");
      expect(svg?.classList.contains("lucide-chevron-right")).toBe(true);
      expect(svg?.classList.contains("group-open:rotate-90")).toBe(true);
      expect(svg?.getAttribute("aria-hidden")).toBe("true");
      for (const token of [
        "list-none",
        "[&::-webkit-details-marker]:hidden",
        "focus-visible:ring-3",
        "min-h-11",
      ]) {
        expect(s.classList.contains(token)).toBe(true);
      }
    });
  });

  it("never clips overflow on the section, wrapper or details (INFO-02)", () => {
    const { root } = render();
    const section = root.querySelector('section[data-testid="about-tool"]')!;
    const wrapper = section.querySelector(":scope > div")!;
    for (const el of [section, wrapper, ...Array.from(root.querySelectorAll("details"))]) {
      expect(Array.from(el.classList).some((c) => c.startsWith("overflow-"))).toBe(false);
    }
  });
});
