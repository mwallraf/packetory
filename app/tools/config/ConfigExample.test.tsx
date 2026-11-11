import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TOKEN_CLASSES } from "@/lib/config/token-classes";
import type { ConfigTokenKind } from "@/lib/config/highlight";
import { ConfigExample } from "./ConfigExample";
import { SAMPLE_CONFIG } from "./faq-data";

function renderExample(): HTMLDivElement {
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(<ConfigExample />);
  return container;
}

describe("ConfigExample (CFG-01)", () => {
  it("renders an accessible, scrollable preview region (D-10)", () => {
    const preview = renderExample().querySelector(
      '[data-testid="config-worked-example-preview"]',
    );
    expect(preview).not.toBeNull();
    expect(preview?.getAttribute("role")).toBe("region");
    expect(preview?.getAttribute("aria-label")).toBe(
      "Highlighted example configuration",
    );
    expect(preview?.getAttribute("tabindex")).toBe("0");
    expect(preview?.className).toContain("overflow-x-auto");
  });

  it("renders SAMPLE_CONFIG verbatim as the pre text content (D-10, D-11)", () => {
    const pre = renderExample().querySelector(
      '[data-testid="config-worked-example-preview"] pre',
    );
    expect(pre).not.toBeNull();
    expect(pre?.textContent).toBe(SAMPLE_CONFIG);
    for (const cls of ["font-mono", "text-[14px]", "w-max", "min-w-full"]) {
      expect(pre?.className).toContain(cls);
    }
  });

  it("contains a token span of every highlighted kind (CFG-01)", () => {
    const kinds = new Set(
      Array.from(renderExample().querySelectorAll("[data-token]")).map((el) =>
        el.getAttribute("data-token"),
      ),
    );
    for (const kind of [
      "comment",
      "command",
      "keyword",
      "interface",
      "address",
      "number",
      "string",
    ]) {
      expect(kinds.has(kind)).toBe(true);
    }
  });

  it("styles every token span from the shared TOKEN_CLASSES map (D-11)", () => {
    const spans = Array.from(
      renderExample().querySelectorAll("span[data-token]"),
    );
    expect(spans.length).toBeGreaterThan(0);
    for (const span of spans) {
      const kind = span.getAttribute("data-token") as ConfigTokenKind;
      expect(span.className).toBe(TOKEN_CLASSES[kind]);
    }
  });

  it("shows the caption and the copy sentence, without buttons (D-12, D-17)", () => {
    const container = renderExample();
    const paragraphs = Array.from(container.querySelectorAll("p")).map(
      (p) => p.textContent ?? "",
    );
    expect(paragraphs).toContain(
      "Cisco IOS snippet, highlighted (documentation addresses only, RFC 5737)",
    );
    const sentence = paragraphs.find((p) => p.includes("Copy for email"));
    expect(sentence).toContain("Copy for email should keep");
    expect(sentence).toContain("Copy plain text gives the raw configuration");
    expect(container.querySelector("button")).toBeNull();
  });
});
