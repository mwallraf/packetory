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
 * Fixed-height placeholder approximating the settled island (input block +
 * 10 stacked digest rows) so there is no layout shift when the island paints
 * in. Heights are the UI-SPEC estimates; 09-09 measures the settled island
 * and pins them. Taller below `sm` because 128-char digests wrap to ~5 lines
 * at 320px.
 */
function HashToolSkeleton() {
  return (
    <div
      aria-hidden="true"
      data-testid="hash-tool-skeleton"
      className="h-[1960px] sm:h-[1600px] motion-safe:animate-pulse rounded-md border border-border bg-secondary"
    />
  );
}

export function HashToolLoader() {
  return <HashTool />;
}
