import { expect, test } from "@playwright/test";

const IOS_CONFIG = `! Core uplink
interface GigabitEthernet0/1
 description Link to core
 ip address 192.0.2.1 255.255.255.0
 ipv6 address 2001:db8:1::1/64
 no shutdown`;

test.describe("Config Syntax Highlighter", () => {
  test.describe.configure({ mode: "serial" });

  test("highlights pasted Cisco configuration live", async ({ page }) => {
    await page.goto("/tools/config");

    await expect(page.getByTestId("config-copy-rich")).toBeDisabled();
    await page.getByTestId("config-input").fill(IOS_CONFIG);

    const preview = page.getByTestId("config-preview");
    await expect(preview).toContainText("GigabitEthernet0/1");
    await expect(preview.locator('[data-token="comment"]')).toHaveText(
      "! Core uplink"
    );
    await expect(preview.locator('[data-token="address"]')).toHaveCount(3);
  });

  test("clears the input and returns the preview to its empty state", async ({
    page,
  }) => {
    await page.goto("/tools/config");
    await page.getByTestId("config-input").fill(IOS_CONFIG);

    await page.getByTestId("config-clear").click();

    await expect(page.getByTestId("config-input")).toHaveValue("");
    await expect(page.getByTestId("config-preview")).toHaveText(
      "Your highlighted preview will appear here."
    );
    await expect(page.getByTestId("config-copy-rich")).toBeDisabled();
  });

  test("copies plain text byte-for-byte", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/tools/config");
    await page.getByTestId("config-input").fill(IOS_CONFIG);

    await page.getByTestId("config-copy-plain").click();

    await expect(page.getByTestId("config-copy-plain")).toContainText(
      "Copied!"
    );
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      IOS_CONFIG
    );
  });

  test("rich copy includes both HTML and plain text clipboard representations", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/tools/config");
    await page.getByTestId("config-input").fill(IOS_CONFIG);

    await page.getByTestId("config-copy-rich").click();

    await expect(page.getByTestId("config-copy-rich")).toContainText(
      "Copied!"
    );
    const clipboard = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      const plain = await (await item.getType("text/plain")).text();
      const html = await (await item.getType("text/html")).text();
      return { types: item.types, plain, html };
    });
    expect(clipboard.types).toEqual(
      expect.arrayContaining(["text/plain", "text/html"])
    );
    expect(clipboard.plain).toBe(IOS_CONFIG);
    expect(clipboard.html).toContain("font-family:Consolas");
    expect(clipboard.html).toContain("color:#1d4ed8");
    expect(clipboard.html).not.toMatch(/<(?:pre|div|table)\b/);
    expect(clipboard.html).not.toMatch(
      /(?:margin|padding|border|background):/
    );
  });

  test("copies equivalent rich text without syntax colours in monochrome mode", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/tools/config");
    await page.getByTestId("config-input").fill(IOS_CONFIG);
    const color = page.getByRole("checkbox", { name: "Color" });
    await expect(color).toBeChecked();
    await color.uncheck();
    await page.getByTestId("config-copy-rich").click();
    await expect(page.getByTestId("config-copy-rich")).toContainText(
      "Copied!"
    );

    const clipboard = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      const plain = await (await item.getType("text/plain")).text();
      const html = await (await item.getType("text/html")).text();
      return { plain, html };
    });
    expect(clipboard.plain).toBe(IOS_CONFIG);
    expect(clipboard.html).toContain("font-family:Consolas");
    expect(clipboard.html).not.toContain("color:");
  });
});

test("defaults to redacted preview and clipboard output in both formats", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/tools/config");
  const source = "router bgp 64512\n neighbor EDGE password 7 synthetic-bgp-value";
  const expected = source.replace("synthetic-bgp-value", "<redacted>");
  const input = page.getByTestId("config-input");
  const preview = page.getByTestId("config-preview");
  const anonymize = page.getByRole("checkbox", { name: "Anonymize" });
  await expect(anonymize).toBeChecked();
  await input.fill(source);
  await expect(input).toHaveValue(source);
  await expect(preview).toContainText("<redacted>");
  await expect(preview).not.toContainText("synthetic-bgp-value");
  await expect(page.getByText("1 value redacted.", { exact: false })).toBeVisible();

  await page.getByTestId("config-copy-plain").click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
  await page.getByTestId("config-copy-rich").click();
  await expect(page.getByTestId("config-copy-rich")).toContainText("Copied!");
  const rich = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    return {
      text: await (await item.getType("text/plain")).text(),
      html: await (await item.getType("text/html")).text(),
    };
  });
  expect(rich.text).toBe(expected);
  expect(rich.html).not.toContain("synthetic-bgp-value");
  expect(rich.html).toContain("&lt;redacted&gt;");

  await anonymize.uncheck();
  await expect(preview).toContainText("synthetic-bgp-value");
  await expect(page.getByText("Anonymize is off.", { exact: false })).toBeVisible();
  await page.getByTestId("config-copy-plain").click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(source);
});

test("aligns both desktop panes and follows the editor height", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/tools/config");
  const input = page.getByTestId("config-input");
  const preview = page.getByTestId("config-preview");
  await expect(input).toBeVisible();

  async function checkAlignment() {
    const editorBox = (await input.boundingBox())!;
    const previewBox = (await preview.boundingBox())!;
    expect(previewBox.y).toBeCloseTo(editorBox.y);
    expect(previewBox.height).toBeCloseTo(editorBox.height);
  }

  await checkAlignment();
  await input.evaluate((editor) => { editor.style.height = "460px"; });
  await checkAlignment();
  await page.setViewportSize({ width: 320, height: 800 });
  const editorBox = (await input.boundingBox())!;
  expect((await preview.boundingBox())!.y).toBeGreaterThan(editorBox.y + editorBox.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});
