// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { tools } from "@/tools/registry";
import { faqItems as configFaq } from "./config/faq-data";
import { faqItems as dnsFaq } from "./dns/faq-data";
import { faqItems as hashFaq } from "./hash/faq-data";
import { faqItems as macFaq } from "./mac/faq-data";
import { faqItems as subnetFaq } from "./subnet/faq-data";
import { faqItems as uuidFaq } from "./uuid/faq-data";

const FAQ_BY_SLUG: Record<
  string,
  readonly { question: string; answer: string }[]
> = {
  uuid: uuidFaq,
  subnet: subnetFaq,
  dns: dnsFaq,
  mac: macFaq,
  hash: hashFaq,
  config: configFaq,
};

const ACTIVE_TOOLS = tools.filter((t) => t.status !== "planned");

/** Source with comment-only lines dropped, so prose mentions never trip a guard. */
function codeLines(source: string): string {
  return source
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
    .join("\n");
}

/** Repo-relative (posix) paths of every non-test .ts/.tsx source under the roots. */
function sourceFiles(roots: readonly string[]): string[] {
  const files: string[] = [];
  for (const root of roots) {
    const entries = readdirSync(path.join(process.cwd(), root), {
      encoding: "utf8",
      recursive: true,
    });
    for (const entry of entries) {
      const rel = path.posix.join(root, entry.split(path.sep).join("/"));
      if (!/\.tsx?$/.test(rel) || rel.includes(".test.")) continue;
      files.push(rel);
    }
  }
  return files;
}

describe("shared About structural guard", () => {
  it("every non-planned registry tool has a faq-data entry (INFO-05)", () => {
    expect(Object.keys(FAQ_BY_SLUG).sort()).toEqual(
      ACTIVE_TOOLS.map((t) => t.slug).sort(),
    );
  });

  it("every tool page renders ToolAbout and keeps no page-local JSON-LD (INFO-05)", () => {
    let checked = 0;
    for (const tool of ACTIVE_TOOLS) {
      const source = codeLines(
        readFileSync(
          path.join(process.cwd(), "app", "tools", tool.slug, "page.tsx"),
          "utf8",
        ),
      );
      expect(source, `${tool.slug} imports ToolAbout`).toContain(
        'from "@/components/ToolAbout"',
      );
      expect(source, `${tool.slug} renders ToolAbout`).toContain(
        `ToolAbout slug="${tool.slug}"`,
      );
      expect(source, `${tool.slug} raw-HTML prop`).not.toContain(
        "dangerouslySetInnerHTML",
      );
      expect(source, `${tool.slug} ld+json`).not.toContain(
        "application/ld+json",
      );
      expect(source, `${tool.slug} FAQPage`).not.toContain("FAQPage");
      checked += 1;
    }
    expect(checked).toBe(ACTIVE_TOOLS.length);
  });

  it("only ToolAbout emits a JSON-LD script and only lib/seo/jsonld.ts builds FAQPage (INFO-05)", () => {
    const files = sourceFiles(["app", "components", "lib"]);
    expect(files.length).toBeGreaterThan(0);
    const withScript: string[] = [];
    const withFaqPage: string[] = [];
    for (const rel of files) {
      const code = codeLines(
        readFileSync(path.join(process.cwd(), rel), "utf8"),
      );
      if (code.includes("application/ld+json")) withScript.push(rel);
      if (/["'`]FAQPage["'`]/.test(code)) withFaqPage.push(rel);
    }
    expect(withScript).toEqual(["components/ToolAbout.tsx"]);
    expect(withFaqPage).toEqual(["lib/seo/jsonld.ts"]);
  });

  it("every tool ships at least 4 FAQ items with unique, non-empty questions (INFO-01, UI E3-empty)", () => {
    for (const tool of ACTIVE_TOOLS) {
      const items = FAQ_BY_SLUG[tool.slug];
      expect(items, `${tool.slug} has faq data`).toBeDefined();
      expect(items.length, `${tool.slug} item count`).toBeGreaterThanOrEqual(4);
      if (tool.slug === "config") expect(items.length).toBeLessThanOrEqual(6);
      for (const item of items) {
        expect(item.question.trim().length).toBeGreaterThan(0);
        expect(item.answer.trim().length).toBeGreaterThan(0);
      }
      const questions = items.map((i) => i.question);
      expect(new Set(questions).size, `${tool.slug} unique questions`).toBe(
        questions.length,
      );
    }
  });
});
