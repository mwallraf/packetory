"use client";

import dynamic from "next/dynamic";

/**
 * Client-only render boundary for the Subnet tool (RESEARCH.md Pattern 1).
 *
 * Unlike `UuidToolLoader` (which uses `ssr:false` to dodge a CSPRNG
 * hydration mismatch), this loader exists for a *static-rendering* reason:
 * the `?cidr=` URL param must be read via `window.location.search`, never
 * the Server Component `searchParams` prop — destructuring `searchParams`
 * in `page.tsx` would opt the whole route into per-request dynamic
 * rendering, regressing this project's static-first constraint. Skipping
 * server rendering of this subtree entirely means the CIDR-reading logic
 * never runs on the server at all, so `page.tsx` stays a plain static
 * shell.
 *
 * `ssr:false` is only legal inside a "use client" file — Next.js throws if
 * this call is placed directly in a Server Component (Pitfall 2 in the
 * UUID precedent).
 */
const SubnetTool = dynamic(
  () => import("./SubnetTool").then((mod) => mod.SubnetTool),
  {
    ssr: false,
    loading: () => <SubnetToolSkeleton />,
  }
);

/**
 * Fixed-height placeholder matching the real result panel's approximate
 * height (CIDR input + family badge + hero row + one row of the field
 * grid), so there is no layout shift between this skeleton and the real
 * value painting in (SHELL-06 equivalent).
 */
function SubnetToolSkeleton() {
  return (
    <div
      aria-hidden="true"
      data-testid="subnet-tool-skeleton"
      className="h-[420px] animate-pulse rounded-md border border-border bg-secondary"
    />
  );
}

export function SubnetToolLoader() {
  return <SubnetTool />;
}
