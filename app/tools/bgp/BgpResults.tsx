import { Button } from "@/components/ui/button";
import type { Match } from "@/lib/bgp/lookup";

function time(value: string | null) {
  return value ? `${value.replace("T", " ").slice(0, 19)} UTC` : "Unavailable";
}

export function BgpResults({ matches, observed, cached, onCopy }: {
  matches: Match[];
  observed: string | null;
  cached: boolean;
  onCopy: (path: string[]) => Promise<void>;
}) {
  return (
    <div className="space-y-6">
      {matches.map((match) => (
        <section key={match.prefix} className="min-w-0 rounded-xl border bg-card p-4 sm:p-6">
          <h2 className="text-xl font-semibold">Route summary</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr] [&_dd]:min-w-0 [&_dd]:font-mono [&_dd]:[overflow-wrap:anywhere]">
            <dt>Matched prefix</dt><dd>{match.prefix}</dd>
            <dt>Address range</dt><dd>{match.first} – {match.last}</dd>
            <dt>Origin ASNs</dt><dd>{match.origins.map((origin) => `AS${origin}`).join(", ")}</dd>
            <dt>Observed by</dt><dd>{match.collectors.length} RIPE RIS collectors</dd>
            <dt>Data as of</dt><dd>{time(observed)}{cached && " (cached)"}</dd>
          </dl>
          <h3 className="mt-6 text-xl font-semibold">AS paths by collector</h3>
          {match.collectors.map((collector) => (
            <details key={collector.id} className="mt-3 border-t pt-3">
              <summary className="cursor-pointer [overflow-wrap:anywhere]">
                <span className="font-medium">{collector.location} · {collector.id}</span>
                <code className="ml-2 text-sm">{collector.peers[0].path.join(" → ")}</code>
              </summary>
              <ul className="mt-3 space-y-3">
                {collector.peers.map((peer, index) => (
                  <li key={index} className="border-l pl-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="min-w-0 [overflow-wrap:anywhere]">{peer.path.join(" → ")}</code>
                      <Button size="sm" variant="outline" onClick={() => void onCopy(peer.path)}>Copy AS path</Button>
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer">Peer details</summary>
                      <dl className="mt-2 grid gap-1 sm:grid-cols-[auto_1fr] sm:gap-x-4 [&_dd]:font-mono [&_dd]:[overflow-wrap:anywhere]">
                        <dt>Peer IP</dt><dd>{peer.address ?? "Unavailable"}</dd>
                        <dt>Next hop</dt><dd>{peer.nextHop ?? "Unavailable"}</dd>
                        <dt>Last changed</dt><dd>{time(peer.changed)}</dd>
                        <dt>Last confirmed</dt><dd>{time(peer.confirmed)}</dd>
                      </dl>
                    </details>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </section>
      ))}
    </div>
  );
}
