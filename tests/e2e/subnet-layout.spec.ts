import { expect, test, type Page } from "@playwright/test";

/**
 * Phase 11 layout gate for SUBNET-08/09/10. Measurements are Chromium-only,
 * taken after the client island replaces the skeleton and `document.fonts.ready`
 * resolves. 1366x650 models a 1366x768 laptop minus browser chrome; 1280x600
 * is the stress size.
 */

const TOOL_SELECTOR = '[data-testid="subnet-tool"]';

type FieldTuple = readonly [key: string, label: string, value: string];

const IPV4_DEFAULT_FIELDS: readonly FieldTuple[] = [
  ["network", "Network address", "192.168.1.0"],
  ["broadcast", "Broadcast address", "192.168.1.255"],
  ["first-host", "First usable host", "192.168.1.1"],
  ["last-host", "Last usable host", "192.168.1.254"],
  ["host-count", "Usable host count", "254"],
  ["mask", "Subnet mask", "255.255.255.0"],
  ["wildcard", "Wildcard mask", "0.0.0.255"],
  ["binary", "Binary", "11000000.10101000.00000001.00000000"],
  ["reverse-dns", "Reverse DNS zone", "1.168.192.in-addr.arpa."],
];

const IPV6_64_FIELDS: readonly FieldTuple[] = [
  ["normalized-prefix", "Normalized prefix", "2001:db8::/64"],
  ["compressed", "Compressed", "2001:db8::"],
  ["expanded", "Expanded", "2001:db8:0:0:0:0:0:0"],
  ["first", "First address", "2001:db8::"],
  ["last", "Last address", "2001:db8::ffff:ffff:ffff:ffff"],
  ["address-count", "Address count", "18446744073709551616"],
  [
    "reverse-dns",
    "Reverse DNS zone",
    "0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa.",
  ],
];

const IPV6_SAMPLES = [
  "?cidr=2001%3Adb8%3A%3A%2F64",
  "?cidr=fd12%3A3456%3A789a%3Abcde%3A%3A%2F64",
] as const;

const NARROW_CASES: readonly (readonly [label: string, query: string])[] = [
  ["IPv4 /24 default", ""],
  ["IPv6 /64", IPV6_SAMPLES[0]],
  ["IPv6 /64 long", IPV6_SAMPLES[1]],
  ["IPv6 /32 with subdivision pills", "?cidr=2001%3Adb8%3A%3A%2F32"],
  ["IPv4 /32 single address", "?cidr=10.0.0.1%2F32"],
];

const GRID_SELECTOR =
  '[data-testid="subnet-ipv4-grid"], [data-testid="subnet-ipv6-grid"]';

async function gotoSettled(page: Page, query = "") {
  await page.goto(`/tools/subnet${query}`);
  await expect(page.getByTestId("subnet-tool")).toBeVisible();
  await expect(page.getByTestId("subnet-tool-skeleton")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}

async function measureLayout(page: Page) {
  return page.evaluate((toolSelector) => {
    const r = (n: number) => Math.round(n);
    const rect = (el: Element | null | undefined) =>
      el ? el.getBoundingClientRect() : null;
    const tool = document.querySelector(toolSelector);
    const header = document.querySelector("header");
    const h1 = document.querySelector("h1");
    const cidr = document.querySelector('[data-testid="subnet-cidr-input"]')
      ?.parentElement;
    const hero = document.querySelector('[data-testid="subnet-hero"]');
    const grid =
      document.querySelector('[data-testid="subnet-ipv4-grid"]') ??
      document.querySelector('[data-testid="subnet-ipv6-grid"]');
    return {
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      scrollY: r(window.scrollY),
      innerHeight: window.innerHeight,
      headerBottom: r(rect(header)?.bottom ?? -1),
      h1Top: r(rect(h1)?.top ?? -1),
      h1Bottom: r(rect(h1)?.bottom ?? -1),
      cidrTop: r(rect(cidr)?.top ?? -1),
      cidrBottom: r(rect(cidr)?.bottom ?? -1),
      heroTop: r(rect(hero)?.top ?? -1),
      heroBottom: r(rect(hero)?.bottom ?? -1),
      gridTop: r(rect(grid)?.top ?? -1),
      gridBottom: r(rect(grid)?.bottom ?? -1),
      toolBottom: r(rect(tool)?.bottom ?? -1),
      cardBottoms: grid
        ? Array.from(grid.children).map((c) => ({
            id: c.getAttribute("data-testid") ?? "",
            bottom: r(c.getBoundingClientRect().bottom),
          }))
        : [],
    };
  }, TOOL_SELECTOR);
}

test.describe("Subnet layout: full output without scrolling at laptop sizes (SUBNET-08, SUBNET-09)", () => {
  for (const [w, h] of [
    [1366, 650],
    [1280, 600],
  ] as const) {
    test(`IPv4 /24 default at ${w}x${h}: full output inside the viewport, page unscrolled (SUBNET-08)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: w, height: h });
      await gotoSettled(page);
      const m = await measureLayout(page);
      console.log(`[subnet-layout] ${JSON.stringify(m)}`);
      expect(m.scrollY).toBe(0);
      expect(m.cardBottoms).toHaveLength(9);
      expect(m.toolBottom, JSON.stringify(m)).toBeLessThanOrEqual(m.innerHeight);
      for (const card of m.cardBottoms) {
        expect(card.bottom, `${card.id} ${JSON.stringify(m)}`).toBeLessThanOrEqual(
          m.innerHeight,
        );
      }
    });
  }

  for (const sample of IPV6_SAMPLES) {
    test(`IPv6 ${sample} at 1366x650: full output inside the viewport, page unscrolled (SUBNET-09)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1366, height: 650 });
      await gotoSettled(page, sample);
      const m = await measureLayout(page);
      console.log(`[subnet-layout] ${sample} ${JSON.stringify(m)}`);
      expect(m.scrollY).toBe(0);
      expect(m.cardBottoms).toHaveLength(7);
      expect(m.toolBottom, JSON.stringify(m)).toBeLessThanOrEqual(m.innerHeight);
      for (const card of m.cardBottoms) {
        expect(card.bottom, `${card.id} ${JSON.stringify(m)}`).toBeLessThanOrEqual(
          m.innerHeight,
        );
      }

      // Informational only (SUBNET-09 names 1366x650): log the 1280x600 result.
      await page.setViewportSize({ width: 1280, height: 600 });
      await gotoSettled(page, sample);
      const small = await measureLayout(page);
      console.log(`[subnet-layout] ${sample} ${JSON.stringify(small)}`);
    });
  }
});

test.describe("Subnet compaction integrity (SUBNET-10)", () => {
  const CASES: readonly (readonly [string, string, readonly FieldTuple[]])[] = [
    ["IPv4 /24 default", "", IPV4_DEFAULT_FIELDS],
    ["IPv6 /64", IPV6_SAMPLES[0], IPV6_64_FIELDS],
  ];

  for (const [label, query, fields] of CASES) {
    test(`${label}: every field shown in order, untruncated, >=14px, unscaled and unclipped`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1366, height: 650 });
      await gotoSettled(page, query);

      const ids = await page
        .locator(GRID_SELECTOR)
        .first()
        .evaluate((grid) =>
          Array.from(grid.children).map((c) => c.getAttribute("data-testid")),
        );
      expect(ids).toEqual(fields.map(([k]) => "subnet-field-" + k));

      for (const [key, fieldLabel, value] of fields) {
        const card = page.getByTestId("subnet-field-" + key);
        await expect(card).toBeVisible();
        await expect(card.getByText(fieldLabel, { exact: true })).toBeVisible();
        await expect(page.getByTestId("subnet-field-" + key + "-value")).toHaveText(
          value,
        );
      }

      const failures = await page.evaluate((toolSelector) => {
        const out: string[] = [];
        const tool = document.querySelector<HTMLElement>(toolSelector);
        if (!tool) return ["no subnet-tool"];
        const badge = tool.querySelector('[data-testid="subnet-family-badge"]');
        const inBadge = (el: Element) => !!badge && badge.contains(el);
        const name = (el: Element) =>
          el.getAttribute("data-testid") ?? el.tagName.toLowerCase();

        // (a) value text is untruncated and inside its card
        for (const value of tool.querySelectorAll<HTMLElement>(
          '[data-testid^="subnet-field-"][data-testid$="-value"]',
        )) {
          const cs = getComputedStyle(value);
          if (value.scrollWidth > value.clientWidth + 1)
            out.push(`(a) ${name(value)} scrollWidth > clientWidth`);
          if (cs.textOverflow === "ellipsis")
            out.push(`(a) ${name(value)} text-overflow ellipsis`);
          const card = value.closest('[data-testid^="subnet-field-"]:not([data-testid$="-value"])');
          if (card) {
            const v = value.getBoundingClientRect();
            const c = card.getBoundingClientRect();
            if (
              v.left < c.left - 1 ||
              v.right > c.right + 1 ||
              v.top < c.top - 1 ||
              v.bottom > c.bottom + 1
            )
              out.push(`(a) ${name(value)} outside its card`);
          }
        }

        // (b) body text >= 14px (badge chip exempt per U-1; sr-only skipped)
        for (const el of tool.querySelectorAll<HTMLElement>("*")) {
          if (inBadge(el) || el.closest(".sr-only")) continue;
          const hasText = Array.from(el.childNodes).some(
            (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "",
          );
          if (!hasText) continue;
          const size = parseFloat(getComputedStyle(el).fontSize);
          if (size < 14) out.push(`(b) ${name(el)} font-size ${size}`);
        }
        const input = tool.querySelector<HTMLElement>('[data-testid="subnet-cidr-input"]');
        if (input) {
          const size = parseFloat(getComputedStyle(input).fontSize);
          if (size < 14) out.push(`(b) cidr input font-size ${size}`);
        }

        // (c) no internal scroll or clipping container around the output
        for (const el of tool.querySelectorAll<HTMLElement>("*")) {
          if (el instanceof HTMLInputElement || el.closest(".sr-only") || inBadge(el))
            continue;
          const cs = getComputedStyle(el);
          if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
            if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)
              out.push(`(c) ${name(el)} clips its content`);
          }
        }

        // (d) no transform, scale or zoom on the tool or any ancestor
        for (let el: Element | null = tool; el; el = el.parentElement) {
          const cs = getComputedStyle(el);
          if (cs.transform !== "none") out.push(`(d) ${name(el)} transform ${cs.transform}`);
          if (cs.scale !== "none" && cs.scale !== "") out.push(`(d) ${name(el)} scale ${cs.scale}`);
          const zoom = (cs as CSSStyleDeclaration & { zoom?: string }).zoom;
          if (zoom && zoom !== "1" && zoom !== "normal")
            out.push(`(d) ${name(el)} zoom ${zoom}`);
        }

        // (e) copy hit area >= 44x44
        for (const btn of tool.querySelectorAll<HTMLElement>(
          'button[data-testid^="subnet-copy-"]',
        )) {
          const b = btn.getBoundingClientRect();
          if (b.width < 44 || b.height < 44)
            out.push(`(e) ${name(btn)} is ${b.width}x${b.height}`);
        }

        // (f) visual reading order matches DOM order
        const grid = tool.querySelector(
          '[data-testid="subnet-ipv4-grid"], [data-testid="subnet-ipv6-grid"]',
        );
        const cards = grid ? Array.from(grid.children) : [];
        for (let i = 1; i < cards.length; i++) {
          const a = cards[i - 1].getBoundingClientRect();
          const b = cards[i].getBoundingClientRect();
          const nextRow = b.top > a.top + 1;
          const sameRowRight = Math.abs(b.top - a.top) <= 1 && b.left > a.left;
          if (!nextRow && !sameRowRight)
            out.push(`(f) ${name(cards[i])} is out of reading order after ${name(cards[i - 1])}`);
        }
        return out;
      }, TOOL_SELECTOR);
      expect(failures).toEqual([]);
    });

    test(`${label}: every copy control copies with visible confirmation and no scroll`, async ({
      page,
      context,
    }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.setViewportSize({ width: 1366, height: 650 });
      await gotoSettled(page, query);

      const keys = [...fields.map(([k]) => k), "hero"];
      for (const key of keys) {
        const button = page.getByTestId("subnet-copy-" + key);
        const before = await button.innerHTML();
        await button.click();
        await expect(page.getByTestId("subnet-copy-" + key + "-status")).toHaveText(
          "Copied!",
        );
        await expect(button).toHaveAttribute("aria-label", "Copied!");
        expect(await button.innerHTML()).not.toBe(before);
        const expected =
          key === "hero"
            ? await page.getByTestId("subnet-hero-value").textContent()
            : await page.getByTestId("subnet-field-" + key + "-value").textContent();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
      }
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });
  }

  test("clearing the CIDR input keeps all nine IPv4 fields and shows the validation note", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 650 });
    await gotoSettled(page);
    await page.getByTestId("subnet-cidr-input").fill("");
    await expect(page.getByTestId("subnet-validation-note")).toBeVisible();
    await expect(page.locator(GRID_SELECTOR).first().locator("> *")).toHaveCount(9);
    await expect(page.getByTestId("subnet-field-network-value")).toHaveText(
      "192.168.1.0",
    );
    await expect(page.getByTestId("subnet-field-binary-value")).toHaveText(
      "11000000.10101000.00000001.00000000",
    );
  });

  test("IPv4 /32 single address: equal-valued fields stay four cards, each with its own working copy control (SUBNET-10)", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.setViewportSize({ width: 1366, height: 650 });
    await gotoSettled(page, "?cidr=10.0.0.1%2F32");
    const EQUAL_KEYS = ["network", "broadcast", "first-host", "last-host"];

    await expect(page.locator(GRID_SELECTOR).first().locator("> *")).toHaveCount(9);

    const failures = await page.evaluate((keys) => {
      const out: string[] = [];
      const cards: Element[] = [];
      for (const key of keys) {
        const found = document.querySelectorAll(`[data-testid="subnet-field-${key}"]`);
        if (found.length !== 1) out.push(`${key}: ${found.length} cards`);
        const card = found[0];
        if (!card) continue;
        cards.push(card);
        const buttons = card.querySelectorAll('button[data-testid^="subnet-copy-"]');
        if (buttons.length !== 1) out.push(`${key}: ${buttons.length} copy buttons`);
        else if (buttons[0].getAttribute("data-testid") !== `subnet-copy-${key}`)
          out.push(`${key}: wrong copy button ${buttons[0].getAttribute("data-testid")}`);
      }
      for (let i = 0; i < cards.length; i++) {
        for (let j = 0; j < cards.length; j++) {
          if (i === j) continue;
          if (cards[i] === cards[j] || cards[i].contains(cards[j]))
            out.push(`cards ${keys[i]} and ${keys[j]} overlap in the DOM`);
        }
      }
      return out;
    }, EQUAL_KEYS);
    expect(failures).toEqual([]);

    for (const key of EQUAL_KEYS) {
      const button = page.getByTestId("subnet-copy-" + key);
      const status = page.getByTestId("subnet-copy-" + key + "-status");
      await expect(page.getByTestId("subnet-field-" + key + "-value")).toHaveText(
        "10.0.0.1",
      );
      await expect(status).not.toHaveText("Copied!");
      await page.evaluate(() => navigator.clipboard.writeText(""));
      const before = await button.innerHTML();
      await button.click();
      await expect(status).toHaveText("Copied!");
      await expect(button).toHaveAttribute("aria-label", "Copied!");
      expect(await button.innerHTML()).not.toBe(before);
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("10.0.0.1");
    }
  });
});

test.describe("Subnet narrow widths (SUBNET-10)", () => {
  for (const width of [320, 375]) {
    for (const [label, query] of NARROW_CASES) {
      test(`${label} at ${width}px: no horizontal overflow, About below the tool (SUBNET-10)`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 800 });
        await gotoSettled(page, query);

        const failures = await page.evaluate(
          ({ toolSelector, gridSelector, singleAddress }) => {
            const out: string[] = [];
            const tool = document.querySelector<HTMLElement>(toolSelector);
            if (!tool) return ["no subnet-tool"];
            if (document.documentElement.scrollWidth > window.innerWidth)
              out.push(
                `scrollWidth ${document.documentElement.scrollWidth} > innerWidth ${window.innerWidth}`,
              );
            for (const el of tool.querySelectorAll<HTMLElement>("*")) {
              if (el.closest(".sr-only")) continue;
              const right = el.getBoundingClientRect().right;
              if (right > window.innerWidth + 0.5)
                out.push(
                  `${el.getAttribute("data-testid") ?? el.tagName.toLowerCase()} right edge ${right}`,
                );
            }
            const about = document.querySelector('section[data-testid="about-tool"]');
            if (!about) out.push("no about-tool section");
            else {
              if (about.getBoundingClientRect().top < tool.getBoundingClientRect().bottom)
                out.push("About starts above the tool bottom");
              if (
                !(tool.compareDocumentPosition(about) & Node.DOCUMENT_POSITION_FOLLOWING)
              )
                out.push("About does not follow the tool in DOM order");
            }
            if (singleAddress) {
              if (!document.querySelector('[data-testid="subnet-boundary-note"]'))
                out.push("no boundary note");
              const grid = document.querySelector(gridSelector);
              if (!grid || grid.children.length !== 9) out.push("grid is not 9 cards");
            }
            return out;
          },
          {
            toolSelector: TOOL_SELECTOR,
            gridSelector: GRID_SELECTOR,
            singleAddress: label === "IPv4 /32 single address",
          },
        );
        expect(failures).toEqual([]);
      });
    }
  }
});
