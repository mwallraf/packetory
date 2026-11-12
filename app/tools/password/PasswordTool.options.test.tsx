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
  DEFAULT_SYMBOLS,
  LENGTH_MAX,
  LENGTH_MIN,
  LOOK_ALIKES,
  SYMBOL_SET_MAX,
} from "@/lib/password";
import { PasswordTool } from "./PasswordTool";

const HINT = `Enter a number between ${LENGTH_MIN} and ${LENGTH_MAX}`;
const LOCK_HINT = "At least one character set must stay on";

let grv: ReturnType<typeof vi.spyOn>;

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

function text(): string {
  return output().textContent ?? "";
}

function calls(): number {
  return grv.mock.calls.length;
}

function lengthInput(): HTMLInputElement {
  return screen.getByTestId("password-length") as HTMLInputElement;
}

function slider(): HTMLInputElement {
  return screen.getByTestId("password-length-slider") as HTMLInputElement;
}

function setLength(value: string) {
  fireEvent.change(lengthInput(), { target: { value } });
}

function setSlider(value: number) {
  fireEvent.change(slider(), { target: { value: String(value) } });
}

function sw(key: string): HTMLElement {
  return screen.getByTestId(`password-set-${key}`);
}

async function toggle(key: string) {
  await act(async () => {
    fireEvent.click(sw(key));
  });
}

function symbols(): HTMLInputElement {
  return screen.getByTestId("password-symbols") as HTMLInputElement;
}

function setSymbols(value: string) {
  fireEvent.change(symbols(), { target: { value } });
}

function symbolHint(): string {
  return screen.getByTestId("password-symbols-hint").textContent ?? "";
}

/** The characters of the output that are neither letters nor digits. */
function symbolChars(): string[] {
  return text().split("").filter((ch) => /[^A-Za-z0-9]/.test(ch));
}

async function regenerate() {
  await act(async () => {
    fireEvent.click(screen.getByTestId("password-regenerate"));
  });
}

const SETS = ["uppercase", "lowercase", "digits", "symbols"] as const;

beforeEach(() => {
  window.history.replaceState(null, "", "/tools/password");
  grv = vi.spyOn(globalThis.crypto, "getRandomValues");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Length number input and slider (PWD-02, D-05)", () => {
  it("renders the slider with library bounds and the default length in both controls", () => {
    mount();
    expect(slider().type).toBe("range");
    expect(slider().min).toBe(String(LENGTH_MIN));
    expect(slider().max).toBe(String(LENGTH_MAX));
    expect(slider().step).toBe("1");
    expect(slider().value).toBe("20");
    expect(lengthInput().value).toBe("20");
    expect(screen.queryByTestId("password-length-hint")).toBeNull();
  });

  it("typing a valid length moves the slider and regenerates at that length", () => {
    mount();
    const before = calls();
    setLength("32");
    expect(slider().value).toBe("32");
    expect(text()).toHaveLength(32);
    expect(calls()).toBeGreaterThan(before);
    expect(screen.queryByTestId("password-length-hint")).toBeNull();
  });

  it.each([LENGTH_MIN, LENGTH_MAX])("boundary %i commits at exactly that length", (n) => {
    mount();
    setLength(String(n));
    expect(text()).toHaveLength(n);
    expect(slider().value).toBe(String(n));
    expect(screen.queryByTestId("password-length-hint")).toBeNull();
  });

  it("trims surrounding spaces: ' 32 ' commits 32", () => {
    mount();
    setLength(" 32 ");
    expect(text()).toHaveLength(32);
    expect(slider().value).toBe("32");
  });

  it.each([
    ["below the minimum", String(LENGTH_MIN - 1)],
    ["above the maximum", String(LENGTH_MAX + 1)],
    ["empty", ""],
    ["letters", "abc"],
    ["fractional", "20.5"],
    ["exponent", "1e2"],
    ["decimal zero", "32.0"],
    ["plus sign", "+20"],
    ["hex", "0x20"],
    ["full-width digits", "２０"],
    ["Arabic-Indic digits", "٢٠"],
    ["a 400-digit string", "9".repeat(400)],
  ])("invalid draft (%s) shows the hint and changes nothing", (_name, value) => {
    mount();
    const shown = text();
    const before = calls();
    setLength(value);
    const hint = screen.getByTestId("password-length-hint");
    expect(hint.textContent).toBe(HINT);
    expect(lengthInput().getAttribute("aria-invalid")).toBe("true");
    expect(lengthInput().getAttribute("aria-describedby")).toBe(
      "password-length-hint",
    );
    expect(slider().value).toBe("20");
    expect(text()).toBe(shown);
    expect(calls()).toBe(before);
  });

  it("clearing the input keeps the committed length and blur restores the draft", () => {
    mount();
    setLength("");
    expect(slider().value).toBe("20");
    fireEvent.blur(lengthInput());
    expect(lengthInput().value).toBe("20");
    expect(screen.queryByTestId("password-length-hint")).toBeNull();
    expect(lengthInput().getAttribute("aria-invalid")).toBe("false");
  });

  it("blur clamps an out-of-range integer", () => {
    mount();
    setLength(String(LENGTH_MAX + 1));
    fireEvent.blur(lengthInput());
    expect(lengthInput().value).toBe(String(LENGTH_MAX));
    expect(text()).toHaveLength(LENGTH_MAX);
    expect(slider().value).toBe(String(LENGTH_MAX));
    expect(screen.queryByTestId("password-length-hint")).toBeNull();

    setLength(String(LENGTH_MIN - 1));
    fireEvent.blur(lengthInput());
    expect(lengthInput().value).toBe(String(LENGTH_MIN));
    expect(text()).toHaveLength(LENGTH_MIN);
  });

  it.each(["abc", "20.5", "1e2", "9".repeat(400)])(
    "blur on a non-integer (%s) restores the committed value",
    (value) => {
      mount();
      setLength("32");
      setLength(value);
      fireEvent.blur(lengthInput());
      expect(lengthInput().value).toBe("32");
      expect(text()).toHaveLength(32);
      expect(screen.queryByTestId("password-length-hint")).toBeNull();
    },
  );

  it("moving the slider clears the hint, rewrites the draft and regenerates", () => {
    mount();
    setLength("3");
    expect(screen.getByTestId("password-length-hint")).toBeTruthy();
    setSlider(64);
    expect(lengthInput().value).toBe("64");
    expect(screen.queryByTestId("password-length-hint")).toBeNull();
    expect(text()).toHaveLength(64);
  });

  it("the last valid change wins across slider and input", () => {
    mount();
    setSlider(64);
    setLength("16");
    expect(slider().value).toBe("16");
    expect(lengthInput().value).toBe("16");
    expect(text()).toHaveLength(16);
    setSlider(100);
    expect(lengthInput().value).toBe("100");
    expect(text()).toHaveLength(100);
  });
});

describe("Character set switches and the last-set lock (PWD-03, D-05)", () => {
  it("renders four switches, all checked and enabled, with no lock hint", () => {
    mount();
    for (const key of SETS) {
      expect(sw(key).getAttribute("aria-checked")).toBe("true");
      expect((sw(key) as HTMLButtonElement).disabled).toBe(false);
    }
    expect(screen.queryByTestId("password-sets-lock-hint")).toBeNull();
  });

  it("each toggle regenerates output that obeys the enabled sets", async () => {
    mount();
    setLength("128");
    await toggle("digits");
    expect(text()).toHaveLength(128);
    expect(text()).not.toMatch(/[0-9]/);
    await toggle("symbols");
    expect(text()).not.toMatch(/[0-9]/);
    expect(text()).not.toMatch(/[^A-Za-z0-9]/);
    await toggle("uppercase");
    expect(text()).toMatch(/^[a-z]+$/);
  });

  it("with one set left that switch is disabled, checked and described by the lock hint", async () => {
    mount();
    await toggle("digits");
    await toggle("symbols");
    await toggle("uppercase");
    const last = sw("lowercase") as HTMLButtonElement;
    expect(last.disabled).toBe(true);
    expect(last.getAttribute("aria-checked")).toBe("true");
    expect(last.getAttribute("aria-describedby")).toBe(
      "password-sets-lock-hint",
    );
    expect(screen.getByTestId("password-sets-lock-hint").textContent).toBe(
      LOCK_HINT,
    );
    for (const key of ["uppercase", "digits", "symbols"]) {
      expect(sw(key).getAttribute("aria-describedby")).toBeNull();
    }
  });

  it("the locked switch's label keeps full opacity", async () => {
    mount();
    await toggle("digits");
    await toggle("symbols");
    await toggle("uppercase");
    for (const key of SETS) {
      const label = document.querySelector(`label[for="password-set-${key}"]`);
      expect(label?.className).toContain("peer-disabled:opacity-100");
    }
  });

  it.each(SETS)("when %s is the last set left it is the disabled switch", async (last) => {
    mount();
    for (const key of SETS.filter((k) => k !== last)) await toggle(key);
    for (const key of SETS) {
      expect((sw(key) as HTMLButtonElement).disabled).toBe(key === last);
    }
    expect(screen.getByTestId("password-sets-lock-hint")).toBeTruthy();
  });

  it("with exactly two sets on, both switches are enabled and no hint shows", async () => {
    mount();
    await toggle("digits");
    await toggle("symbols");
    expect((sw("uppercase") as HTMLButtonElement).disabled).toBe(false);
    expect((sw("lowercase") as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByTestId("password-sets-lock-hint")).toBeNull();
  });

  it("turning a second set back on removes the hint and re-enables every switch", async () => {
    mount();
    await toggle("digits");
    await toggle("symbols");
    await toggle("uppercase");
    expect(screen.getByTestId("password-sets-lock-hint")).toBeTruthy();
    await toggle("digits");
    expect(screen.queryByTestId("password-sets-lock-hint")).toBeNull();
    for (const key of SETS) {
      expect((sw(key) as HTMLButtonElement).disabled).toBe(false);
    }
  });

  it("clicking the disabled last switch changes nothing", async () => {
    mount();
    await toggle("digits");
    await toggle("symbols");
    await toggle("uppercase");
    const shown = text();
    const before = calls();
    const url = window.location.search;
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        fireEvent.click(sw("lowercase"));
      });
    }
    expect(calls()).toBe(before);
    expect(text()).toBe(shown);
    expect(window.location.search).toBe(url);
    expect(sw("lowercase").getAttribute("aria-checked")).toBe("true");
  });

  it("toggling a set off and on again regenerates with the original options", async () => {
    mount();
    const before = calls();
    await toggle("digits");
    await toggle("digits");
    expect(calls()).toBeGreaterThan(before);
    expect(text()).toHaveLength(20);
    expect(sw("digits").getAttribute("aria-checked")).toBe("true");
  });

  it("output already satisfies the options right after each toggle (no async step)", async () => {
    mount();
    setLength("128");
    await toggle("digits");
    expect(text()).not.toMatch(/[0-9]/);
    await toggle("digits");
    expect(text()).toMatch(/[0-9]/);
    await toggle("lowercase");
    expect(text()).not.toMatch(/[a-z]/);
  });
});

describe("Errors recover after options change (PWD-07/adjacency)", () => {
  it("a crypto-missing error clears once Web Crypto is back and an option changes", () => {
    mount();
    vi.stubGlobal("crypto", undefined);
    setLength("24");
    expect(screen.getByTestId("password-error")).toBeTruthy();
    expect(screen.queryByTestId("password-output")).toBeNull();

    vi.unstubAllGlobals();
    setLength("30");
    expect(screen.queryByTestId("password-error")).toBeNull();
    expect(text()).toHaveLength(30);
  });
});

const RULE_HINT = `Up to ${SYMBOL_SET_MAX} printable ASCII symbols. Letters, digits, spaces and repeats are removed when you leave the field.`;
const EMPTY_HINT = "Empty, so the default set is used";
const OFF_HINT = "Turn on Symbols to use this set";

describe("Symbol set editor (PWD-05, D-05)", () => {
  it("starts with the default symbols and the rule hint", () => {
    mount();
    expect(symbols().value).toBe(DEFAULT_SYMBOLS);
    expect(symbolHint()).toBe(RULE_HINT);
    expect(symbols().getAttribute("aria-describedby")).toBe(
      "password-symbols-hint",
    );
    expect(symbols().disabled).toBe(false);
  });

  it("an empty draft generates from the default set, shows the empty hint and blur restores the default", () => {
    mount();
    setLength("128");
    setSymbols("#");
    setSymbols("");
    expect(symbolHint()).toBe(EMPTY_HINT);
    expect(symbolChars().length).toBeGreaterThan(0);
    for (const ch of symbolChars()) expect(DEFAULT_SYMBOLS).toContain(ch);
    fireEvent.blur(symbols());
    expect(symbols().value).toBe(DEFAULT_SYMBOLS);
  });

  it.each(["abc 123é", "   ", "é€🚀"])(
    "a draft with no usable symbol (%j) shows the empty hint",
    (draft) => {
      mount();
      setSymbols(draft);
      expect(symbolHint()).toBe(EMPTY_HINT);
      fireEvent.blur(symbols());
      expect(symbols().value).toBe(DEFAULT_SYMBOLS);
    },
  );

  it("generates live from the normalized draft without rewriting it, and blur rewrites it", () => {
    mount();
    setLength("128");
    setSymbols("ab!!#");
    expect(symbols().value).toBe("ab!!#");
    expect(symbolChars().length).toBeGreaterThan(0);
    for (const ch of symbolChars()) expect("!#").toContain(ch);
    expect(symbolHint()).toBe(RULE_HINT);
    fireEvent.blur(symbols());
    expect(symbols().value).toBe("!#");
  });

  it("keeps first-seen order and never sorts", () => {
    mount();
    setSymbols("#!#");
    fireEvent.blur(symbols());
    expect(symbols().value).toBe("#!");
  });

  it("typing a character that normalizes to the same set does not regenerate", () => {
    mount();
    setSymbols("!#");
    const shown = text();
    const before = calls();
    setSymbols("!#a");
    setSymbols("!#a ");
    setSymbols("!!##");
    expect(calls()).toBe(before);
    expect(text()).toBe(shown);
    expect(symbols().value).toBe("!!##");
  });

  it("a set of exactly SYMBOL_SET_MAX usable symbols is kept whole on blur", () => {
    mount();
    const all = Array.from({ length: 0x7e - 0x21 + 1 }, (_, i) =>
      String.fromCharCode(0x21 + i),
    )
      .filter((ch) => /[^A-Za-z0-9]/.test(ch))
      .join("");
    expect(all).toHaveLength(SYMBOL_SET_MAX);
    setSymbols(all);
    fireEvent.blur(symbols());
    expect(symbols().value).toBe(all);
  });

  it("a long mixed paste is capped to SYMBOL_SET_MAX on blur", () => {
    mount();
    const all = Array.from({ length: 0x7e - 0x21 + 1 }, (_, i) =>
      String.fromCharCode(0x21 + i),
    )
      .filter((ch) => /[^A-Za-z0-9]/.test(ch))
      .join("");
    const paste = (all + "abcXYZ789 ").repeat(2);
    expect(paste.length).toBeGreaterThan(SYMBOL_SET_MAX + 1);
    setSymbols(paste);
    fireEvent.blur(symbols());
    expect(symbols().value).toHaveLength(SYMBOL_SET_MAX);
  });

  it("while Symbols is off the input is disabled, keeps its value and the hint says so", async () => {
    mount();
    setSymbols("!#");
    await toggle("symbols");
    expect(symbols().disabled).toBe(true);
    expect(symbols().value).toBe("!#");
    expect(symbolHint()).toBe(OFF_HINT);
    await toggle("symbols");
    expect(symbols().disabled).toBe(false);
    expect(symbolHint()).toBe(RULE_HINT);
  });
});

describe("Avoid look-alikes (PWD-06)", () => {
  it("renders the always-visible hint from LOOK_ALIKES", () => {
    mount();
    const hint = document.getElementById("password-lookalikes-hint");
    expect(hint?.textContent).toBe("Removes 0 O o 1 l I |");
    expect(hint?.textContent).toBe(
      `Removes ${LOOK_ALIKES.split("").join(" ")}`,
    );
    const toggleEl = screen.getByTestId("password-lookalikes");
    expect(toggleEl.getAttribute("aria-describedby")).toBe(
      "password-lookalikes-hint",
    );
    expect(toggleEl.getAttribute("aria-checked")).toBe("false");
  });

  it("no output character is a look-alike across 10 regenerations at length 128", async () => {
    mount();
    setLength("128");
    await act(async () => {
      fireEvent.click(screen.getByTestId("password-lookalikes"));
    });
    for (let i = 0; i < 10; i++) {
      await regenerate();
      expect(text()).toHaveLength(128);
      for (const ch of LOOK_ALIKES) expect(text()).not.toContain(ch);
    }
  });

  it.each(["symbols first", "look-alikes first"])(
    "symbol set '|' with look-alikes on has no error and uses the default symbols (%s)",
    async (order) => {
      mount();
      setLength("128");
      const lookalikes = async () => {
        await act(async () => {
          fireEvent.click(screen.getByTestId("password-lookalikes"));
        });
      };
      if (order === "symbols first") {
        setSymbols("|");
        await lookalikes();
      } else {
        await lookalikes();
        setSymbols("|");
      }
      expect(screen.queryByTestId("password-error")).toBeNull();
      expect(symbolChars().length).toBeGreaterThan(0);
      for (const ch of symbolChars()) {
        expect(DEFAULT_SYMBOLS).toContain(ch);
        expect(LOOK_ALIKES).not.toContain(ch);
      }
    },
  );
});

describe("Option input attributes (D-08)", () => {
  it.each(["password-length", "password-symbols"])(
    "%s carries every autofill and spellcheck guard",
    (testId) => {
      mount();
      const el = screen.getByTestId(testId);
      expect(el.getAttribute("type")).toBe("text");
      expect(el.getAttribute("spellcheck")).toBe("false");
      expect(el.getAttribute("autocorrect")).toBe("off");
      expect(el.getAttribute("autocapitalize")).toBe("off");
      expect(el.getAttribute("autocomplete")).toBe("off");
      expect(el.hasAttribute("data-1p-ignore")).toBe(true);
      expect(el.getAttribute("data-lpignore")).toBe("true");
      expect(el.hasAttribute("data-bwignore")).toBe(true);
      expect(el.getAttribute("data-form-type")).toBe("other");
      expect(el.hasAttribute("name")).toBe(false);
    },
  );

  it("the slider has autocomplete off and the tool contains no form element", () => {
    const { container } = mount();
    expect(slider().getAttribute("autocomplete")).toBe("off");
    expect(container.querySelector("form, fieldset, output")).toBeNull();
  });
});
