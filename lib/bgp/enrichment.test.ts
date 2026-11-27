import { afterEach, expect, it, vi } from "vitest";
import { createEnrichment } from "./enrichment";
import { createTransport } from "./transport";

const prefix = "140.78.0.0/16";
const ok = (data: object) => Response.json({ status: "ok", data });
const signal = () => new AbortController().signal;

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("verifies holder identity and caches a missing holder", async () => {
  const fetcher = vi.fn()
    .mockImplementationOnce(async () => ok({ resource: "AS1206", holder: "Other holder" }))
    .mockImplementation(async () => ok({ resource: "1205", holder: null }));
  vi.stubGlobal("fetch", fetcher);
  const client = createEnrichment(createTransport());
  expect(await client.holder("1205", signal())).toEqual({ kind: "failure" });
  expect(await client.holder("1205", signal())).toMatchObject({ value: null, cached: false });
  expect(await client.holder("1205", signal())).toMatchObject({ value: null, cached: true });
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("keeps registry records paired, preserves partial data and reuses results", async () => {
  const fetcher = vi.fn(async () => ok({ resource: prefix, rirs: [
    { rir: "RIPE NCC", resource: "140.0.0.0/8" },
    { rir: "RIPE NCC", resource: "140.0.0.0/8" },
    { resource: "140.78.1.0/24" },
  ] }));
  vi.stubGlobal("fetch", fetcher);
  const client = createEnrichment(createTransport());
  expect(await client.registration(prefix, signal())).toMatchObject({ value: [
    { registry: "RIPE NCC", block: "140.0.0.0/8" },
    { registry: null, block: "140.78.1.0/24" },
  ] });
  expect(await client.registration(prefix, signal())).toMatchObject({ cached: true });
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("prioritizes route work and removes obsolete queued enrichment", async () => {
  const responses: ((value: Response) => void)[] = [];
  const order: string[] = [];
  vi.stubGlobal("fetch", vi.fn((url: URL) => {
    order.push(url.searchParams.get("resource") ?? "");
    return new Promise<Response>((resolve) => responses.push(resolve));
  }));
  const transport = createTransport();
  const first = transport.request("holder", "AS1");
  const obsolete = new AbortController();
  const cancelled = transport.request("holder", "AS2", obsolete.signal);
  const registration = transport.request("registration", prefix);
  const route = transport.request("route", "8.8.8.8");
  obsolete.abort();
  expect(await cancelled).toEqual({ kind: "failure" });
  expect(order).toEqual(["AS1"]);
  responses.shift()?.(ok({}));
  await first;
  await vi.waitFor(() => expect(order).toEqual(["AS1", "8.8.8.8"]));
  responses.shift()?.(ok({}));
  await route;
  await vi.waitFor(() => expect(order).toEqual(["AS1", "8.8.8.8", prefix]));
  responses.shift()?.(ok({}));
  await registration;
});

it("shares 429 cooldown across endpoints and drains queued work without requests", async () => {
  const now = vi.spyOn(Date, "now").mockReturnValue(1_000);
  const fetcher = vi.fn()
    .mockResolvedValueOnce(new Response(null, { status: 429, headers: { "Retry-After": "5" } }))
    .mockImplementation(async () => ok({}));
  vi.stubGlobal("fetch", fetcher);
  const transport = createTransport();
  const holder = transport.request("holder", "AS1");
  const registration = transport.request("registration", prefix);
  expect(await holder).toEqual({ kind: "limited", until: 6_000 });
  expect(await registration).toEqual({ kind: "limited", until: 6_000 });
  expect(await transport.request("route", "8.8.8.8")).toEqual({ kind: "limited", until: 6_000 });
  expect(fetcher).toHaveBeenCalledTimes(1);
  now.mockReturnValue(6_000);
  expect(await transport.request("route", "8.8.8.8")).toMatchObject({ kind: "success" });
});
