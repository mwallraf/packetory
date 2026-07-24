"use client";

import dynamic from "next/dynamic";

/**
 * Client-only render boundary for the UUID tool (RESEARCH.md Pattern 1).
 *
 * `ssr:false` is ONLY legal inside a "use client" file — Next.js throws
 * "ssr: false is not allowed with next/dynamic in Server Components" if
 * this call is placed directly in page.tsx (Pitfall 2). Skipping server
 * rendering of this subtree entirely means there is no server-rendered
 * UUID for the client's freshly-generated value to mismatch against —
 * this is what prevents the hydration-mismatch flicker named in Success
 * Criterion 1 (a lazy `useState` initializer alone does not, since the
 * component would still execute once during SSR and again on hydration).
 */
const UuidTool = dynamic(
  () => import("./UuidTool").then((mod) => mod.UuidTool),
  {
    ssr: false,
    loading: () => <UuidToolSkeleton />,
  }
);

/**
 * Fixed-height placeholder matching the real hero row's height, so there
 * is no layout shift (SHELL-06) between this skeleton and the real value
 * painting in.
 */
function UuidToolSkeleton() {
  return (
    <div
      aria-hidden="true"
      data-testid="uuid-hero-skeleton"
      className="h-[76px] animate-pulse rounded-md border border-border bg-secondary"
    />
  );
}

export function UuidToolLoader() {
  return <UuidTool />;
}
