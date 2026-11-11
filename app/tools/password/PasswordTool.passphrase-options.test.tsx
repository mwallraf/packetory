import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import {
  APPEND_NUMBER_BITS,
  SEPARATORS,
  SEPARATOR_TOKENS,
  WORDS_MAX,
  WORDS_MIN,
} from "@/lib/password";
import { loadWordlist } from "@/lib/password/wordlist";
import { EFF_LICENCE_URL, EFF_WORDLIST_URL } from "./eff-links";
import { PasswordTool } from "./PasswordTool";

vi.mock("@/lib/password/wordlist", () => ({ loadWordlist: vi.fn() }));
vi.mock("./reload", () => ({ reloadPage: vi.fn() }));

const PATH = "/tools/password";
const HINT = `Enter a number between ${WORDS_MIN} and ${WORDS_MAX}`;

/** Exactly 7,776 distinct, letters-only lowercase words. */
function fixtureList(): string[] {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const words: string[] = [];
  for (let i = 0; i < 7776; i++) {
    let n = i;
    let w = "";
    do {
      w = letters[n % 26]! + w;
      n = Math.floor(n / 26);
    } while (n > 0);
    words.push(`x${w}`);
  }
  return words;
}

const loader = vi.mocked(loadWordlist);

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });
}

async function mountPassphrase(query = "?mode=passphrase") {
  window.history.replaceState(null, "", `${PATH}${query}`);
  loader.mockResolvedValue(fixtureList());
  render(
    <StrictMode>
      <PasswordTool />
    </StrictMode>,
  );
  await flush();
  await flush();
}

function value(): string {
  return screen.getByTestId("password-output").textContent ?? "";
}

function words(): HTMLInputElement {
  return screen.getByTestId("password-words") as HTMLInputElement;
}

async function typeWords(text: string) {
  await act(async () => {
    fireEvent.change(words(), { target: { value: text } });
  });
}

beforeEach(() => {
  loader.mockReset();
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", PATH);
});

describe("passphrase option controls (PHR-02, D-02)", () => {
  it("renders every passphrase control and no Length control", async () => {
    await mountPassphrase();
    for (const id of [
      "password-words",
      "password-words-slider",
      "password-separator",
      "password-capitalize",
      "password-append-number",
      "password-batch-count",
      "password-eff-credit",
    ]) {
      expect(screen.getByTestId(id)).toBeTruthy();
    }
    expect(screen.queryByTestId("password-length")).toBeNull();
    const radios = screen
      .getByTestId("password-separator")
      .querySelectorAll('[role="radio"]');
    expect(Array.from(radios).map((r) => r.getAttribute("aria-label"))).toEqual(
      ["Dash", "Underscore", "Dot", "Space"],
    );
  });

  it("orders the separator items by SEPARATORS and names testids from SEPARATOR_TOKENS", async () => {
    await mountPassphrase();
    const items = Array.from(
      screen
        .getByTestId("password-separator")
        .querySelectorAll("[data-testid]"),
    ).map((el) => el.getAttribute("data-testid"));
    expect(items).toEqual(
      SEPARATORS.map((s) => `password-separator-${SEPARATOR_TOKENS[s]}`),
    );
    expect(SEPARATORS.map((s) => SEPARATOR_TOKENS[s])).toEqual([
      "dash",
      "underscore",
      "dot",
      "space",
    ]);
  });

  it("accepts 3 and 20 words and writes them to the URL", async () => {
    await mountPassphrase();
    await typeWords("3");
    expect(value().split("-")).toHaveLength(3);
    expect(window.location.search).toBe("?mode=passphrase&words=3");
    await typeWords("20");
    expect(value().split("-")).toHaveLength(20);
    expect(window.location.search).toBe("?mode=passphrase&words=20");
    const slider = screen.getByTestId("password-words-slider");
    expect(slider.getAttribute("min")).toBe("3");
    expect(slider.getAttribute("max")).toBe("20");
  });

  it.each(["2", "21", "abc"])(
    "rejects %s: hint, aria-invalid, no regeneration and no URL write",
    async (bad) => {
      await mountPassphrase("?mode=passphrase&words=8");
      const before = value();
      const search = window.location.search;
      await typeWords(bad);
      expect(screen.getByTestId("password-words-hint").textContent).toBe(HINT);
      expect(words().getAttribute("aria-invalid")).toBe("true");
      expect(value()).toBe(before);
      expect(window.location.search).toBe(search);
    },
  );

  it("E3-empty: clearing keeps the last value and output; blur restores the committed value", async () => {
    await mountPassphrase("?mode=passphrase&words=8");
    const before = value();
    await typeWords("");
    expect(screen.getByTestId("password-words-hint").textContent).toBe(HINT);
    expect(value()).toBe(before);
    await act(async () => {
      fireEvent.blur(words());
    });
    expect(words().value).toBe("8");
    expect(screen.queryByTestId("password-words-hint")).toBeNull();
    expect(value()).toBe(before);
  });

  it("moving the slider clears the hint and commits", async () => {
    await mountPassphrase();
    await typeWords("abc");
    expect(screen.getByTestId("password-words-hint")).toBeTruthy();
    await act(async () => {
      fireEvent.change(screen.getByTestId("password-words-slider"), {
        target: { value: "10" },
      });
    });
    expect(screen.queryByTestId("password-words-hint")).toBeNull();
    expect(words().value).toBe("10");
    expect(value().split("-")).toHaveLength(10);
  });

  it("separator, Capitalize and Append a number regenerate and write the URL", async () => {
    await mountPassphrase();
    await act(async () => {
      fireEvent.click(screen.getByTestId("password-separator-underscore"));
    });
    expect(value().split("_")).toHaveLength(6);
    expect(window.location.search).toBe("?mode=passphrase&sep=underscore");

    await act(async () => {
      fireEvent.click(screen.getByTestId("password-capitalize"));
    });
    expect(value().split("_").every((w) => /^[A-Z]/.test(w))).toBe(true);
    expect(window.location.search).toContain("cap=1");

    await act(async () => {
      fireEvent.click(screen.getByTestId("password-append-number"));
    });
    expect(value()).toMatch(/[a-z]\d$/);
    expect(window.location.search).toContain("num=1");
  });

  it("clicking the active separator again changes nothing", async () => {
    await mountPassphrase();
    const before = value();
    await act(async () => {
      fireEvent.click(screen.getByTestId("password-separator-dash"));
    });
    expect(value()).toBe(before);
    expect(
      screen.getByTestId("password-separator-dash").getAttribute("aria-checked"),
    ).toBe("true");
    expect(window.location.search).toBe("?mode=passphrase");
  });

  it("shows the UI-SPEC hints built from APPEND_NUMBER_BITS", async () => {
    await mountPassphrase();
    expect(screen.getByTestId("password-capitalize-hint").textContent).toBe(
      "Capital first letter on every word. Adds 0 bits.",
    );
    expect(screen.getByTestId("password-append-number-hint").textContent).toBe(
      `A random digit after the last word. Adds about ${APPEND_NUMBER_BITS.toFixed(1)} bits.`,
    );
    expect(screen.getByTestId("password-append-number-hint").textContent).toBe(
      "A random digit after the last word. Adds about 3.3 bits.",
    );
  });

  it("the credit line links reuse the EFF hrefs with rel noreferrer", async () => {
    await mountPassphrase();
    const credit = screen.getByTestId("password-eff-credit");
    expect(credit.textContent).toBe("Words from the EFF Large Wordlist (CC BY)");
    const links = Array.from(credit.querySelectorAll("a"));
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      EFF_WORDLIST_URL,
      EFF_LICENCE_URL,
    ]);
    expect(links.every((a) => a.getAttribute("rel") === "noreferrer")).toBe(
      true,
    );
  });

  it("the credit line and passphrase controls are absent in Password mode", async () => {
    window.history.replaceState(null, "", PATH);
    render(<PasswordTool />);
    await flush();
    expect(screen.queryByTestId("password-eff-credit")).toBeNull();
    expect(screen.queryByTestId("password-words")).toBeNull();
    expect(screen.getByTestId("password-length")).toBeTruthy();
  });

  it("E3-loading: every option stays enabled and a word count set while loading applies on resolve", async () => {
    let resolve!: (list: readonly string[]) => void;
    loader.mockImplementation(
      () =>
        new Promise<readonly string[]>((res) => {
          resolve = res;
        }),
    );
    window.history.replaceState(null, "", `${PATH}?mode=passphrase`);
    render(
      <StrictMode>
        <PasswordTool />
      </StrictMode>,
    );
    await flush();
    expect(screen.getByTestId("password-wordlist-loading")).toBeTruthy();
    for (const id of [
      "password-words",
      "password-words-slider",
      "password-capitalize",
      "password-append-number",
      "password-batch-count",
      "password-separator-dot",
    ]) {
      expect((screen.getByTestId(id) as HTMLButtonElement).disabled).toBe(false);
    }
    await typeWords("8");
    await act(async () => {
      resolve(fixtureList());
    });
    await flush();
    expect(value().split("-")).toHaveLength(8);
  });
});
