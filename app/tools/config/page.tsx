import type { Metadata } from "next";
import { SITE_URL } from "@/app/sitemap";
import { ConfigToolLoader } from "./ConfigToolLoader";

const TITLE = "Network Config Syntax Highlighter — Packetory";
const DESCRIPTION =
  "Highlight Cisco network configuration locally in your browser and copy it to email or documents with formatting intact.";
const CANONICAL_URL = `${SITE_URL}/tools/config`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: CANONICAL_URL,
    type: "website",
  },
};

export default function ConfigPage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h1 className="text-[32px] leading-[1.2] font-semibold text-foreground">
            Config Syntax Highlighter
          </h1>
          <p className="mt-4 text-[16px] leading-[1.5] text-muted-foreground">
            Paste a network configuration, preview the highlighting, then copy
            it into email or documentation with its colours and monospace
            formatting intact.
          </p>
        </div>
        <div className="mt-8">
          <ConfigToolLoader />
        </div>
      </main>
    </div>
  );
}
