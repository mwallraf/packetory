"use client";

import dynamic from "next/dynamic";

/**
 * Client-only render boundary for the hash tool (mirrors
 * `MacToolLoader.tsx`). The island reads the clipboard/Worker APIs and never
 * server-renders; this project's locked Server-shell + Client-island split
 * keeps `page.tsx` a plain static shell.
 *
 * `ssr:false` is only legal inside a "use client" file - Next.js throws if
 * this call is placed directly in a Server Component.
 */
const HashTool = dynamic(
  () => import("./HashTool").then((mod) => mod.HashTool),
  {
    ssr: false,
    loading: () => <HashToolSkeleton />,
  }
);

/**
 * Fixed-height placeholder matching the settled island (input block + 10
 * stacked digest rows) so there is no layout shift when the island paints in.
 * Heights are MEASURED, not estimated (09-09, 2026-10-15, Chromium, sample
 * state, fonts loaded): the island settles at 2237.9px at 320px wide and
 * 1610.0px at 1280px wide (1610.0px from 768px up), pinned here rounded up to
 * a multiple of 4 (2240 / 1612). Taller below `sm` because 128-char digests
 * wrap to ~5 lines at 320px. tests/e2e/hash-layout.spec.ts reads these two
 * numbers from this file and fails if they drift more than 4px from the real
 * island. Intermediate widths (375px: 2040.8px, 639px: 1733.6px) sit between
 * the pins; the CLS observer stays below 0.01 at 375/768 without an extra
 * breakpoint class.
 */
function HashToolSkeleton() {
  return (
    <div
      aria-hidden="true"
      data-testid="hash-tool-skeleton"
      className="h-[2240px] sm:h-[1612px] motion-safe:animate-pulse rounded-md border border-border bg-secondary"
    />
  );
}

export function HashToolLoader() {
  return <HashTool />;
}
