import { afterEach, describe, expect, it, vi } from "vitest";
import { copyPlainText, copyRichText } from "./clipboard";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("config clipboard helpers", () => {
  it("writes both HTML and plain text when the rich clipboard API is available", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { write } });
    class FakeClipboardItem {
      constructor(public data: Record<string, Blob>) {}
    }
    vi.stubGlobal("ClipboardItem", FakeClipboardItem);

    await expect(copyRichText("plain", "<b>rich</b>")).resolves.toBe("rich");
    const item = write.mock.calls[0][0][0] as FakeClipboardItem;
    expect(Object.keys(item.data).sort()).toEqual(["text/html", "text/plain"]);
  });

  it("falls back to writeText when rich clipboard writing is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    vi.stubGlobal("ClipboardItem", undefined);

    await expect(copyRichText("plain", "<b>rich</b>")).resolves.toBe("plain");
    expect(writeText).toHaveBeenCalledWith("plain");
  });

  it("uses the local selection fallback when writeText is rejected", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.assign(navigator, { clipboard: { writeText } });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn().mockReturnValue(true),
    });

    await expect(copyPlainText("router ospf 1")).resolves.toBeUndefined();
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });
});
