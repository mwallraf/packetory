import { SubnetToolLoader } from "./SubnetToolLoader";

/**
 * /tools/subnet — Server Component shell (03-01 IPv4 walking skeleton).
 * Mirrors `app/tools/uuid/page.tsx`'s structure: plain page chrome plus the
 * one dynamic subtree (`SubnetToolLoader`), which never server-renders
 * (RESEARCH.md Pattern 1). This component takes no props and reads no
 * request-time query-string API here, so the route stays statically
 * prerendered. Metadata/FAQ/JSON-LD arrive in a later
 * plan in this phase, matching how Phase 2 layered those onto the UUID
 * page across multiple plans.
 */
export default function SubnetPage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-[32px] leading-[1.2] font-semibold text-foreground">
          IP Subnet Calculator
        </h1>
        <div className="mt-8">
          <SubnetToolLoader />
        </div>
      </main>
    </div>
  );
}
