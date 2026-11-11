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
 * Fixed-height placeholder matching the settled default island (/24 result),
 * so there is no layout shift between this skeleton and the real value
 * painting in (SHELL-06 equivalent) for the default URL. A shared `?cidr=`
 * link whose result differs in shape (IPv6, /32 boundary note) is not covered:
 * a static skeleton cannot read the query string.
 *
 * The island height is not constant inside a Tailwind breakpoint band: the
 * `break-all` field values wrap with card width. Measured by sweeping every
 * viewport width from 320 to 1300px, it steps at 331, 446, 640, 658 and 1024px.
 * The pins below follow those steps with explicit `min-[Npx]` variants, so
 * the skeleton is honest at every width rather than only at three sample
 * widths. subnet-layout.spec.ts parses these pins and fails when one drifts
 * more than 4px from the measured island at any sampled width; re-measure
 * (sweep the widths again) after any layout or typography change in
 * SubnetTool, and keep the pin list in ascending `min-[Npx]` order.
 */
function SubnetToolSkeleton() {
  return (
    <div
      aria-hidden="true"
      data-testid="subnet-tool-skeleton"
      className="h-[868px] min-[331px]:h-[844px] min-[446px]:h-[820px] min-[640px]:h-[566px] min-[658px]:h-[542px] min-[1024px]:h-[317px] animate-pulse rounded-md border border-border bg-secondary"
    />
  );
}

export function SubnetToolLoader() {
  return <SubnetTool />;
}
