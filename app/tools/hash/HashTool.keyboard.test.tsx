import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createHashClient } from "@/lib/hash/client";
import { ALGORITHMS } from "@/lib/hash/algorithms";
import { toHex } from "@/lib/hash/format";
import { SAMPLE_DIGEST_HEX, SAMPLE_TEXT } from "@/lib/hash/sample";
import { HashTool } from "./HashTool";
import {
  createFakeHashClient,
  fakeDigests,
  stubClipboard,
  type FakeHashClient,
} from "./hash-test-utils";

vi.mock("@/lib/hash/client", () => ({ createHashClient: vi.fn() }));

let fakes: FakeHashClient[];

function liveClient(): FakeHashClient {
  const last = fakes[fakes.length - 1];
  if (!last) throw new Error("no client created");
  return last;
}

function textarea() {
  return screen.getByTestId("hash-input") as HTMLTextAreaElement;
}

function type(value: string) {
  fireEvent.change(textarea(), { target: { value } });
}

function rowValue(id: string): string {
  return screen.getByTestId(`hash-row-${id}-value`).textContent ?? "";
}

async function settle(
  index: number,
  outcome: Parameters<FakeHashClient["starts"][number]["resolve"]>[0],
) {
  await act(async () => {
    liveClient().starts[index]!.resolve(outcome);
  });
}

async function pressCopy(init: KeyboardEventInit = { key: "c", ctrlKey: true }) {
  await act(async () => {
    fireEvent.keyDown(document.body, init);
  });
}

function press(key: string, target: Element = document.body) {
  fireEvent.keyDown(target, { key });
}

let writeText: ReturnType<typeof stubClipboard>;

beforeEach(() => {
  fakes = [];
  vi.mocked(createHashClient).mockImplementation(() => {
    const fake = createFakeHashClient();
    fakes.push(fake);
    return fake.client;
  });
  writeText = stubClipboard();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("INT-01 slash", () => {
  it("INT-01: '/' outside an editable field focuses the textarea and selects all", () => {
    render(<HashTool />);
    const el = textarea();
    expect(document.activeElement).not.toBe(el);
    press("/");
    expect(document.activeElement).toBe(el);
    expect(el.selectionStart).toBe(0);
    expect(el.selectionEnd).toBe(el.value.length);
  });

  it("INT-01: '/' typed inside the textarea is left alone", () => {
    render(<HashTool />);
    const el = textarea();
    el.focus();
    const notPrevented = fireEvent.keyDown(el, { key: "/" });
    expect(notPrevented).toBe(true);
  });
});

describe("WR-01 focus-time select", () => {
  it("WR-01: text changed in the same frame as focus is not re-selected by the deferred select", async () => {
    render(<HashTool />);
    const el = textarea();
    act(() => {
      el.focus();
    });
    expect(el.selectionStart).toBe(0);
    expect(el.selectionEnd).toBe(el.value.length);
    type("abc");
    el.setSelectionRange(3, 3);
    await act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });
    expect(el.value).toBe("abc");
    expect(el.selectionStart).toBe(3);
    expect(el.selectionEnd).toBe(3);
  });

  it("WR-01: the untouched sample is still selected after the next frame", async () => {
    render(<HashTool />);
    const el = textarea();
    act(() => {
      el.focus();
    });
    await act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });
    expect(el.selectionStart).toBe(0);
    expect(el.selectionEnd).toBe(el.value.length);
  });
});

describe("INT-01 Enter", () => {
  it("INT-01: Enter on the textarea is not default-prevented (inserts a newline)", () => {
    render(<HashTool />);
    const notPrevented = fireEvent.keyDown(textarea(), { key: "Enter" });
    expect(notPrevented).toBe(true);
  });
});

describe("INT-01 copy shortcut", () => {
  it("INT-01: Ctrl+C on the body writes the displayed SHA-256 and shows Copied! on that row", async () => {
    render(<HashTool />);
    await pressCopy();
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(SAMPLE_DIGEST_HEX.sha256);
    expect(
      screen.getByTestId("hash-row-sha256-copy").getAttribute("aria-label"),
    ).toBe("Copied!");
    expect(screen.getByTestId("hash-row-sha256-status").textContent).toBe(
      "Copied!",
    );
    expect(
      screen.getByTestId("hash-row-sha512-copy").getAttribute("aria-label"),
    ).not.toBe("Copied!");
  });

  it("INT-01: Cmd+C copies too", async () => {
    render(<HashTool />);
    await pressCopy({ key: "c", metaKey: true });
    expect(writeText).toHaveBeenCalledWith(SAMPLE_DIGEST_HEX.sha256);
  });

  it("INT-01: the copied string follows the selected encoding (HEX, Base64)", async () => {
    render(<HashTool />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("hash-encoding-HEX"));
    });
    await pressCopy();
    expect(writeText).toHaveBeenLastCalledWith(
      SAMPLE_DIGEST_HEX.sha256.toUpperCase(),
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("hash-encoding-base64"));
    });
    await pressCopy();
    expect(writeText).toHaveBeenLastCalledWith(
      "uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek=",
    );
  });

  it("INT-01: a non-empty text selection yields to the native copy", async () => {
    render(<HashTool />);
    vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "selected words",
    } as unknown as Selection);
    await pressCopy();
    expect(writeText).not.toHaveBeenCalled();
  });

  it("INT-01: an empty selection does not block the shortcut", async () => {
    render(<HashTool />);
    vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "",
    } as unknown as Selection);
    await pressCopy();
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it("INT-01: Shift or Alt chords never copy", async () => {
    render(<HashTool />);
    await pressCopy({ key: "C", ctrlKey: true, shiftKey: true });
    await pressCopy({ key: "c", metaKey: true, shiftKey: true });
    await pressCopy({ key: "c", ctrlKey: true, altKey: true });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("INT-01: Ctrl+C is a no-op while no settled result exists (?text= restore pending)", async () => {
    window.history.replaceState(null, "", "/tools/hash?text=abc");
    try {
      render(<HashTool />);
      expect(screen.getByTestId("hash-row-sha256-copy")).toHaveProperty(
        "disabled",
        true,
      );
      await pressCopy();
      expect(writeText).not.toHaveBeenCalled();
    } finally {
      window.history.replaceState(null, "", "/tools/hash");
    }
  });

  it("INT-01: nothing is copied on load, focus or typing", async () => {
    render(<HashTool />);
    textarea().focus();
    type("abc");
    await settle(0, { status: "done", digests: fakeDigests(1) });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("INT-01: Ctrl+C inside the textarea is left to the browser", async () => {
    render(<HashTool />);
    await act(async () => {
      fireEvent.keyDown(textarea(), { key: "c", ctrlKey: true });
    });
    expect(writeText).not.toHaveBeenCalled();
  });
});

describe("INT-01 Esc", () => {
  it("INT-01: Esc cancels the in-flight job and a late result never changes the rows", async () => {
    render(<HashTool />);
    type("abc");
    expect(liveClient().starts).toHaveLength(1);
    const cancelsBefore = liveClient().cancel.mock.calls.length;
    press("Escape");
    expect(liveClient().cancel.mock.calls.length).toBeGreaterThan(cancelsBefore);
    expect(textarea().value).toBe(SAMPLE_TEXT);
    await settle(0, { status: "done", digests: fakeDigests(9) });
    for (const algo of ALGORITHMS) {
      expect(rowValue(algo.id)).toBe(SAMPLE_DIGEST_HEX[algo.id]);
    }
    expect(rowValue("sha256")).not.toBe(toHex(fakeDigests(9).sha256));
  });

  it("INT-01: Esc clears the verify box and an engine error notice, keeping the encoding", async () => {
    render(<HashTool />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("hash-encoding-HEX"));
    });
    fireEvent.change(screen.getByTestId("hash-verify"), {
      target: { value: "deadbeef" },
    });
    type("abc");
    await settle(0, { status: "error", message: "boom" } as never);
    expect(screen.getByTestId("hash-notice-error")).toBeTruthy();
    press("Escape");
    expect(screen.queryByTestId("hash-notice-error")).toBeNull();
    expect((screen.getByTestId("hash-verify") as HTMLInputElement).value).toBe(
      "",
    );
    expect(rowValue("sha256")).toBe(SAMPLE_DIGEST_HEX.sha256.toUpperCase());
    expect(
      screen.getByTestId("hash-encoding-HEX").getAttribute("data-state"),
    ).toBe("on");
  });

  it("INT-01: Esc while a dialog is open does not reset the tool", () => {
    render(<HashTool />);
    type("secret text");
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("data-state", "open");
    document.body.appendChild(dialog);
    press("Escape");
    expect(textarea().value).toBe("secret text");
    dialog.remove();
    press("Escape");
    expect(textarea().value).toBe(SAMPLE_TEXT);
  });
});

describe("INT-01 Restore your text", () => {
  it("INT-01: Esc over non-sample text offers Restore, which brings the text back and re-hashes it", async () => {
    render(<HashTool />);
    type("secret text");
    await settle(0, { status: "done", digests: fakeDigests(3) });
    press("Escape");
    expect(textarea().value).toBe(SAMPLE_TEXT);
    const notice = screen.getByTestId("hash-notice-restore");
    expect(notice.textContent).toContain("Reset to the sample.");
    const button = screen.getByTestId("hash-restore");
    expect(button.textContent).toBe("Restore your text");

    const startsBefore = liveClient().starts.length;
    await act(async () => {
      fireEvent.click(button);
    });
    expect(textarea().value).toBe("secret text");
    expect(liveClient().starts.length).toBe(startsBefore + 1);
    expect(liveClient().starts[startsBefore]!.input).toEqual({
      kind: "text",
      text: "secret text",
    });
    expect(screen.queryByTestId("hash-notice-restore")).toBeNull();
    expect(document.activeElement).toBe(textarea());
  });

  it("INT-01: any edit after Esc removes the restore notice", () => {
    render(<HashTool />);
    type("secret text");
    press("Escape");
    expect(screen.getByTestId("hash-notice-restore")).toBeTruthy();
    type("x");
    expect(screen.queryByTestId("hash-notice-restore")).toBeNull();
  });

  it("INT-01: Esc on the untouched sample shows no restore notice", () => {
    render(<HashTool />);
    press("Escape");
    expect(screen.queryByTestId("hash-notice-restore")).toBeNull();
  });

  it("INT-01: a second Esc keeps the original restorable text", () => {
    render(<HashTool />);
    type("secret text");
    press("Escape");
    press("Escape");
    fireEvent.click(screen.getByTestId("hash-restore"));
    expect(textarea().value).toBe("secret text");
  });
});
