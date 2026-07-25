"use client";

import dynamic from "next/dynamic";

/**
 * Client-only render boundary for the MAC tool (mirrors
 * `DnsToolLoader.tsx`/`SubnetToolLoader.tsx`). Format normalization is pure
 * client-side math with no server-time-dependent input, but this project's
 * locked Server-shell + Client-island split still applies (established
 * Phase 2+ pattern) — `ssr:false` keeps `page.tsx` a plain static shell.
 *
 * `ssr:false` is only legal inside a "use client" file — Next.js throws if
 * this call is placed directly in a Server Component.
 */
const MacTool = dynamic(
  () => import("./MacTool").then((mod) => mod.MacTool),
  {
    ssr: false,
    loading: () => <MacToolSkeleton />,
  }
);

/**
 * Fixed-height placeholder matching the real result panel's approximate
 * height (MAC input + 4 format rows + classification/vendor stub
 * sections), so there is no layout shift between this skeleton and the
 * real value painting in. Covers only the window before `MacTool` itself
 * has mounted.
 */
function MacToolSkeleton() {
  return (
    <div
      aria-hidden="true"
      data-testid="mac-tool-skeleton"
      className="h-[420px] animate-pulse rounded-md border border-border bg-secondary"
    />
  );
}

export function MacToolLoader() {
  return <MacTool />;
}
