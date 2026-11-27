import { DEFAULT_NONPUBLIC_CIDRS } from "./nonpublic";
import { computeIpv4 } from "@/lib/subnet/ipv4";
import { computeIpv6 } from "@/lib/subnet/ipv6";
import { isParseError, parseCidr, type ParsedCidr } from "@/lib/subnet/parse";

export const LOOKUP_ENDPOINT = "https://stat.ripe.net/data/looking-glass/data.json";
const CACHE_MS = 30_000;

function networkOf({ address, family, prefixLength }: ParsedCidr) {
  const shift = BigInt((family === "ipv4" ? 32 : 128) - prefixLength);
  return (address >> shift) << shift;
}

function contains(range: ParsedCidr, target: ParsedCidr) {
  return range.family === target.family && range.prefixLength <= target.prefixLength &&
    networkOf(range) === networkOf({ ...target, prefixLength: range.prefixLength });
}

const nonpublic = DEFAULT_NONPUBLIC_CIDRS.map(parseCidr).filter((entry): entry is ParsedCidr => !isParseError(entry));

function bounds(parsed: ParsedCidr) {
  if (parsed.family === "ipv4") {
    const { network, broadcast } = computeIpv4(parsed);
    return { first: network, last: broadcast };
  }
  const { firstAddress, lastAddress } = computeIpv6(parsed);
  return { first: firstAddress, last: lastAddress };
}

export function parseLookup(value: string) {
  const input = value.trim();
  if (!input || input.length > 64) return null;
  const exact = input.includes("/");
  const parsed = parseCidr(exact ? input : `${input}/${input.includes(":") ? 128 : 32}`);
  if (isParseError(parsed) || nonpublic.some((range) => contains(range, parsed))) return null;
  const { first } = bounds(parsed);
  return { exact, parsed, resource: exact ? `${first}/${parsed.prefixLength}` : first };
}

type Query = NonNullable<ReturnType<typeof parseLookup>>;

type Peer = {
  path: string[];
  origin: string;
  address: string | null;
  nextHop: string | null;
  changed: string | null;
  confirmed: string | null;
};

type Collector = { id: string; location: string; peers: Peer[] };
export type Match = { prefix: string; first: string; last: string; origins: string[]; collectors: Collector[] };
type Snapshot = { observed: string | null; matches: Match[] };
type CacheEntry = { snapshot: Snapshot; expires: number };
export type LookupResult =
  | { kind: "success"; snapshot: Snapshot; cached: boolean }
  | { kind: "failure" }
  | { kind: "busy" }
  | { kind: "limited"; until: number };

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid response object");
  return value as Record<string, unknown>;
}

function rows(value: unknown, limit: number): unknown[] {
  if (!Array.isArray(value) || value.length > limit) throw new Error("Invalid response list");
  return value;
}

function text(value: unknown, limit: number) {
  return typeof value === "string" && value.length <= limit && value.trim() ? value.trim() : null;
}

function timestamp(value: unknown) {
  const raw = text(value, 40);
  if (!raw || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)?$/.test(raw)) return null;
  const date = new Date(/[Z+-]/.test(raw.slice(10)) ? raw : `${raw}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function asn(value: unknown) {
  const raw = typeof value === "number" ? String(value) : text(value, 10);
  return raw && /^\d{1,10}$/.test(raw) && Number(raw) <= 4_294_967_295 ? String(Number(raw)) : null;
}

function normalize(payload: unknown, query: Query): Snapshot {
  const envelope = record(payload);
  if (envelope.status !== "ok") throw new Error("RIPEstat lookup failed");
  const data = record(envelope.data);
  const matches = new Map<string, { first: string; last: string; origins: Set<string>; collectors: Map<string, Collector> }>();
  let observations = 0;
  for (const item of rows(data.rrcs, 128)) {
    const collector = record(item);
    const id = text(collector.rrc, 32);
    if (!id) throw new Error("Invalid collector");
    const location = text(collector.location, 128) ?? id;
    for (const item of rows(collector.peers, 4_096)) {
      if (++observations > 10_000) throw new Error("Too many observations");
      const peer = record(item);
      const prefix = parseCidr(text(peer.prefix, 64) ?? "");
      const origin = asn(peer.asn_origin);
      const path = text(peer.as_path, 4096)?.split(/\s+/);
      if (isParseError(prefix) || !origin || !path) throw new Error("Invalid peer observation");
      const matchesQuery = query.exact
        ? prefix.prefixLength === query.parsed.prefixLength && contains(prefix, query.parsed)
        : contains(prefix, query.parsed);
      if (!matchesQuery) continue;
      const { first, last } = bounds(prefix);
      const key = `${first}/${prefix.prefixLength}`;
      let match = matches.get(key);
      if (!match) {
        match = { first, last, origins: new Set(), collectors: new Map() };
        matches.set(key, match);
      }
      match.origins.add(origin);
      let group = match.collectors.get(id);
      if (!group) {
        group = { id, location, peers: [] };
        match.collectors.set(id, group);
      }
      group.peers.push({
        path, origin, address: text(peer.peer, 64), nextHop: text(peer.next_hop, 64),
        changed: timestamp(peer.last_updated), confirmed: timestamp(peer.latest_time ?? peer.lastest_time),
      });
    }
  }
  return {
    observed: timestamp(data.latest_time),
    matches: Array.from(matches, ([prefix, match]) => ({
      prefix, first: match.first, last: match.last,
      origins: [...match.origins], collectors: [...match.collectors.values()],
    })),
  };
}

function retryDelay(header: string | null, now: number) {
  if (!header) return CACHE_MS;
  if (/^\d+$/.test(header)) {
    const delay = Number(header) * 1000;
    return Number.isSafeInteger(delay) ? delay : CACHE_MS;
  }
  const deadline = Date.parse(header);
  return Number.isFinite(deadline) && deadline >= now ? deadline - now : CACHE_MS;
}

export function createLookupClient() {
  let pending = false;
  let cooldownUntil = 0;
  const cache = new Map<string, CacheEntry>();

  async function lookup(query: Query): Promise<LookupResult> {
    const now = Date.now();
    if (pending) return { kind: "busy" };
    const key = query.resource;
    const entry = cache.get(key);
    if (entry && entry.expires > now) return { kind: "success", snapshot: entry.snapshot, cached: true };
    cache.delete(key);
    if (now < cooldownUntil) return { kind: "limited", until: cooldownUntil };

    pending = true;
    try {
      const url = new URL(LOOKUP_ENDPOINT);
      url.searchParams.set("resource", key);
      const response = await fetch(url, {
        credentials: "omit", redirect: "error", referrerPolicy: "no-referrer",
        cache: "no-store", signal: AbortSignal.timeout(10_000),
      });
      if (response.status === 429) {
        const received = Date.now();
        cooldownUntil = received + retryDelay(response.headers.get("Retry-After"), received);
        return { kind: "limited", until: cooldownUntil };
      }
      if (!response.ok) return { kind: "failure" };
      const body = await response.text();
      if (body.length > 5_000_000) return { kind: "failure" };
      const snapshot = normalize(JSON.parse(body), query);
      cache.set(key, { snapshot, expires: Date.now() + CACHE_MS });
      if (cache.size > 16) {
        const oldest = cache.keys().next();
        if (!oldest.done) cache.delete(oldest.value);
      }
      return { kind: "success", snapshot, cached: false };
    } catch {
      return { kind: "failure" };
    } finally {
      pending = false;
    }
  }

  return { lookup };
}
