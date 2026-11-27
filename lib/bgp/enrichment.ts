import { createCache, record, type DataResult, type Transport } from "./transport";

export type Registration = { registry: string | null; block: string | null };

function field(value: unknown, maxLength: number) {
  return typeof value === "string" && value.length <= maxLength ? value.trim() || null : null;
}

function registrations(data: Record<string, unknown>): Registration[] {
  if (!Array.isArray(data.rirs) || data.rirs.length > 10_000) throw new Error("Invalid registry records");
  const entries = new Map<string, Registration>();
  for (const item of data.rirs) {
    const row = record(item);
    const registry = field(row.rir, 128);
    const block = field(row.resource, 128);
    if (registry || block) entries.set(JSON.stringify([registry, block]), { registry, block });
  }
  return [...entries.values()];
}

export function createEnrichment(transport: Transport) {
  const holders = createCache<string | null>();
  const registry = createCache<Registration[]>();

  async function holder(asn: string, signal: AbortSignal): Promise<DataResult<string | null>> {
    const cached = holders.get(asn);
    if (cached) return { kind: "success", value: cached.value, cached: true };
    if (!/^\d{1,10}$/.test(asn) || Number(asn) > 4_294_967_295) return { kind: "failure" };
    const response = await transport.request("holder", `AS${asn}`, signal);
    if (response.kind !== "success") return response;
    if (String(response.data.resource).replace(/^AS/i, "") !== asn) return { kind: "failure" };
    const value = field(response.data.holder, 512);
    holders.set(asn, value);
    return { kind: "success", value, cached: false };
  }

  async function registration(prefix: string, signal: AbortSignal): Promise<DataResult<Registration[]>> {
    const cached = registry.get(prefix);
    if (cached) return { kind: "success", value: cached.value, cached: true };
    const response = await transport.request("registration", prefix, signal);
    if (response.kind !== "success") return response;
    try {
      if (response.data.resource !== prefix) return { kind: "failure" };
      const value = registrations(response.data);
      registry.set(prefix, value);
      return { kind: "success", value, cached: false };
    } catch {
      return { kind: "failure" };
    }
  }

  return { holder, registration };
}

export type Enrichment = ReturnType<typeof createEnrichment>;
