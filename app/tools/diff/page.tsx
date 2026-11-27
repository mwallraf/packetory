import type { Metadata } from "next";
import { SITE_URL } from "@/app/sitemap";
import { TextDiffWorkspace } from "./TextDiffWorkspace";

const title = "Text Diff — Packetory";
const description = "Paste two snippets to see what changed. The comparison runs in your browser.";
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-[32px] leading-[1.2] font-semibold text-foreground">Text Diff</h1>
        <p className="mt-4 text-base leading-normal text-muted-foreground">{description}</p>
        <div className="mt-8">
          <TextDiffWorkspace />
        </div>
      </main>
    </div>
  );
}
