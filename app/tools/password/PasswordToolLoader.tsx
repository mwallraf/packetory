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
 * Measured (14-08, re-measured at 1px steps in 14 review-fix WR-04; Chromium,
 * Password mode, default state, fonts loaded): the settled island height steps
 * down as the strength-panel heading and the guess-rate label stop wrapping, so
 * one pin per breakpoint band replaces the old two-value pin. Viewport width ->
 * island height: <332 1374.3, 332 1322.3, 378 1302.7, 387 1283.1, 398 1259.1,
 * 413 1239.5, 453 1211.9, 640 979.9, 708 960.3. The pin list below follows those
 * steps with explicit `min-[Npx]` variants (as the subnet loader does), kept in
 * ascending order; password-layout.spec.ts reads it and re-measures the island
 * at 320, 375, 412, 640, 768, 1024 and 1280 px. A different fallback font can
 * move a step, so re-measure when the font stack changes.
 * Blocks (Password mode, batch 1): mode row 44px, hero 122px at both widths, strength panel 348px at 320px and 225px at 1280px.
 * Passphrase hero (6 words, most frequent of 200 samples): 178px at 320px, 122px at 1280px; pinned in PasswordOutput.tsx.
 */
function PasswordToolSkeleton() {
  return (
    <div
      aria-hidden="true"
      data-testid="password-skeleton"
      className="flex flex-col gap-8 h-[1374px] min-[332px]:h-[1322px] min-[378px]:h-[1303px] min-[387px]:h-[1283px] min-[398px]:h-[1259px] min-[413px]:h-[1240px] min-[453px]:h-[1212px] min-[640px]:h-[980px] min-[708px]:h-[960px]"
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
