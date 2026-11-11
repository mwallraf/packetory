import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { BATCH_MAX, BATCH_MIN, DEFAULT_SYMBOLS } from "@/lib/password";
import { PasswordTool } from "./PasswordTool";
import { cycleFill } from "./password-test-utils";

const SHORTCUT_TEXT =
  "Keyboard: / length · Enter regenerate · Esc reset options · Ctrl/Cmd+C copy (single password)";

let grv: ReturnType<typeof vi.spyOn>;
let writeText: ReturnType<typeof vi.fn>;

function mount(search = "") {
  window.history.replaceState(null, "", `/tools/password${search}`);
  return render(
    <StrictMode>
      <PasswordTool />
    </StrictMode>,
  );
}

function input(id: string): HTMLInputElement {
  return screen.getByTestId(id) as HTMLInputElement;
}

function output(): string {
  return screen.getByTestId("password-output").textContent ?? "";
}

function status(): string {
  return screen.queryByTestId("password-status")?.textContent ?? "";
}

function key(init: KeyboardEventInit, target: Element = document.body) {
  fireEvent.keyDown(target, init);
}

/** A 7-entry cycle: 20 draws per generation shift the start by 6, so every
 * generation differs from the one before. */
function useCycleFill() {
  grv.mockImplementation(cycleFill([0, 26, 52, 62, 1, 27, 53]) as never);
}

beforeEach(() => {
  grv = vi.spyOn(globalThis.crypto, "getRandomValues");
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Slash focuses and selects Length (POUT-04, D-14)", () => {
  it("/ on the body focuses Length with its whole value selected", () => {
    mount();
    key({ key: "/" });
    const length = input("password-length");
    expect(document.activeElement).toBe(length);
    expect(length.selectionStart).toBe(0);
    expect(length.selectionEnd).toBe(2);
  });

  it("/ with Ctrl held does nothing", () => {
    mount();
    key({ key: "/", ctrlKey: true });
    expect(document.activeElement).toBe(document.body);
  });

  it("/ with Meta or Alt held does nothing", () => {
    mount();
    key({ key: "/", metaKey: true });
    key({ key: "/", altKey: true });
    expect(document.activeElement).toBe(document.body);
  });

  it("/ while the Symbol set input is focused keeps focus there", () => {
    mount();
    const symbols = input("password-symbols");
    symbols.focus();
    key({ key: "/" }, symbols);
    expect(document.activeElement).toBe(symbols);
  });

  it("/ while the slider is focused keeps focus there (a range input is editable)", () => {
    mount();
    const slider = input("password-length-slider");
    slider.focus();
    key({ key: "/" }, slider);
    expect(document.activeElement).toBe(slider);
  });
});

describe("Enter regenerates (POUT-04, D-14)", () => {
  it("Enter on the body regenerates and announces", async () => {
    useCycleFill();
    mount();
    const before = output();
    const callsBefore = grv.mock.calls.length;
    key({ key: "Enter" });
    expect(grv.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(output()).not.toBe(before);
    await waitFor(() => expect(status()).toBe("New password generated"));
  });

  it.each([
    "password-regenerate",
    "password-copy",
    "password-set-digits",
    "password-lookalikes",
  ])("Enter keyDown on %s makes zero Web Crypto calls", (testid) => {
    mount();
    const el = screen.getByTestId(testid);
    el.focus();
    const callsBefore = grv.mock.calls.length;
    key({ key: "Enter" }, el);
    expect(grv.mock.calls.length).toBe(callsBefore);
  });

  it("an invalid Length draft keeps its hint and Enter regenerates at the last valid length", () => {
    mount();
    const length = input("password-length");
    fireEvent.change(length, { target: { value: "3" } });
    expect(screen.getByTestId("password-length-hint")).toBeTruthy();
    length.focus();
    key({ key: "Enter" }, length);
    expect(output()).toHaveLength(20);
    expect(screen.getByTestId("password-length-hint")).toBeTruthy();
  });

  it.each([
    "password-length",
    "password-length-slider",
    "password-symbols",
    "password-batch-count",
  ])("Enter on %s regenerates", (testid) => {
    useCycleFill();
    mount();
    const el = input(testid);
    el.focus();
    const before = output();
    const callsBefore = grv.mock.calls.length;
    key({ key: "Enter" }, el);
    expect(grv.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(output()).not.toBe(before);
  });
});

describe("Escape resets everything and keeps focus (POUT-04, D-14)", () => {
  it("from the Symbol set input: options, drafts, hints, URL, status and focus", async () => {
    mount();
    fireEvent.change(input("password-length"), { target: { value: "40" } });
    fireEvent.click(screen.getByTestId("password-set-digits"));
    fireEvent.change(input("password-symbols"), { target: { value: "#" } });
    fireEvent.change(input("password-batch-count"), { target: { value: "3" } });
    fireEvent.change(input("password-batch-count"), {
      target: { value: "99" },
    });
    fireEvent.change(input("password-length"), { target: { value: "abc" } });
    expect(window.location.search).not.toBe("");
    expect(screen.getByTestId("password-length-hint")).toBeTruthy();
    expect(screen.getByTestId("password-batch-count-hint")).toBeTruthy();

    const symbols = input("password-symbols");
    symbols.focus();
    key({ key: "Escape" }, symbols);

    expect(input("password-length").value).toBe("20");
    expect(input("password-length-slider").value).toBe("20");
    expect(
      screen.getByTestId("password-set-digits").getAttribute("aria-checked"),
    ).toBe("true");
    expect(input("password-symbols").value).toBe(DEFAULT_SYMBOLS);
    expect(input("password-batch-count").value).toBe("1");
    expect(screen.getByTestId("password-hero")).toBeTruthy();
    expect(output()).toHaveLength(20);
    expect(screen.queryByTestId("password-length-hint")).toBeNull();
    expect(screen.queryByTestId("password-batch-count-hint")).toBeNull();
    expect(window.location.search).toBe("");
    expect(document.activeElement).toBe(input("password-symbols"));
    await waitFor(() =>
      expect(status()).toBe("Options reset. New password generated"),
    );
  });

  it("an Escape that ends an IME composition does not reset", () => {
    mount("?len=40");
    key({ key: "Escape", isComposing: true });
    key({ key: "Escape", keyCode: 229 });
    expect(input("password-length").value).toBe("40");
  });
});

describe("Ctrl/Cmd+C copies the single password (POUT-04, D-14)", () => {
  it("Ctrl+C on the body copies the hero value and shows Copied!", async () => {
    mount();
    const value = output();
    await act(async () => {
      key({ key: "c", ctrlKey: true });
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(value);
    expect(screen.getByTestId("password-copy").textContent).toContain(
      "Copied!",
    );
    await waitFor(() => expect(status()).toBe("Copied"));
  });

  it("Meta+C and an uppercase C with Ctrl copy too", async () => {
    mount();
    await act(async () => {
      key({ key: "c", metaKey: true });
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    await act(async () => {
      key({ key: "C", ctrlKey: true });
    });
    expect(writeText).toHaveBeenCalledTimes(2);
  });

  it("Shift+Ctrl+C and Alt+Ctrl+C do not copy", async () => {
    mount();
    await act(async () => {
      key({ key: "c", ctrlKey: true, shiftKey: true });
      key({ key: "c", ctrlKey: true, altKey: true });
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("at batch 3 the shortcut copies nothing", async () => {
    mount(`?n=${Math.min(3, BATCH_MAX)}`);
    expect(BATCH_MIN).toBeLessThan(3);
    await act(async () => {
      key({ key: "c", ctrlKey: true });
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("a non-empty text selection leaves the native copy alone", async () => {
    mount();
    vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "Aa",
    } as Selection);
    await act(async () => {
      key({ key: "c", ctrlKey: true });
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("focus in the Length input copies nothing", async () => {
    mount();
    const length = input("password-length");
    length.focus();
    await act(async () => {
      key({ key: "c", ctrlKey: true }, length);
    });
    expect(writeText).not.toHaveBeenCalled();
  });
});

describe("Fail-closed error state (POUT-04)", () => {
  it("Ctrl+C copies nothing and Enter and Esc re-attempt and fail closed again", async () => {
    vi.stubGlobal("crypto", undefined);
    mount();
    expect(screen.getByTestId("password-error")).toBeTruthy();
    await act(async () => {
      key({ key: "c", ctrlKey: true });
    });
    expect(writeText).not.toHaveBeenCalled();

    key({ key: "Enter" });
    expect(screen.getByTestId("password-error")).toBeTruthy();
    expect(screen.queryByTestId("password-output")).toBeNull();

    key({ key: "Escape" });
    expect(screen.getByTestId("password-error")).toBeTruthy();
    expect(screen.queryByTestId("password-output")).toBeNull();
  });
});

describe("Shortcut hint (D-14)", () => {
  it("renders the exact line with five kbd elements", () => {
    mount();
    const hint = screen.getByTestId("password-shortcuts");
    expect(hint.textContent).toBe(SHORTCUT_TEXT);
    expect(hint.querySelectorAll("kbd")).toHaveLength(5);
  });
});
