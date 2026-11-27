import { expect, test, type Page } from "@playwright/test";

const prefix = "140.78.0.0/16";
const base = "https://stat.ripe.net/data/";
const holderEndpoint = `${base}as-overview/data.json?**`;
const rirEndpoint = `${base}rir/data.json?**`;
const routeEndpoint = `${base}looking-glass/data.json?**`;
const ok = (data: object) => ({ status: "ok", data });

async function submit(page: Page, resource = prefix) {
  const field = page.getByLabel("Public IP address or CIDR prefix");
  await field.fill(resource);
  await field.press("Enter");
}

async function routes(page: Page, origins = ["1205"]) {
  await page.route(routeEndpoint, (route) => {
    const resource = new URL(route.request().url()).searchParams.get("resource");
    return route.fulfill({ json: ok({ rrcs: [{ rrc: "RRC00", location: "Amsterdam", peers: origins.map((origin) => ({
      prefix: resource, asn_origin: origin, as_path: `1853 ${origin}`,
    })) }] }) });
  });
}

test("tracer renders routes and opens collector paths before the holder resolves", async ({ page }) => {
  await routes(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route(holderEndpoint, async (route) => {
    await pending;
    await route.fulfill({ json: ok({ resource: "AS1205", holder: "University Linz" }) });
  });
  let registrationCalls = 0;
  await page.route(rirEndpoint, (route) => {
    registrationCalls++;
    return route.fulfill({ json: ok({ resource: prefix, rirs: [] }) });
  });
  await page.goto("/tools/bgp");
  await submit(page);
  try {
    await expect(page.getByText("AS1205", { exact: true })).toBeVisible();
    await expect(page.getByText("Looking up holder…")).toBeVisible();
    await page.getByText("Amsterdam · RRC00").click();
    await expect(page.getByRole("button", { name: "Copy AS path" })).toBeVisible();
    expect(registrationCalls).toBe(0);
  } finally {
    release();
  }
  await expect(page.getByText("University Linz", { exact: true })).toBeVisible();
});

test("associates multiple holders and lazily loads distinct partial registry records", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await routes(page, ["1205", "1206", "1207"]);
  const longHolder = "University".repeat(20);
  await page.route(holderEndpoint, (route) => {
    const resource = new URL(route.request().url()).searchParams.get("resource");
    if (resource === "AS1207") return route.fulfill({ status: 500 });
    return route.fulfill({ json: ok({ resource, holder: resource === "AS1205" ? longHolder : null }) });
  });
  let registrationCalls = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route(rirEndpoint, async (route) => {
    registrationCalls++;
    expect(new URL(route.request().url()).searchParams.get("lod")).toBe("2");
    await pending;
    await route.fulfill({ json: ok({ resource: prefix, rirs: [
      { rir: "RIPE NCC", resource: "140.0.0.0/8" }, { resource: "140.78.1.0/24" },
    ] }) });
  });
  await page.goto("/tools/bgp");
  await submit(page);
  await expect(page.getByText(longHolder)).toBeVisible();
  await expect(page.getByText("Holder unavailable")).toBeVisible();
  await expect(page.getByText("Couldn’t load holder")).toBeVisible();
  expect(registrationCalls).toBe(0);
  const disclosure = page.getByText("Address registration", { exact: true });
  await disclosure.focus();
  await page.keyboard.press("Enter");
  try {
    await expect(page.getByText("Looking up address registration…")).toBeVisible();
    await disclosure.click();
    await disclosure.click();
    expect(registrationCalls).toBe(1);
  } finally {
    release();
  }
  await expect(page.getByText("140.0.0.0/8")).toBeVisible();
  await expect(page.getByText("140.78.1.0/24")).toBeVisible();
  await expect(page.getByText("Unavailable", { exact: true }).first()).toBeVisible();
  await disclosure.click();
  await disclosure.click();
  expect(registrationCalls).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test("retries registration manually after a shared cooldown and keeps routes usable", async ({ page }) => {
  await routes(page);
  await page.route(holderEndpoint, (route) => route.fulfill({ json: ok({ resource: "AS1205", holder: null }) }));
  let registrationCalls = 0;
  await page.route(rirEndpoint, (route) => {
    registrationCalls++;
    if (registrationCalls === 1) return route.fulfill({ status: 429, headers: {
      "Retry-After": "1", "Access-Control-Expose-Headers": "Retry-After",
    } });
    return route.fulfill({ json: ok({ resource: prefix, rirs: [] }) });
  });
  await page.goto("/tools/bgp");
  await submit(page);
  await page.getByText("Address registration", { exact: true }).click();
  await expect(page.getByText(/RIPEstat is limiting/)).toBeVisible();
  const retry = page.getByRole("button", { name: "Retry registration lookup" });
  await expect(retry).toBeDisabled();
  await expect(page.getByText("AS1205", { exact: true })).toBeVisible();
  await expect(retry).toBeEnabled();
  expect(registrationCalls).toBe(1);
  await retry.click();
  await expect(page.getByText("No registration details returned for this prefix.")).toBeVisible();
  expect(registrationCalls).toBe(2);
});

test("an obsolete enrichment response cannot populate a replacement lookup", async ({ page }) => {
  await routes(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route(holderEndpoint, (route) => route.fulfill({ json: ok({ resource: "AS1205", holder: null }) }));
  await page.route(rirEndpoint, async (route) => {
    await pending;
    return route.fulfill({ json: ok({ resource: prefix, rirs: [{ rir: "Old registry", resource: "140.0.0.0/8" }] }) })
      .catch(() => undefined);
  });
  await page.goto("/tools/bgp");
  await submit(page);
  await page.getByText("Address registration", { exact: true }).click();
  try {
    await expect(page.getByText("Looking up address registration…")).toBeVisible();
    await submit(page, "8.8.8.0/24");
    await expect(page.getByText("8.8.8.0/24", { exact: true })).toBeVisible();
  } finally {
    release();
  }
  await expect(page.getByText("Old registry")).toHaveCount(0);
  await expect(page.getByText("Address registration", { exact: true })).toHaveCount(1);
});

test("live RIPEstat holder and registration for the public example", async ({ page }) => {
  test.skip(process.env.BGP_LIVE_SMOKE !== "1", "Opt in to live RIPEstat enrichment");
  await page.goto("/tools/bgp");
  const route = page.waitForResponse((response) => response.url().startsWith(`${base}looking-glass/`));
  await submit(page);
  expect((await route).ok()).toBe(true);
  await expect(page.getByText(/JKU|Linz/i)).toBeVisible();
  const registration = page.waitForResponse((response) => response.url().startsWith(`${base}rir/`));
  await page.getByText("Address registration", { exact: true }).click();
  expect((await registration).ok()).toBe(true);
  await expect(page.getByText("Registered block", { exact: true }).first()).toBeVisible();
});
