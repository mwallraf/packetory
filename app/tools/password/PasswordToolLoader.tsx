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
 * Text-free placeholder for the island (D-17). The heights are pre-measurement
 * estimates of the finished default island (h-[1000px] below sm, sm:h-[732px]
 * from sm up, with a 124px hero block); plan 13-06 measures the finished island
 * at 320px and 1280px and replaces them. It holds no text, digits or symbols.
 */
function PasswordToolSkeleton() {
  return (
    <div
      aria-hidden="true"
      data-testid="password-skeleton"
      className="flex flex-col gap-8 h-[1000px] sm:h-[732px]"
    >
      <div className="h-[124px] animate-pulse rounded-md border border-border bg-secondary motion-reduce:animate-none" />
    </div>
  );
}

export function PasswordToolLoader() {
  return <PasswordTool />;
}
