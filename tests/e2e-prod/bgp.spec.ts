import { expect, test } from "@playwright/test";

const endpoint = "https://stat.ripe.net/data/looking-glass/data.json?**";
const example = "140.78.0.0/16";

function fixture(prefix = example, path = "15692 1853 1853 1205") {
  return { status: "ok", data: { latest_time: "2026-11-27T15:51:42", rrcs: [{
    rrc: "RRC00", location: "Amsterdam, NL", peers: [{
      prefix, asn_origin: "1205", as_path: path, peer: "5.178.95.254",
      next_hop: "5.178.95.254", latest_time: "2026-11-27T15:51:45",
    }],
  }] } };
}

test("production tracer submits once and supports collector and peer disclosure", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "Clipboard permission setup targets Chromium");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const queries: string[] = [];
  await page.route(endpoint, (route) => {
    queries.push(new URL(route.request().url()).searchParams.get("resource") ?? "");
    return route.fulfill({ json: fixture() });
  });
  await page.goto("/tools/bgp");
  const input = page.getByLabel("Public IP address or CIDR prefix");
  await page.getByRole("button", { name: "Use example" }).click();
  await expect(input).toBeFocused();
  expect(queries).toEqual([]);
  await input.press("Enter");
  await expect(page.getByText("AS1205", { exact: true })).toBeVisible();
  await expect(page.getByText("140.78.0.0 – 140.78.255.255")).toBeVisible();
  await page.getByText("Amsterdam, NL · RRC00").click();
  await page.getByText("Peer details", { exact: true }).click();
  await expect(page.getByText("Unavailable", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Copy AS path" }).click();
  await expect(page.getByText("AS path copied")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("15692 1853 1853 1205");
  await input.press("Enter");
  await expect(page.getByText(/UTC \(cached\)/)).toBeVisible();
  expect(queries).toEqual([example]);
});

test("IPv6 and long paths fit, with invalid input, cooldown, failure and empty states", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  let calls = 0;
  await page.route(endpoint, (route) => {
    calls++;
    if (calls === 1) return route.fulfill({ status: 429, headers: { "Retry-After": "1", "Access-Control-Expose-Headers": "Retry-After" } });
    if (calls === 2) return route.fulfill({ status: 500 });
    if (calls === 3) return route.fulfill({ json: { status: "ok", data: { rrcs: [] } } });
    return route.fulfill({ json: fixture("2606:4700:4700::/48", "4294967295 ".repeat(120).trim()) });
  });
  await page.goto("/tools/bgp");
  const input = page.getByLabel("Public IP address or CIDR prefix");
  const submit = page.getByRole("button", { name: "Look up" });
  await input.fill("10.0.0.1");
  await input.press("Enter");
  await expect(page.getByRole("alert").filter({ hasText: /Enter a public/ })).toBeVisible();
  expect(calls).toBe(0);
  await input.fill("1.1.1.1");
  await input.press("Enter");
  await expect(page.getByText(/limiting requests/)).toBeVisible();
  await expect(submit).toBeDisabled();
  await expect(submit).toBeEnabled();
  await input.press("Enter");
  await expect(page.getByText(/Couldn’t load routes/)).toBeVisible();
  await input.press("Enter");
  await expect(page.getByText("No route observed", { exact: true })).toBeVisible();
  await input.fill("2606:4700:4700::1111");
  await input.press("Enter");
  await expect(page.getByText("2606:4700:4700::/48", { exact: true })).toBeVisible();
  await page.getByText("Amsterdam, NL · RRC00").click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test("holds a single in-flight request during repeated submits", async ({ page }) => {
  let calls = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route(endpoint, async (route) => {
    calls++;
    await pending;
    await route.fulfill({ json: fixture() });
  });
  await page.goto("/tools/bgp");
  const input = page.getByLabel("Public IP address or CIDR prefix");
  await input.fill(example);
  await input.press("Enter");
  try {
    await expect(page.getByText("Looking up routes…")).toBeVisible();
    await input.press("Enter");
    expect(calls).toBe(1);
  } finally {
    release();
  }
  await expect(page.getByText("AS1205", { exact: true })).toBeVisible();
});

test("live RIPEstat browser smoke for IPv4 and IPv6", async ({ page }) => {
  test.skip(process.env.BGP_LIVE_SMOKE !== "1", "Opt in to two live RIPEstat lookups");
  await page.goto("/tools/bgp");
  const field = page.getByLabel("Public IP address or CIDR prefix");
  for (const [query, prefix] of [[example, example], ["2606:4700:4700::1111", "2606:4700:4700::/48"]]) {
    await field.fill(query);
    const response = page.waitForResponse((item) =>
      item.url().startsWith("https://stat.ripe.net/data/looking-glass/data.json?")
    );
    await field.press("Enter");
    expect((await response).ok()).toBe(true);
    await expect(page.locator("dd").and(page.getByText(prefix, { exact: true }))).toBeVisible();
  }
});
