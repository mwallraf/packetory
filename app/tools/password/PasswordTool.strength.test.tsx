import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { GUESS_RATE_LABELS } from "@/lib/password";
import { loadWordlist } from "@/lib/password/wordlist";
import { PasswordTool } from "./PasswordTool";

vi.mock("@/lib/password/wordlist", () => ({ loadWordlist: vi.fn() }));
vi.mock("./reload", () => ({ reloadPage: vi.fn() }));

const PATH = "/tools/password";
const loader = vi.mocked(loadWordlist);

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

function mount(pathAndQuery: string = PATH) {
  window.history.replaceState(null, "", pathAndQuery);
  return render(
    <StrictMode>
      <PasswordTool />
    </StrictMode>,
  );
}

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });
}

async function choosePassphrase() {
  await act(async () => {
    fireEvent.click(screen.getByTestId("password-mode-passphrase"));
  });
  await flush();
}

const text = (id: string) => screen.getByTestId(id).textContent;
const panelText = () => screen.getByTestId("password-strength").textContent;

beforeEach(() => {
  loader.mockReset();
  loader.mockResolvedValue(fixtureList());
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", PATH);
});

describe("Strength panel in the island (STR-01, D-06)", () => {
  it("renders under the output zone with the default password figures", () => {
    mount();
    const zone = screen.getByTestId("password-output-zone");
    const strength = screen.getByTestId("password-strength");
    expect(zone.nextElementSibling).toBe(strength);
    expect(text("password-strength-label")).toBe("Very strong · 128 bits");
    expect(text("password-strength-pool")).toBe("85 chars · 128 bits");
  });

  it("five Regenerates leave every text node of the panel unchanged (password)", () => {
    mount();
    const before = panelText();
    const hero = text("password-output");
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByTestId("password-regenerate"));
    }
    expect(text("password-output")).not.toBe(hero);
    expect(panelText()).toBe(before);
  });

  it("passphrase mode shows the passphrase figures and is stable across Regenerate", async () => {
    mount();
    await choosePassphrase();
    expect(text("password-strength-label")).toBe("Strong · 77 bits");
    expect(text("password-strength-pool")).toBe("7,776 words × 6 · 77 bits");
    const before = panelText();
    const hero = text("password-output");
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByTestId("password-regenerate"));
    }
    expect(text("password-output")).not.toBe(hero);
    expect(panelText()).toBe(before);
  });

  it("the generated value never appears inside the panel", () => {
    mount();
    const hero = text("password-output")!;
    expect(panelText()).not.toContain(hero);
  });
});

describe("attack scenario in the island (STR-04, D-09)", () => {
  it("choosing Slow hash changes the sentence and assumption only, never the value or URL", async () => {
    mount();
    await choosePassphrase();
    expect(text("password-crack-time")).toBe(
      "About 350 thousand years to crack, on average",
    );
    const hero = text("password-output");
    const search = window.location.search;
    const replace = vi.spyOn(window.history, "replaceState");
    fireEvent.click(screen.getByTestId("password-scenario-slow"));
    expect(text("password-crack-time")).toBe(
      "About 350 billion years to crack, on average",
    );
    expect(text("password-crack-assumption")).toBe(GUESS_RATE_LABELS.slow);
    expect(text("password-output")).toBe(hero);
    expect(window.location.search).toBe(search);
    expect(replace).not.toHaveBeenCalled();
  });

  it("clicking the active item (Radix deselect) keeps the scenario", () => {
    mount();
    fireEvent.click(screen.getByTestId("password-scenario-slow"));
    fireEvent.click(screen.getByTestId("password-scenario-slow"));
    expect(
      screen.getByTestId("password-scenario-slow").getAttribute("aria-checked"),
    ).toBe("true");
    expect(text("password-crack-assumption")).toBe(GUESS_RATE_LABELS.slow);
  });

  it("Esc after choosing Slow hash restores Fast hash", () => {
    mount();
    fireEvent.click(screen.getByTestId("password-scenario-slow"));
    expect(
      screen.getByTestId("password-scenario-fast").getAttribute("aria-checked"),
    ).toBe("false");
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(
      screen.getByTestId("password-scenario-fast").getAttribute("aria-checked"),
    ).toBe("true");
    expect(text("password-crack-assumption")).toBe(GUESS_RATE_LABELS.fast);
  });
});

describe("panel with no result (E5-loading, STR-01/empty)", () => {
  it("renders the passphrase figures while the list is loading, and the scenario works", async () => {
    loader.mockImplementation(() => new Promise(() => {}));
    mount();
    await choosePassphrase();
    expect(screen.getByTestId("password-wordlist-loading")).toBeTruthy();
    expect(text("password-strength-label")).toBe("Strong · 77 bits");
    fireEvent.click(screen.getByTestId("password-scenario-slow"));
    expect(text("password-crack-time")).toBe(
      "About 350 billion years to crack, on average",
    );
  });

  it("renders the figures after a word-list failure", async () => {
    loader.mockRejectedValue(new Error("boom"));
    mount();
    await choosePassphrase();
    expect(screen.getByTestId("password-wordlist-error")).toBeTruthy();
    expect(text("password-strength-label")).toBe("Strong · 77 bits");
    expect(text("password-strength-pool")).toBe("7,776 words × 6 · 77 bits");
  });

  it("renders the figures in the crypto-error state", () => {
    vi.stubGlobal("crypto", undefined);
    mount();
    expect(screen.queryByTestId("password-output")).toBeNull();
    expect(text("password-strength-label")).toBe("Very strong · 128 bits");
  });
});

describe("announcements (D-06)", () => {
  it("the panel is not a live region and the status region never mentions strength", () => {
    mount();
    const section = screen.getByTestId("password-strength");
    expect(section.hasAttribute("aria-live")).toBe(false);
    expect(section.querySelector("[aria-live]")).toBeNull();
    expect(section.querySelector('[role="status"], [role="alert"]')).toBeNull();
    fireEvent.click(screen.getByTestId("password-scenario-slow"));
    expect(text("password-status")).not.toMatch(/strong|crack|hash/i);
  });
});
