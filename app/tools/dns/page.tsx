import { DnsToolLoader } from "./DnsToolLoader";

/**
 * /tools/dns — Server Component shell (04-01 walking skeleton). Renders the
 * page chrome and the one dynamic subtree (`DnsToolLoader`, which never
 * server-renders — see `DnsToolLoader.tsx`). This component takes no props
 * and reads no request-time query-string API here, so the route stays
 * statically prerendered. Metadata, worked example, and FAQ (mirroring
 * `app/tools/subnet/page.tsx`'s full shape) land in 04-03 — this plan's
 * scope is the end-to-end interactive skeleton only.
 */
export default function DnsPage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-[32px] leading-[1.2] font-semibold text-foreground">
          DNS Lookup
        </h1>
        <div className="mt-8">
          <DnsToolLoader />
        </div>
      </main>
    </div>
  );
}
