import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ToolCard, assertToolIcon } from "./ToolCard";
import { getToolBySlug, tools } from "@/tools/registry";
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

const HASH_TOOL: ToolDefinition = {
  slug: "hash",
  name: "Hash Generator",
  shortName: "Hash",
  description:
    "Compute MD5, SHA-1, SHA-2, SHA-3, RIPEMD-160 and CRC32 digests of any text as you type, copy them as hex or Base64, and verify a checksum — all in your browser.",
  category: "encode",
  keywords: ["hash", "sha256", "md5", "sha1", "checksum", "crc32", "sha3"],
  icon: "Hash",
  status: "active",
  clientOnly: true,
  featured: false,
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

  it("renders the lucide Hash icon, not the Fingerprint fallback, for icon 'Hash' (INTG-01)", () => {
    const { container } = render(<ToolCard tool={HASH_TOOL} />);

    expect(container.querySelector("svg.lucide-hash")).not.toBeNull();
    // lucide-react v1.x renders Fingerprint with the class
    // `lucide-fingerprint-pattern`; match the prefix so a rename cannot make
    // this negative assertion vacuous.
    expect(container.querySelector('svg[class*="lucide-fingerprint"]')).toBeNull();
  });

  it("throws for an unknown icon string instead of falling back (CFG-03)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() =>
        render(<ToolCard tool={{ ...HASH_TOOL, icon: "NotARealIcon" }} />)
      ).toThrow(/Unknown tool icon/);
    } finally {
      spy.mockRestore();
    }
  });

  it("assertToolIcon accepts every registry icon and rejects unknown and prototype keys (CFG-03)", () => {
    for (const name of ["Fingerprint", "Network", "Globe", "Cpu", "Hash", "FileTerminal"]) {
      expect(() => assertToolIcon(name)).not.toThrow();
    }
    expect(() => assertToolIcon("NotARealIcon")).toThrow(/Unknown tool icon/);
    expect(() => assertToolIcon("toString")).toThrow(/Unknown tool icon/);
  });

  it("renders the lucide FileTerminal icon for the Config registry entry (CFG-03)", () => {
    const config = getToolBySlug("config");
    expect(config).toBeDefined();
    const { container } = render(<ToolCard tool={config!} />);

    const icon = container.querySelector("svg.lucide-file-terminal");
    expect(icon).not.toBeNull();
    expect(icon!.getAttribute("aria-hidden")).toBe("true");
    const tokens = (icon!.getAttribute("class") ?? "").split(/\s+/);
    for (const token of ["size-5", "shrink-0", "text-muted-foreground"]) {
      expect(tokens).toContain(token);
    }
    expect(container.querySelector("svg.lucide-network")).toBeNull();
  });

  it("renders a distinct icon for every registered tool (CFG-03)", () => {
    const classes: string[] = [];
    for (const tool of tools) {
      const { container, unmount } = render(<ToolCard tool={tool} />);
      const icons = container.querySelectorAll("svg.size-5");
      expect(icons).toHaveLength(1);
      classes.push(icons[0].getAttribute("class") ?? "");
      unmount();
    }
    expect(classes).toHaveLength(6);
    expect(new Set(classes).size).toBe(6);
  });
});
