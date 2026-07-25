import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ToolCard } from "./ToolCard";
import type { ToolDefinition } from "@/tools/registry";

const ACTIVE_TOOL: ToolDefinition = {
  slug: "dns",
  name: "DNS Lookup",
  shortName: "DNS",
  description:
    "Resolve A, AAAA, MX, TXT, NS, and CNAME records over DNS-over-HTTPS with a primary and fallback resolver, showing TTL and lookup duration.",
  category: "web",
  keywords: ["dns", "doh", "records", "mx", "txt"],
  icon: "Globe",
  status: "active",
  clientOnly: true,
  featured: false,
};

const FEATURED_TOOL: ToolDefinition = {
  slug: "uuid",
  name: "UUID Generator",
  shortName: "UUID",
  description:
    "Generate UUID v4 and v7 identifiers instantly, single or in batch, with uppercase/lowercase and hyphen formatting plus plain text, CSV, or JSON export.",
  category: "generate",
  keywords: ["uuid", "guid", "v4", "v7", "identifier"],
  icon: "Fingerprint",
  status: "active",
  clientOnly: true,
  featured: true,
};

const PLANNED_TOOL: ToolDefinition = {
  slug: "future-tool",
  name: "Future Tool",
  shortName: "Future",
  description: "A tool that has not shipped yet.",
  category: "network",
  keywords: ["future"],
  icon: "Network",
  status: "planned",
  clientOnly: true,
  featured: false,
};

afterEach(() => {
  cleanup();
});

describe("ToolCard", () => {
  it("renders exactly one anchor for an active tool, href /tools/{slug}, accessible name is exactly tool.name (D-02)", () => {
    const { container } = render(<ToolCard tool={ACTIVE_TOOL} />);

    const anchors = container.querySelectorAll("a");
    expect(anchors).toHaveLength(1);

    const anchor = anchors[0];
    expect(anchor.getAttribute("href")).toBe(`/tools/${ACTIVE_TOOL.slug}`);
    expect(anchor.textContent).toBe(ACTIVE_TOOL.name);
    expect(anchor.textContent).not.toContain(ACTIVE_TOOL.description);
    expect(anchor.textContent).not.toContain("Web");
  });

  it("renders a featured tool identically navigable — one anchor, correct href", () => {
    const { container } = render(<ToolCard tool={FEATURED_TOOL} />);

    const anchors = container.querySelectorAll("a");
    expect(anchors).toHaveLength(1);

    const anchor = anchors[0];
    expect(anchor.getAttribute("href")).toBe(`/tools/${FEATURED_TOOL.slug}`);
    expect(anchor.textContent).toBe(FEATURED_TOOL.name);
    expect(anchor.textContent).not.toContain(FEATURED_TOOL.description);
    expect(anchor.textContent).not.toContain("Generate");
  });

  it("renders zero anchors for a planned tool and no hover/focus-visible ring classes (D-05/D-06)", () => {
    const { container, getByTestId } = render(
      <ToolCard tool={PLANNED_TOOL} />
    );

    expect(container.querySelectorAll("a")).toHaveLength(0);

    const card = getByTestId("tool-card");
    expect(card.className).not.toContain("has-[:hover]");
    expect(card.className).not.toContain("has-[:focus-visible]");
  });

  it("every tool-card element carries the relative class regardless of status", () => {
    for (const tool of [ACTIVE_TOOL, FEATURED_TOOL, PLANNED_TOOL]) {
      const { getByTestId, unmount } = render(<ToolCard tool={tool} />);
      expect(getByTestId("tool-card").className).toContain("relative");
      unmount();
    }
  });

  it("renders all four data-testids for every tool state", () => {
    for (const tool of [ACTIVE_TOOL, FEATURED_TOOL, PLANNED_TOOL]) {
      const { getByTestId, unmount } = render(<ToolCard tool={tool} />);
      expect(getByTestId("tool-card")).toBeTruthy();
      expect(getByTestId("tool-card-name")).toBeTruthy();
      expect(getByTestId("tool-card-description")).toBeTruthy();
      expect(getByTestId("tool-card-category")).toBeTruthy();
      unmount();
    }
  });
});
