"use client";

import dynamic from "next/dynamic";

/**
 * Client-only render boundary for the DNS tool (RESEARCH.md Pattern 1,
 * mirrors `SubnetToolLoader.tsx`). `?name=&type=` must be read via
 * `window.location.search`, never the Server Component `searchParams`
 * prop — destructuring `searchParams` in `page.tsx` would opt the whole
 * route into per-request dynamic rendering, regressing this project's
 * static-first constraint. Skipping server rendering of this subtree
 * entirely means the URL-reading/lookup-orchestration logic never runs on
 * the server at all, so `page.tsx` stays a plain static shell.
 *
 * `ssr:false` is only legal inside a "use client" file — Next.js throws if
 * this call is placed directly in a Server Component (Pitfall 2, same as
 * the UUID/Subnet precedent).
 */
const DnsTool = dynamic(
  () => import("./DnsTool").then((mod) => mod.DnsTool),
  {
    ssr: false,
    loading: () => <DnsToolSkeleton />,
  }
);

/**
 * Fixed-height placeholder matching the real result panel's approximate
 * height (domain input + record-type toggle + resolver/duration row + a
 * few record rows), so there is no layout shift (D-08) between this
 * skeleton and the real value painting in. Covers only the window before
 * `DnsTool` itself has mounted — `DnsTool.tsx`'s own `DnsResultSkeleton`
 * (same testid, same height) covers the subsequent window between mount
 * and the first lookup actually resolving; the two are never rendered
 * simultaneously.
 */
function DnsToolSkeleton() {
  return (
    <div
      aria-hidden="true"
      data-testid="dns-tool-skeleton"
      className="h-[420px] animate-pulse rounded-md border border-border bg-secondary"
    />
  );
}

export function DnsToolLoader() {
  return <DnsTool />;
}
