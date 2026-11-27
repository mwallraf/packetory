import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Enrichment, Registration } from "@/lib/bgp/enrichment";
import type { DataResult } from "@/lib/bgp/transport";

export function AddressRegistration({ prefix, enrichment }: { prefix: string; enrichment: Enrichment }) {
  const summary = useRef<HTMLElement>(null);
  const request = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DataResult<Registration[]>>();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (!cooldown) return;
    let timer: ReturnType<typeof setTimeout>;
    function schedule() {
      const remaining = cooldown - Date.now();
      if (remaining <= 0) setCooldown(0);
      else timer = setTimeout(schedule, Math.min(remaining, 2_147_483_647));
    }
    timer = setTimeout(schedule, Math.min(Math.max(0, cooldown - Date.now()), 2_147_483_647));
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function load() {
    if (request.current || cooldown > Date.now()) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    try {
      const outcome = await enrichment.registration(prefix, controller.signal);
      if (controller.signal.aborted) return;
      if (outcome.kind === "limited") setCooldown(outcome.until);
      setResult(outcome);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
      request.current = null;
    }
  }

  const entries = result?.kind === "success" ? result.value : [];
  const failure = result?.kind === "failure" || result?.kind === "limited";
  const message = loading ? "Looking up address registration…"
    : cooldown ? "RIPEstat is limiting requests. Try again when the cooldown ends."
    : failure ? "Couldn’t load address registration from RIPEstat."
    : entries.length ? "Address registration available."
    : result ? "No registration details returned for this prefix." : "";

  return (
    <details className="mt-4 border-t pt-3" onToggle={(event) => {
      if (event.currentTarget.open && !result) void load();
    }}>
      <summary ref={summary} className="cursor-pointer font-medium">Address registration</summary>
      <p role="status" className={entries.length ? "sr-only" : "mt-2 text-sm"}>{message}</p>
      {entries.length > 0 && (
        <ul className="mt-3 space-y-3">
          {entries.map(({ registry, block }) => (
            <li key={JSON.stringify([registry, block])}>
              <dl className="grid gap-1 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-4 [&_dd]:[overflow-wrap:anywhere]">
                <dt>Regional registry</dt><dd>{registry ?? "Unavailable"}</dd>
                <dt>Registered block</dt><dd className="font-mono">{block ?? "Unavailable"}</dd>
              </dl>
            </li>
          ))}
        </ul>
      )}
      {failure && !loading && (
        <Button type="button" size="sm" variant="outline" className="mt-2" aria-disabled={Boolean(cooldown)} onClick={() => {
          if (cooldown > Date.now()) return;
          summary.current?.focus();
          void load();
        }}>Retry registration lookup</Button>
      )}
    </details>
  );
}
