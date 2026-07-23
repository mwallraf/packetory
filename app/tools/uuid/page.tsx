import type { Metadata } from "next";
import { UuidToolLoader } from "./UuidToolLoader";

export const metadata: Metadata = {
  title: "UUID Generator (v4 & v7) — Packetory",
};

/**
 * /tools/uuid — Server Component shell (UUID-01 thin slice). Renders the
 * page chrome and the one dynamic subtree (`UuidToolLoader`, which never
 * server-renders — see RESEARCH.md Pattern 1). Full metadata (description,
 * canonical, OG), worked example, and FAQ content land in Plan 02-03.
 */
export default function UuidPage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-[32px] leading-[1.2] font-semibold text-foreground">
          UUID Generator
        </h1>
        <div className="mt-8">
          <UuidToolLoader />
        </div>
      </main>
    </div>
  );
}
