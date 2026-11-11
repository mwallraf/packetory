import { expect, test, type Page } from "@playwright/test";

/** Reads every password currently on screen: the hero or every batch row. */
async function collectPasswords(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const rows = Array.from(
      document.querySelectorAll('[data-testid="password-row-value"]'),
    );
    if (rows.length > 0) {
      return rows.map((el) => el.textContent ?? "");
    }
    const hero = document.querySelector('[data-testid="password-output"]');
    return hero ? [hero.textContent ?? ""] : [];
  });
}

/** Asserts no password appears in `text`, raw or percent-encoded. */
function expectNoPasswordIn(
  text: string,
  passwords: string[],
  surface: string,
) {
  for (const p of passwords) {
    expect(p.length, "a password was recorded").toBeGreaterThan(0);
    expect(text.includes(p), `${surface} holds a password`).toBe(false);
    expect(
      text.includes(encodeURIComponent(p)),
      `${surface} holds an encoded password`,
    ).toBe(false);
  }
}

test.describe("Password privacy surfaces (POUT-03, POUT-05)", () => {
  test("no password reaches any exit surface", async ({ page, context }) => {
    const requests: { url: string; postData: string | null }[] = [];
    page.on("request", (req) => {
      requests.push({ url: req.url(), postData: req.postData() });
    });
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const seen: string[] = [];
    const record = async () => {
      seen.push(...(await collectPasswords(page)));
    };

    await page.goto("/tools/password");
    await expect(page.getByTestId("password-output")).toBeVisible();
    await record();

    await page.getByTestId("password-copy").click();
    await expect(page.getByTestId("password-copy")).toContainText("Copied!");

    const beforeRegen = seen[seen.length - 1];
    await page.getByTestId("password-regenerate").click();
    await expect
      .poll(async () => (await collectPasswords(page))[0])
      .not.toBe(beforeRegen);
    await record();

    await page.getByTestId("password-batch-count").fill("3");
    await expect(page.getByTestId("password-row")).toHaveCount(3);
    await record();

    await page.getByTestId("password-copy-all").click();
    await expect(page.getByTestId("password-copy-all")).toContainText(
      "Copied!",
    );

    await page.getByTestId("password-batch-count").fill("1");
    await expect(page.getByTestId("password-hero")).toBeVisible();
    await page.getByTestId("password-length").fill("32");
    await expect
      .poll(async () => ((await collectPasswords(page))[0] ?? "").length)
      .toBe(32);
    await record();

    expect(new Set(seen).size, "distinct passwords were recorded").toBeGreaterThan(
      3,
    );

    for (const req of requests) {
      expectNoPasswordIn(req.url, seen, `request URL ${req.url}`);
      if (req.postData) {
        expectNoPasswordIn(req.postData, seen, `request body of ${req.url}`);
      }
    }
    expectNoPasswordIn(page.url(), seen, "page.url()");

    const inPage = await page.evaluate(() => {
      const storage = (s: Storage) => {
        const out: string[] = [];
        for (let i = 0; i < s.length; i += 1) {
          const key = s.key(i);
          if (key === null) continue;
          out.push(key, s.getItem(key) ?? "");
        }
        return out.join("\n");
      };
      let historyState = "null";
      try {
        historyState = JSON.stringify(history.state ?? null);
      } catch {
        historyState = "unserializable";
      }
      return {
        historyState,
        local: storage(localStorage),
        session: storage(sessionStorage),
        cookie: document.cookie,
        title: document.title,
        href: location.href,
        hash: location.hash,
      };
    });
    expectNoPasswordIn(inPage.historyState, seen, "history.state");
    expectNoPasswordIn(inPage.local, seen, "localStorage");
    expectNoPasswordIn(inPage.session, seen, "sessionStorage");
    expectNoPasswordIn(inPage.cookie, seen, "document.cookie");
    expectNoPasswordIn(inPage.title, seen, "document.title");
    expectNoPasswordIn(inPage.href, seen, "location.href");
    expectNoPasswordIn(inPage.hash, seen, "location.hash");

    const cookies = await context.cookies();
    expectNoPasswordIn(
      cookies.map((c) => `${c.name}=${c.value}`).join("\n"),
      seen,
      "context cookies",
    );
  });

  test("no attribute, field value or form surface holds the password", async ({
    page,
  }) => {
    await page.goto("/tools/password?n=3");
    await expect(page.getByTestId("password-row")).toHaveCount(3);
    const values = await collectPasswords(page);
    expect(values).toHaveLength(3);

    const scan = await page.evaluate((passwords) => {
      const hits: string[] = [];
      document.querySelectorAll("*").forEach((el) => {
        for (const attr of Array.from(el.attributes)) {
          if (passwords.some((p) => attr.value.includes(p))) {
            hits.push(`${el.tagName.toLowerCase()}[${attr.name}]`);
          }
        }
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          if (passwords.some((p) => el.value.includes(p))) {
            hits.push(`${el.tagName.toLowerCase()}.value`);
          }
          if (passwords.some((p) => el.placeholder.includes(p))) {
            hits.push(`${el.tagName.toLowerCase()}.placeholder`);
          }
        }
      });
      const root = document.querySelector('[data-testid="password-tool"]');
      const forbidden = root
        ? root.querySelectorAll(
            "form, output, fieldset, textarea, input[type=password], [contenteditable]",
          ).length
        : -1;
      return { hits, forbidden };
    }, values);
    expect(scan.hits, "attributes or fields holding a password").toEqual([]);
    expect(scan.forbidden, "form-like elements inside password-tool").toBe(0);

    const rowInfo = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll('[data-testid="password-row-value"]'),
      ).map((el) => ({
        tag: el.tagName,
        translate: el.getAttribute("translate"),
        spellcheck: el.getAttribute("spellcheck"),
        ariaHidden: el.hasAttribute("aria-hidden"),
        inForm: el.closest("form") !== null,
      })),
    );
    expect(rowInfo).toHaveLength(3);
    for (const info of rowInfo) {
      expect(info).toEqual({
        tag: "DIV",
        translate: "no",
        spellcheck: "false",
        ariaHidden: false,
        inForm: false,
      });
    }

    await page.goto("/tools/password");
    const output = page.getByTestId("password-output");
    await expect(output).toBeVisible();
    const heroInfo = await output.evaluate((el) => ({
      tag: el.tagName,
      translate: el.getAttribute("translate"),
      spellcheck: el.getAttribute("spellcheck"),
      ariaHidden: el.hasAttribute("aria-hidden"),
      inForm: el.closest("form") !== null,
    }));
    expect(heroInfo).toEqual({
      tag: "DIV",
      translate: "no",
      spellcheck: "false",
      ariaHidden: false,
      inForm: false,
    });

    for (const id of [
      "password-length",
      "password-symbols",
      "password-batch-count",
    ]) {
      const input = page.getByTestId(id);
      await expect(input, `${id} autocomplete`).toHaveAttribute(
        "autocomplete",
        "off",
      );
      await expect(input, `${id} spellcheck`).toHaveAttribute(
        "spellcheck",
        "false",
      );
      await expect(input, `${id} autocorrect`).toHaveAttribute(
        "autocorrect",
        "off",
      );
      await expect(input, `${id} autocapitalize`).toHaveAttribute(
        "autocapitalize",
        "off",
      );
      await expect(input, `${id} data-1p-ignore`).toHaveAttribute(
        "data-1p-ignore",
      );
      await expect(input, `${id} data-lpignore`).toHaveAttribute(
        "data-lpignore",
        "true",
      );
      await expect(input, `${id} data-bwignore`).toHaveAttribute(
        "data-bwignore",
      );
      await expect(input, `${id} data-form-type`).toHaveAttribute(
        "data-form-type",
        "other",
      );
    }
  });

  test("accessible names, descriptions and the live region never carry the password", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const BUTTON_NAME =
      /^(Copy password( \d+)?|Copy all passwords|Copied!|Regenerate)$/;

    const sweep = async (expectedCount: number) => {
      const values = await collectPasswords(page);
      expect(values).toHaveLength(expectedCount);

      const snapshot = await page.getByTestId("password-options").ariaSnapshot();
      const status = (await page.getByTestId("password-status").textContent()) ?? "";
      for (const v of values) {
        expect(snapshot.includes(v), "password-options ariaSnapshot").toBe(false);
        expect(status.includes(v), "password-status text").toBe(false);
        await expect(page.getByRole("button", { name: v })).toHaveCount(0);
        await expect(page.getByRole("textbox", { name: v })).toHaveCount(0);
        await expect(page.getByLabel(v)).toHaveCount(0);
      }

      const buttons = await page
        .getByTestId("password-tool")
        .getByRole("button")
        .evaluateAll((els) =>
          els.map(
            (el) => (el.getAttribute("aria-label") ?? el.textContent ?? "").trim(),
          ),
        );
      expect(buttons.length).toBeGreaterThan(0);
      for (const name of buttons) {
        expect(name, `button name "${name}"`).toMatch(BUTTON_NAME);
      }
      await expect(page.getByTestId("password-status")).toHaveAttribute(
        "aria-live",
        "polite",
      );
    };

    await page.goto("/tools/password");
    await expect(page.getByTestId("password-hero")).toBeVisible();
    await page.getByTestId("password-copy").click();
    await expect(page.getByTestId("password-copy")).toContainText("Copied!");
    await page.getByTestId("password-regenerate").click();
    await sweep(1);

    await page.goto("/tools/password?n=3");
    await expect(page.getByTestId("password-row")).toHaveCount(3);
    await page.getByTestId("password-row-copy").first().click();
    await expect(page.getByTestId("password-row-copy").first()).toContainText(
      "Copied!",
    );
    await page.getByTestId("password-regenerate").click();
    await sweep(3);
  });
});
