"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLookupClient, parseLookup, type LookupResult } from "@/lib/bgp/lookup";
import { createEnrichment } from "@/lib/bgp/enrichment";
import { createTransport } from "@/lib/bgp/transport";
import { BgpResults } from "./BgpResults";
import { examplePrefix } from "./faq-data";

const transport = createTransport();
const client = createLookupClient(transport);
const enrichment = createEnrichment(transport);
const invalidMessage = "Enter a public IPv4 or IPv6 address or a CIDR prefix.";

export function BgpTool() {
  const input = useRef<HTMLInputElement>(null);
  const active = useRef(false);
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lookupId, setLookupId] = useState(0);
  const [result, setResult] = useState<LookupResult>();
  const [cooldown, setCooldown] = useState(0);
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    if (!cooldown) return;
    function schedule(): ReturnType<typeof setTimeout> {
      return setTimeout(() => {
        if (Date.now() >= cooldown) setCooldown(0);
        else timer = schedule();
      }, Math.min(Math.max(0, cooldown - Date.now()), 2_147_483_647));
    }
    let timer = schedule();
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current || cooldown > Date.now()) return;
    const query = parseLookup(value);
    setInvalid(!query);
    setResult(undefined);
    setLookupId((id) => id + 1);
    setCopyStatus("");
    if (!query) {
      input.current?.focus();
      return;
    }
    active.current = true;
    setLoading(true);
    try {
      const outcome = await client.lookup(query);
      if (outcome.kind === "limited") setCooldown(outcome.until);
      setResult(outcome);
    } finally {
      active.current = false;
      setLoading(false);
    }
  }

  async function copy(path: string[]) {
    try {
      await navigator.clipboard.writeText(path.join(" "));
      setCopyStatus("AS path copied");
    } catch {
      setCopyStatus("Couldn’t copy the AS path. Select and copy it manually.");
    }
  }

  const snapshot = result?.kind === "success" ? result.snapshot : undefined;
  const message = loading ? "Looking up routes…"
    : cooldown ? "RIPEstat is limiting requests. Try again when the cooldown ends."
    : result?.kind === "failure" || result?.kind === "busy" ? "Couldn’t load routes from RIPEstat. Try again."
    : snapshot?.matches.length ? "Route results available."
    : snapshot ? "No route observed" : "";

  return (
    <div className="space-y-4">
      <form noValidate onSubmit={submit} className="space-y-2">
        <Label htmlFor="bgp-resource">Public IP address or CIDR prefix</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input id="bgp-resource" ref={input} autoComplete="off" spellCheck={false}
            placeholder={examplePrefix} value={value} maxLength={64}
            readOnly={loading} aria-invalid={invalid} aria-describedby={invalid ? "bgp-error bgp-source" : "bgp-source"}
            onChange={(event) => { setValue(event.target.value); setInvalid(false); }} />
          <Button type="submit" aria-disabled={loading || Boolean(cooldown)}>Look up</Button>
        </div>
        {invalid && <p id="bgp-error" role="alert" className="text-sm text-destructive">{invalidMessage}</p>}
        <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => {
          setValue(examplePrefix);
          setInvalid(false);
          input.current?.focus();
        }}>Use example</Button>
      </form>
      <p className="text-sm text-muted-foreground" id="bgp-source">
        Routes observed by RIPE RIS. Your lookup is sent to RIPEstat.
      </p>
      <div role="status" className={snapshot?.matches.length ? "sr-only" : "space-y-1"}>
        {message && <p className="font-medium">{message}</p>}
        {snapshot && snapshot.matches.length === 0 && (
          <p>RIPE RIS returned no matching route. Check the address or try a different prefix.{result?.kind === "success" && result.cached && " (Cached result)"}</p>
        )}
      </div>
      {result?.kind === "success" && result.snapshot.matches.length > 0 && (
        <BgpResults key={lookupId} {...result.snapshot} cached={result.cached} onCopy={copy} enrichment={enrichment} />
      )}
      <p role="status" className={copyStatus ? "text-sm" : "sr-only"}>{copyStatus}</p>
    </div>
  );
}
