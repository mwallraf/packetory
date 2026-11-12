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
import { PasswordTool } from "./PasswordTool";
import { cycleFill } from "./password-test-utils";

const DEFAULT_PASSWORD = "Aa0!".repeat(5);
const CRYPTO_SENTENCE =
  "Secure random generation isn't available in this browser, so no password was generated.";
const CRYPTO_NEXT_STEP =
  "Try an up-to-date version of Chrome, Edge, Firefox or Safari.";
const EXHAUSTED_SENTENCE =
  "Couldn't generate a password that uses every selected character set, so none is shown.";
const EXHAUSTED_NEXT_STEP = "Press Enter to try again, or change an option.";
const COPY_ERROR = "Couldn't copy — select the text and copy manually.";

let writeText: ReturnType<typeof vi.fn>;

function useFill(indices: readonly number[]) {
  vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation(
    cycleFill(indices) as never,
  );
}

function mount() {
  return render(
    <StrictMode>
      <PasswordTool />
    </StrictMode>,
  );
}

function output(): HTMLElement {
  return screen.getByTestId("password-output");
}

async function click(testId: string) {
  await act(async () => {
    fireEvent.click(screen.getByTestId(testId));
  });
}

beforeEach(() => {
  window.history.replaceState(null, "", "/tools/password");
  useFill([0, 26, 52, 62]);
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

describe("PasswordTool defaults on load (PWD-01, PWD-08)", () => {
  it("PWD-01: shows exactly one 20-character password colored per character class", () => {
    mount();
    expect(screen.getAllByTestId("password-output")).toHaveLength(1);
    const el = output();
    expect(el.textContent).toBe(DEFAULT_PASSWORD);
    expect(el.childNodes).toHaveLength(15);
    const kinds = Array.from(el.childNodes).map((node) => {
      expect(node.nodeType).toBe(Node.ELEMENT_NODE);
      expect((node as Element).tagName).toBe("SPAN");
      return (node as Element).getAttribute("data-kind");
    });
    expect(kinds).toEqual(
      Array.from({ length: 5 }, () => ["letter", "digit", "symbol"]).flat(),
    );
  });

  it("PWD-01/empty: a bare ? query loads the defaults", () => {
    window.history.replaceState(null, "", "/tools/password?");
    mount();
    expect(screen.getAllByTestId("password-output")).toHaveLength(1);
    expect(output().textContent).toBe(DEFAULT_PASSWORD);
  });

  it("PWD-01/encoding: length equals the committed length and every character is printable ASCII", () => {
    mount();
    const text = output().textContent ?? "";
    expect(text).toHaveLength(20);
    expect(text).toMatch(/^[\x21-\x7e]{20}$/);
  });

  it("D-02: under StrictMode nothing generates after mount", async () => {
    mount();
    const spy = vi.mocked(globalThis.crypto.getRandomValues);
    const calls = spy.mock.calls.length;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(spy.mock.calls).toHaveLength(calls);
    expect(screen.getAllByTestId("password-output")).toHaveLength(1);
  });

  it("PWD-08/D-09: the output div carries translate, spellcheck and no other semantics", () => {
    mount();
    const el = output();
    expect(el.tagName).toBe("DIV");
    expect(el.getAttribute("translate")).toBe("no");
    expect(el.getAttribute("spellcheck")).toBe("false");
    expect(el.className).toContain("font-mono");
    expect(el.className).toContain("break-all");
    expect(el.className).toContain("select-all");
    for (const attr of Array.from(el.attributes)) {
      expect(attr.name).not.toBe("title");
      expect(attr.name).not.toBe("role");
      expect(attr.name).not.toBe("tabindex");
      expect(attr.name.startsWith("aria-")).toBe(false);
    }
    expect(el.closest("form")).toBeNull();
    expect(el.closest("output")).toBeNull();
    for (const span of Array.from(el.children)) {
      const kind = span.getAttribute("data-kind");
      expect(["letter", "digit", "symbol"]).toContain(kind);
      expect(span.className).toBe(
        {
          letter: "text-foreground",
          digit: "text-sky-700 dark:text-sky-300",
          symbol: "text-amber-700 dark:text-amber-300",
        }[kind as "letter" | "digit" | "symbol"],
      );
    }
  });

  it("D-10: the password never appears in any attribute", () => {
    const { container } = mount();
    for (const node of Array.from(container.querySelectorAll("*"))) {
      for (const attr of Array.from(node.attributes)) {
        expect(attr.value).not.toContain(DEFAULT_PASSWORD);
      }
    }
  });
});

describe("PasswordTool Copy and Regenerate (POUT-01, POUT-05)", () => {
  it("POUT-01: Copy writes the raw string and confirms without changing the value", async () => {
    mount();
    const copy = screen.getByTestId("password-copy");
    expect(copy.getAttribute("aria-label")).toBe("Copy password");
    expect(copy.textContent).toBe("Copy");
    expect(screen.getByTestId("password-regenerate").textContent).toBe(
      "Regenerate",
    );

    await click("password-copy");

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(DEFAULT_PASSWORD);
    await waitFor(() =>
      expect(screen.getByTestId("password-copy").getAttribute("aria-label")).toBe(
        "Copied!",
      ),
    );
    expect(screen.getByTestId("password-copy").textContent).toBe("Copied!");
    expect(output().textContent).toBe(DEFAULT_PASSWORD);
  });

  it("POUT-01: a rejected clipboard write shows the manual-copy hint and keeps the value", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    mount();
    await click("password-copy");
    await waitFor(() => expect(screen.getByText(COPY_ERROR)).toBeTruthy());
    expect(output().textContent).toBe(DEFAULT_PASSWORD);
  });

  it("POUT-01: Regenerate replaces the value, clears 'Copied!' at once and Copy then writes the new value", async () => {
    vi.restoreAllMocks();
    useFill([0, 26, 52, 62, 1, 27, 53]);
    mount();
    const first = output().textContent;

    await click("password-copy");
    await waitFor(() =>
      expect(screen.getByTestId("password-copy").getAttribute("aria-label")).toBe(
        "Copied!",
      ),
    );

    await click("password-regenerate");
    expect(screen.getByTestId("password-copy").getAttribute("aria-label")).toBe(
      "Copy password",
    );
    const second = output().textContent;
    expect(second).not.toBe(first);
    expect(second).toHaveLength(20);

    await click("password-copy");
    expect(writeText).toHaveBeenLastCalledWith(second);
    expect(writeText).not.toHaveBeenLastCalledWith(first);
  });

  it("PWD-08/encoding: colored spans do not change what is copied", async () => {
    mount();
    await click("password-copy");
    expect(writeText).toHaveBeenCalledWith(output().textContent);
  });
});

describe("PasswordTool fails closed (PWD-07, D-03)", () => {
  function expectErrorOnly(sentence: string, nextStep: string) {
    const panel = screen.getByTestId("password-error");
    const alert = panel.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert!.textContent).toBe(sentence + nextStep);
    expect(screen.queryByTestId("password-output")).toBeNull();
    expect(screen.queryByTestId("password-copy")).toBeNull();
    expect(screen.queryByTestId("password-regenerate")).toBeNull();
  }

  it("PWD-07: crypto undefined renders the Web Crypto error and no password", () => {
    vi.stubGlobal("crypto", undefined);
    mount();
    expectErrorOnly(CRYPTO_SENTENCE, CRYPTO_NEXT_STEP);
  });

  it("PWD-07/empty: crypto present without getRandomValues fails the same way", () => {
    vi.restoreAllMocks();
    vi.stubGlobal("crypto", {});
    mount();
    expectErrorOnly(CRYPTO_SENTENCE, CRYPTO_NEXT_STEP);
  });

  it("PWD-07/ordering: an unsatisfiable one-of-each rule shows the exhaustion copy", () => {
    vi.restoreAllMocks();
    useFill([0]);
    window.history.replaceState(null, "", "/tools/password?len=4");
    mount();
    expectErrorOnly(EXHAUSTED_SENTENCE, EXHAUSTED_NEXT_STEP);
  });

  it("WR-01: a non-crypto throw gets the neutral message, not the Web Crypto one", () => {
    vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation(() => {
      throw new Error("boom");
    });
    mount();
    expectErrorOnly(
      "Something went wrong, so no password was generated.",
      EXHAUSTED_NEXT_STEP,
    );
    expect(document.body.textContent).not.toContain("Web Crypto");
    expect(document.body.textContent).not.toContain("isn't available");
  });

  it("PWD-07/adjacency: losing Web Crypto after mount removes the old password and its controls", async () => {
    mount();
    expect(output().textContent).toBe(DEFAULT_PASSWORD);
    vi.stubGlobal("crypto", undefined);
    await click("password-regenerate");
    expectErrorOnly(CRYPTO_SENTENCE, CRYPTO_NEXT_STEP);
    expect(document.body.textContent).not.toContain(DEFAULT_PASSWORD);
  });
});
