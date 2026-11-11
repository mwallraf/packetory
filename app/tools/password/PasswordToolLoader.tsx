"use client";

import dynamic from "next/dynamic";

/**
 * Client-only render boundary for the Password tool (D-01). Turning SSR off
 * for a dynamic import is only legal inside a "use client" file, which is why
 * it lives here and not in page.tsx. Skipping server rendering of the island means no password is ever
 * generated on the server, so none can be baked into the prerendered HTML.
 */
const PasswordTool = dynamic(
  () => import("./PasswordTool").then((mod) => mod.PasswordTool),
  {
    ssr: false,
    loading: () => <PasswordToolSkeleton />,
  },
);

/**
 * Text-free placeholder for the island (D-16, D-17). It holds no text, digits
 * or symbols, and mirrors the settled default island: the mode row, the hero
 * and the strength panel, with the options panel's space reserved by the root
 * height.
 * Measured (14-08, Chromium, default state, fonts loaded): 320px wide 1374.3px, 1280px wide 960.3px; pinned h-[1374px] sm:h-[960px]
 * Blocks (Password mode, batch 1): mode row 44px, hero 122px at both widths, strength panel 348px at 320px and 225px at 1280px.
 * Passphrase hero (6 words, most frequent of 200 samples): 178px at 320px, 122px at 1280px; pinned in PasswordOutput.tsx.
 */
function PasswordToolSkeleton() {
  return (
    <div
      aria-hidden="true"
      data-testid="password-skeleton"
      className="flex flex-col gap-8 h-[1374px] sm:h-[960px]"
    >
      <div className="flex flex-col gap-4">
        <div className="h-11 w-56 rounded-lg bg-secondary" />
        <div className="h-[122px] animate-pulse rounded-md border border-border bg-secondary motion-reduce:animate-none" />
        <div className="h-[348px] sm:h-[225px] rounded-md border border-border bg-background" />
      </div>
    </div>
  );
}

export function PasswordToolLoader() {
  return <PasswordTool />;
}
