import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HashSmoke } from "./HashSmoke";

/**
 * Test-only harness for the Phase 8 production worker proof (HASH-04).
 * Returns a 404 in any build made without `HASH_SMOKE=1`. NEVER set
 * `HASH_SMOKE` in Vercel. This route is deleted and replaced by
 * `/tools/hash` in Phase 9; it is deliberately absent from
 * `tools/registry.ts`, `app/sitemap.ts`, and all navigation.
 */
export const metadata: Metadata = {
  title: "Hash worker smoke harness",
  robots: { index: false, follow: false },
};

export default function HashSmokePage() {
  if (process.env.HASH_SMOKE !== "1") notFound();
  return <HashSmoke />;
}
