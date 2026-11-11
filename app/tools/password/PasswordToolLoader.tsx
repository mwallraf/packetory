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
 * Text-free placeholder for the island (D-17). It holds no text, digits or
 * symbols. Measured (13-06, Chromium, default state, fonts loaded): 320px wide 977.9px, 1280px wide 708.4px; pinned h-[980px] sm:h-[712px].
 * The hero block measured 122px at both widths and is pinned h-[124px] sm:h-[124px].
 * Phase 14 makes the final pin and adds the CLS gate once the strength meter
 * and passphrase controls exist.
 */
function PasswordToolSkeleton() {
  return (
    <div
      aria-hidden="true"
      data-testid="password-skeleton"
      className="flex flex-col gap-8 h-[980px] sm:h-[712px]"
    >
      <div className="h-[124px] sm:h-[124px] animate-pulse rounded-md border border-border bg-secondary motion-reduce:animate-none" />
    </div>
  );
}

export function PasswordToolLoader() {
  return <PasswordTool />;
}
