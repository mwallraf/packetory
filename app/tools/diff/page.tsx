import type { Metadata } from "next";
import { SITE_URL } from "@/app/sitemap";
import { ToolAbout } from "@/components/ToolAbout";
import { TextDiffWorkspace } from "./TextDiffWorkspace";
import { textDiffExample } from "./example";
import { faqItems } from "./faq-data";

const title = "Online Text Diff & Config Compare — Packetory";
const description = "Compare two text snippets or network configs in your browser. See line-by-line changes and optionally ignore blank lines or trailing spaces.";
const url = `${SITE_URL}/tools/diff`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: { title, description, url, type: "website" },
};

export default function TextDiffPage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-[32px] leading-[1.2] font-semibold text-foreground">Text Diff</h1>
        <p className="mt-4 text-base leading-normal text-muted-foreground">{description}</p>
        <div className="mt-8">
          <TextDiffWorkspace />
        </div>
        <ToolAbout slug="diff" faqItems={faqItems}>
          <p className="text-base leading-normal text-muted-foreground">
            The address changes from 192.0.2.1 to 192.0.2.2, and the modified configuration adds an interface description.
          </p>
          <p className="mt-2 text-base text-muted-foreground">
            Add a blank line and trailing spaces to one side. Turn on Ignore
            blank and Ignore trailing spaces to hide those changes while keeping
            the address and description changes visible. Leading indentation
            still counts.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {(["original", "modified"] as const).map((side) => (
              <div className="min-w-0" key={side}>
                <p className="text-sm font-semibold">{side === "original" ? "Original" : "Modified"}</p>
                <pre className="mt-2 rounded-lg border bg-card p-4 font-mono text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">
                  <code>{textDiffExample[side]}</code>
                </pre>
              </div>
            ))}
          </div>
        </ToolAbout>
      </main>
    </div>
  );
}
