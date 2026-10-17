"use client";

import dynamic from "next/dynamic";

const ConfigTool = dynamic(
  () => import("./ConfigTool").then((mod) => mod.ConfigTool),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden="true"
        data-testid="config-tool-skeleton"
        className="h-[520px] animate-pulse rounded-md border border-border bg-secondary"
      />
    ),
  }
);

export function ConfigToolLoader() {
  return <ConfigTool />;
}
