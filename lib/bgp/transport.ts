const endpoints = {
  route: "https://stat.ripe.net/data/looking-glass/data.json",
  holder: "https://stat.ripe.net/data/as-overview/data.json",
  registration: "https://stat.ripe.net/data/rir/data.json",
} as const;

export const LOOKUP_ENDPOINT = endpoints.route;
export const CACHE_MS = 30_000;

type Endpoint = keyof typeof endpoints;
type Failure = { kind: "failure" } | { kind: "limited"; until: number };
export type DataResult<T> = { kind: "success"; value: T; cached: boolean } | Failure;
type ResponseResult = { kind: "success"; data: Record<string, unknown> } | Failure;

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid response object");
  }
  return value as Record<string, unknown>;
}

function retryDelay(header: string | null, now: number) {
  if (!header) return CACHE_MS;
  if (/^\d+$/.test(header)) {
    const delay = Number(header) * 1000;
    return Number.isSafeInteger(now + delay) ? delay : CACHE_MS;
  }
  const deadline = Date.parse(header);
  return Number.isFinite(deadline) && deadline >= now ? deadline - now : CACHE_MS;
}

type Job = {
  run: () => Promise<ResponseResult>;
  finish: (result: ResponseResult) => void;
};

export function createTransport() {
  let active = false;
  let cooldownUntil = 0;
  const queue: Job[] = [];

  function next() {
    if (active) return;
    const job = queue.shift();
    if (!job) return;
    active = true;
    void job.run().then(job.finish).finally(() => {
      active = false;
      next();
    });
  }

  async function fetchData(endpoint: Endpoint, resource: string, signal?: AbortSignal): Promise<ResponseResult> {
    if (signal?.aborted) return { kind: "failure" };
    if (Date.now() < cooldownUntil) return { kind: "limited", until: cooldownUntil };
    try {
      const url = new URL(endpoints[endpoint]);
      url.searchParams.set("resource", resource);
      if (endpoint === "registration") url.searchParams.set("lod", "2");
      const timeout = AbortSignal.timeout(10_000);
      const response = await fetch(url, {
        credentials: "omit", redirect: "error", referrerPolicy: "no-referrer", cache: "no-store",
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
      if (response.status === 429) {
        const now = Date.now();
        cooldownUntil = now + retryDelay(response.headers.get("Retry-After"), now);
        return { kind: "limited", until: cooldownUntil };
      }
      if (!response.ok) return { kind: "failure" };
      const body = await response.text();
      if (body.length > 5_000_000) return { kind: "failure" };
      const envelope = record(JSON.parse(body));
      if (envelope.status !== "ok") return { kind: "failure" };
      return { kind: "success", data: record(envelope.data) };
    } catch {
      return { kind: "failure" };
    }
  }

  return {
    request(endpoint: Endpoint, resource: string, signal?: AbortSignal): Promise<ResponseResult> {
      if (signal?.aborted || queue.length >= 32) return Promise.resolve({ kind: "failure" });
      return new Promise((resolve) => {
        const abort = () => {
          const index = queue.indexOf(job);
          if (index < 0) return;
          queue.splice(index, 1);
          job.finish({ kind: "failure" });
        };
        const job: Job = {
          run: () => fetchData(endpoint, resource, signal),
          finish: (result) => {
            signal?.removeEventListener("abort", abort);
            resolve(result);
          },
        };
        signal?.addEventListener("abort", abort, { once: true });
        if (endpoint === "route") queue.unshift(job);
        else queue.push(job);
        next();
      });
    },
  };
}

export type Transport = ReturnType<typeof createTransport>;

export function createCache<T>() {
  const entries = new Map<string, { value: T; expires: number }>();
  return {
    get(key: string) {
      const entry = entries.get(key);
      if (entry && entry.expires > Date.now()) return entry;
      entries.delete(key);
    },
    set(key: string, value: T) {
      entries.set(key, { value, expires: Date.now() + CACHE_MS });
      if (entries.size > 16) {
        const oldest = entries.keys().next();
        if (!oldest.done) entries.delete(oldest.value);
      }
    },
  };
}
