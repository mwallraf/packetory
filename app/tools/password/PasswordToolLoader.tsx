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
 * Text-free placeholder for the island (D-16, D-17). Heights match the
 * default Password layout at the viewport widths covered by the layout test.
 * The mode and range controls share a row from 768px, and the output and its
 * actions share a row from 640px.
 */
function PasswordToolSkeleton() {
  return (
    <div
      aria-hidden="true"
      data-testid="password-skeleton"
      className="flex flex-col gap-4 h-[1202px] min-[375px]:h-[1150px] min-[412px]:h-[1087px] min-[640px]:h-[788px] min-[768px]:h-[716px] min-[1024px]:h-[641px]"
    >
      <div className="flex flex-col gap-2 md:flex-row md:gap-6">
        <div className="h-11 w-48 rounded-lg bg-secondary" />
        <div className="h-[88px] rounded-lg bg-secondary sm:h-11 md:flex-1" />
      </div>
      <div className="h-[98px] animate-pulse rounded-md border border-border bg-secondary sm:h-[62px] motion-reduce:animate-none" />
    </div>
  );
}

export function PasswordToolLoader() {
  return <PasswordTool />;
}
