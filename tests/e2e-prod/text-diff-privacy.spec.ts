import { expect, test, type Page } from "@playwright/test";

const oldPixel = "/__text-diff-old-pixel-h91q";
const newPixel = "/__text-diff-new-pixel-j72k";
const oldTag = `<img src="${oldPixel}" alt="OLD Ω+ /payload">`;
const newTag = `<img src="${newPixel}" alt="NEW Ω+ /payload">`;
const oldChange = "RRRRRRRRRRRRRRRRRRR";
const newChange = "ZZZZZZZZZZZZZZZZZZZ";
const editMarker = "EDIT Δ+ /sentinel m92r";

function encodings(value: string): string[] {
  return [
    value,
    encodeURI(value),
    encodeURIComponent(value),
    new URLSearchParams([["probe", value]]).toString().slice("probe=".length),
    JSON.stringify(value).slice(1, -1),
    Buffer.from(value).toString("base64"),
    Buffer.from(value).toString("base64url"),
  ];
}

declare global {
  interface Window {
    __captureTextDiffSink: (sink: string, value: string) => Promise<void>;
  }
}

async function readPageStorage(page: Page) {
  return page.evaluate(async () => {
    const databases = [];
    for (const { name } of await indexedDB.databases()) {
      if (!name) continue;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(name);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        for (const store of Array.from(db.objectStoreNames)) {
          const contents = await new Promise<unknown[]>((resolve, reject) => {
            const request = db.transaction(store, "readonly").objectStore(store).getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          databases.push({ name, store, contents });
        }
      } finally {
        db.close();
      }
    }

    const cached = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        const response = await cache.match(request);
        cached.push({ name, url: request.url, body: await response?.text() });
      }
    }
    return {
      address: location.href,
      history: history.state,
      cookie: document.cookie,
      local: Object.entries(localStorage),
      session: Object.entries(sessionStorage),
      indexedDB: databases,
      cached,
    };
  });
}

test("keeps real comparison text out of production browser data exits", async ({ page, context }) => {
  const observed: { sink: string; value: string }[] = [];
  const captures: Promise<unknown>[] = [];
  const record = (sink: string, value: unknown) => {
    observed.push({ sink, value: typeof value === "string" ? value : (JSON.stringify(value) ?? "") });
  };
  context.on("request", (request) => {
    record("request URL", request.url());
    record("request payload", request.postDataBuffer()?.toString("utf8"));
    captures.push(request.allHeaders()
      .catch(() => request.headers())
      .then((headers) => record("request headers", headers)));
  });
  page.on("framenavigated", (frame) => record("frame URL", frame.url()));
  page.on("pageerror", (error) => record("page error", error.stack ?? error.message));
  page.on("console", (message) => {
    record("console message", message.text());
    for (const arg of message.args()) {
      captures.push(arg.jsonValue().then((value) => record("console value", value), () => undefined));
    }
  });
  await context.exposeBinding("__captureTextDiffSink", (_, sink: string, value: string) => record(sink, value));
  await context.addInitScript(() => {
    const report = (sink: string, value: unknown) => {
      try {
        void window.__captureTextDiffSink(sink, JSON.stringify(value) ?? "");
      } catch {
        // Browser-owned objects may be opaque to JSON. Network and persisted data
        // are also checked through Playwright and the storage snapshot.
      }
    };
    function observe<T extends object>(prototype: T, method: keyof T, sink: string) {
      const original = prototype[method];
      if (typeof original !== "function") return;
      Object.defineProperty(prototype, method, {
        value: function (this: unknown, ...args: unknown[]) {
          report(sink, args);
          return Reflect.apply(original, this, args);
        },
      });
    }
    observe(History.prototype, "pushState", "history push");
    observe(History.prototype, "replaceState", "history replace");
    observe(Storage.prototype, "setItem", "storage write");
    observe(IDBFactory.prototype, "open", "IndexedDB open");
    observe(IDBObjectStore.prototype, "add", "IndexedDB add");
    observe(IDBObjectStore.prototype, "put", "IndexedDB put");
    observe(CacheStorage.prototype, "open", "Cache Storage open");
    observe(Cache.prototype, "put", "cache write");
    observe(Cache.prototype, "add", "cache add");
    observe(Cache.prototype, "addAll", "cache addAll");
    observe(Navigator.prototype, "sendBeacon", "beacon");

    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
    if (cookie?.set) {
      Object.defineProperty(Document.prototype, "cookie", {
        ...cookie,
        set(value: string) {
          report("cookie write", value);
          cookie.set?.call(this, value);
        },
      });
    }
  });

  await page.goto("/tools/diff");
  const original = page.getByLabel("Original", { exact: true });
  const modified = page.getByLabel("Modified", { exact: true });
  await original.fill(`${oldTag}\nset code ${oldChange} for comparison`);
  await modified.fill(`${newTag}\nset code ${newChange} for comparison`);
  const [worker] = await Promise.all([
    page.waitForEvent("worker"),
    page.getByRole("button", { name: "Compare" }).click(),
  ]);
  expect(worker.url()).toContain("/_next/static/");
  const results = page.getByRole("region", { name: "Comparison results" });
  await expect(results).toContainText(oldTag);
  await expect(results).toContainText(newTag);
  await expect(results.locator("img")).toHaveCount(0);
  await expect(results.locator("del").filter({ hasText: new RegExp(`^${oldChange}$`) })).toHaveText(oldChange);
  await expect(results.locator("ins").filter({ hasText: new RegExp(`^${newChange}$`) })).toHaveText(newChange);
  record("persisted state with result visible", await readPageStorage(page));
  record("cookies with result visible", await context.cookies());

  await modified.fill(editMarker);
  await expect(page.getByRole("status")).toContainText("Out of date.");
  await expect(modified).toHaveValue(editMarker);
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(results).toHaveCount(0);
  await expect(original).toHaveValue("");
  await expect(modified).toHaveValue("");
  await page.goto("/");
  record("persisted state after navigation", await readPageStorage(page));
  record("cookies after navigation", await context.cookies());
  await Promise.all(captures);

  const markers = [oldPixel, newPixel, oldTag, newTag, oldChange, newChange, editMarker].flatMap(encodings);
  expect(observed.some(({ sink, value }) => sink === "request URL" && value.endsWith("/tools/diff"))).toBe(true);
  const exposed = observed.flatMap(({ sink, value }) => markers.some((marker) => value.includes(marker)) ? [sink] : []);
  expect(exposed, "No comparison marker should appear in a data exit").toEqual([]);
});
