import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { BATCH_MAX, BATCH_MIN } from "@/lib/password";
import { loadWordlist } from "@/lib/password/wordlist";
import { PasswordTool } from "./PasswordTool";
import { cycleFill } from "./password-test-utils";

vi.mock("@/lib/password/wordlist", () => ({ loadWordlist: vi.fn() }));

const HINT = `Enter a number between ${BATCH_MIN} and ${BATCH_MAX}`;
const COPY_ERROR = "Couldn't copy — select the text and copy manually.";

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

function batchInput(): HTMLInputElement {
  return screen.getByTestId("password-batch-count") as HTMLInputElement;
}

function setBatch(value: string) {
  fireEvent.change(batchInput(), { target: { value } });
}

function blurBatch() {
  fireEvent.blur(batchInput());
}

function rows(): HTMLElement[] {
  return screen.queryAllByTestId("password-row");
}

function rowValues(): string[] {
  return screen
    .queryAllByTestId("password-row-value")
    .map((el) => el.textContent ?? "");
}

/** Every displayed password, whether in the hero or in the batch list. */
function displayed(): string[] {
  const hero = screen.queryByTestId("password-output");
  if (hero) return [hero.textContent ?? ""];
  return rowValues();
}

function status(): string {
  return screen.queryByTestId("password-status")?.textContent ?? "";
}

async function click(el: HTMLElement) {
  await act(async () => {
    fireEvent.click(el);
  });
}

/**
 * POUT-05: no element under password-tool has any attribute other than
 * data-kind that contains a displayed password, and no input value or
 * placeholder does either.
 */
function expectNoValueInAttributes(values: string[]) {
  const root = screen.getByTestId("password-tool");
  const all = [root, ...Array.from(root.querySelectorAll("*"))];
  for (const el of all) {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name === "data-kind") continue;
      for (const v of values) {
        expect(
          attr.value.includes(v),
          `attribute ${attr.name} on <${el.tagName.toLowerCase()}> must not hold a password`,
        ).toBe(false);
      }
    }
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      for (const v of values) {
        expect(el.value.includes(v)).toBe(false);
        expect(el.placeholder.includes(v)).toBe(false);
      }
    }
  }
  for (const v of values) {
    expect(status().includes(v)).toBe(false);
  }
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

describe("Batch count input (POUT-02, D-05, D-08)", () => {
  it("renders at the committed count with the full D-08 attribute set", () => {
    mount();
    const el = batchInput();
    expect(el.value).toBe("1");
    expect(el.type).toBe("text");
    expect(el.getAttribute("inputmode")).toBe("numeric");
    expect(el.getAttribute("autocomplete")).toBe("off");
    expect(el.getAttribute("spellcheck")).toBe("false");
    expect(el.getAttribute("autocorrect")).toBe("off");
    expect(el.getAttribute("autocapitalize")).toBe("off");
    expect(el.hasAttribute("data-1p-ignore")).toBe(true);
    expect(el.getAttribute("data-lpignore")).toBe("true");
    expect(el.hasAttribute("data-bwignore")).toBe(true);
    expect(el.getAttribute("data-form-type")).toBe("other");
    expect(el.hasAttribute("name")).toBe(false);
    expect(el.closest("form")).toBeNull();
    expect(screen.queryByTestId("password-batch-count-hint")).toBeNull();
  });

  it("a bookmarked ?n=5 loads the draft at 5", () => {
    mount("?n=5");
    expect(batchInput().value).toBe("5");
  });

  it.each([
    ["above the maximum", String(BATCH_MAX + 1)],
    ["zero", "0"],
    ["empty", ""],
    ["letters", "abc"],
    ["fractional", "2.5"],
  ])("%s shows the hint and keeps the view and output", (_name, draft) => {
    mount("?n=3");
    const before = rowValues();
    const callsBefore = grv.mock.calls.length;
    setBatch(draft);
    const hint = screen.getByTestId("password-batch-count-hint");
    expect(hint.textContent).toBe(HINT);
    expect(batchInput().getAttribute("aria-invalid")).toBe("true");
    expect(batchInput().getAttribute("aria-describedby")).toBe(
      "password-batch-count-hint",
    );
    expect(rowValues()).toEqual(before);
    expect(grv.mock.calls.length).toBe(callsBefore);
  });

  it("blur clamps 21 to 20, 0 to 1 and restores the committed value for an empty draft", () => {
    mount("?n=3");
    setBatch("21");
    blurBatch();
    expect(batchInput().value).toBe("20");
    expect(rows()).toHaveLength(20);
    expect(screen.queryByTestId("password-batch-count-hint")).toBeNull();

    setBatch("0");
    blurBatch();
    expect(batchInput().value).toBe("1");
    expect(screen.getByTestId("password-hero")).toBeTruthy();

    setBatch("");
    expect(screen.getByTestId("password-batch-count-hint")).toBeTruthy();
    blurBatch();
    expect(batchInput().value).toBe("1");
    expect(screen.queryByTestId("password-batch-count-hint")).toBeNull();
  });
});

describe("Hero or batch view (POUT-02, D-10)", () => {
  it("batch 1 renders the hero, no count text and no Copy all", () => {
    mount();
    expect(screen.getByTestId("password-hero")).toBeTruthy();
    expect(screen.queryByTestId("password-batch")).toBeNull();
    expect(screen.queryByTestId("password-copy-all")).toBeNull();
    expect(screen.queryAllByTestId("password-row")).toHaveLength(0);
  });

  it("batch 2 renders the toolbar, Copy all, Regenerate and exactly 2 rows", () => {
    mount();
    setBatch("2");
    const batch = screen.getByTestId("password-batch");
    expect(within(batch).getByText("2 passwords")).toBeTruthy();
    expect(within(batch).getByTestId("password-copy-all")).toBeTruthy();
    expect(within(batch).getByTestId("password-regenerate")).toBeTruthy();
    expect(rows()).toHaveLength(2);
    expect(screen.queryByTestId("password-hero")).toBeNull();
    expect(screen.queryByTestId("password-output")).toBeNull();
  });

  it("batch 20 (BATCH_MAX) renders 20 rows", () => {
    mount();
    setBatch(String(BATCH_MAX));
    expect(rows()).toHaveLength(BATCH_MAX);
    expect(
      within(screen.getByTestId("password-batch")).getByText(
        `${BATCH_MAX} passwords`,
      ),
    ).toBeTruthy();
  });

  it("batch 5 then 1 brings the hero back", () => {
    mount();
    setBatch("5");
    expect(rows()).toHaveLength(5);
    setBatch("1");
    expect(screen.getByTestId("password-hero")).toBeTruthy();
    expect(screen.queryByTestId("password-batch")).toBeNull();
  });

  it("a bookmarked ?n=5 shows 5 rows of 20 characters", () => {
    mount("?n=5");
    expect(rows()).toHaveLength(5);
    for (const v of rowValues()) {
      expect(v).toHaveLength(20);
    }
    expect(
      within(screen.getByTestId("password-batch")).getByText("5 passwords"),
    ).toBeTruthy();
  });

  it("the batch list never renders with zero rows", () => {
    mount("?n=3");
    setBatch("");
    expect(rows().length).toBeGreaterThan(0);
    blurBatch();
    expect(rows().length).toBeGreaterThan(0);
  });

  it("each row value carries translate, spellcheck, the mono classes and no form ancestor", () => {
    mount("?n=4");
    const values = screen.getAllByTestId("password-row-value");
    expect(values).toHaveLength(4);
    for (const el of values) {
      expect(el.getAttribute("translate")).toBe("no");
      expect(el.getAttribute("spellcheck")).toBe("false");
      expect(el.className).toContain("font-mono");
      expect(el.className).toContain("break-all");
      expect(el.className).toContain("select-all");
      expect(el.closest("form")).toBeNull();
      expect(el.querySelectorAll("span[data-kind]").length).toBeGreaterThan(0);
    }
  });

  it("row copy buttons are named 'Copy password {i}' (1-based) at rest", () => {
    mount("?n=3");
    const names = screen
      .getAllByTestId("password-row-copy")
      .map((b) => b.getAttribute("aria-label"));
    expect(names).toEqual([
      "Copy password 1",
      "Copy password 2",
      "Copy password 3",
    ]);
  });
});

describe("Copy all and row copy (POUT-01, POUT-02)", () => {
  it("Copy all writes the row values in order joined with a newline, no trailing newline", async () => {
    mount("?n=5");
    const values = rowValues();
    const btn = screen.getByTestId("password-copy-all");
    expect(btn.getAttribute("aria-label")).toBe("Copy all passwords");
    await click(btn);
    expect(writeText).toHaveBeenCalledTimes(1);
    const written = writeText.mock.calls[0]![0] as string;
    expect(written).toBe(values.join("\n"));
    expect(written.endsWith("\n")).toBe(false);
    expect(written.split("\n")).toHaveLength(5);
    expect(screen.getByTestId("password-copy-all").getAttribute("aria-label")).toBe(
      "Copied!",
    );
  });

  it("row 3's copy writes row 3's value and only row 3 shows Copied!", async () => {
    mount("?n=5");
    const values = rowValues();
    const buttons = screen.getAllByTestId("password-row-copy");
    await click(buttons[2]!);
    expect(writeText).toHaveBeenCalledWith(values[2]);
    const names = screen
      .getAllByTestId("password-row-copy")
      .map((b) => b.getAttribute("aria-label"));
    expect(names).toEqual([
      "Copy password 1",
      "Copy password 2",
      "Copied!",
      "Copy password 4",
      "Copy password 5",
    ]);
    expect(within(screen.getAllByTestId("password-row")[2]!).getByText("Copied!")).toBeTruthy();
  });

  it("rows confirm independently: a second row copy leaves the first confirmed", async () => {
    mount("?n=3");
    const buttons = screen.getAllByTestId("password-row-copy");
    await click(buttons[0]!);
    await click(buttons[1]!);
    const names = screen
      .getAllByTestId("password-row-copy")
      .map((b) => b.getAttribute("aria-label"));
    expect(names).toEqual(["Copied!", "Copied!", "Copy password 3"]);
  });

  it("Regenerate right after Copy all replaces every value and clears the confirmation", async () => {
    mount("?n=5");
    const before = rowValues();
    await click(screen.getByTestId("password-copy-all"));
    expect(screen.getByTestId("password-copy-all").getAttribute("aria-label")).toBe(
      "Copied!",
    );
    await click(screen.getByTestId("password-regenerate"));
    const after = rowValues();
    expect(after).toHaveLength(5);
    for (let i = 0; i < 5; i++) expect(after[i]).not.toBe(before[i]);
    expect(screen.getByTestId("password-copy-all").getAttribute("aria-label")).toBe(
      "Copy all passwords",
    );
  });

  it("Regenerate right after a row copy leaves no row showing Copied!", async () => {
    mount("?n=5");
    await click(screen.getAllByTestId("password-row-copy")[1]!);
    expect(
      screen.getAllByTestId("password-row-copy")[1]!.getAttribute("aria-label"),
    ).toBe("Copied!");
    await click(screen.getByTestId("password-regenerate"));
    for (const [i, b] of screen.getAllByTestId("password-row-copy").entries()) {
      expect(b.getAttribute("aria-label")).toBe(`Copy password ${i + 1}`);
    }
  });

  it("a rejected row copy shows the failure text under that row; values unchanged", async () => {
    mount("?n=3");
    const before = rowValues();
    writeText.mockRejectedValue(new Error("denied"));
    await click(screen.getAllByTestId("password-row-copy")[1]!);
    const rowEls = screen.getAllByTestId("password-row");
    expect(within(rowEls[1]!).getByText(COPY_ERROR)).toBeTruthy();
    expect(within(rowEls[0]!).queryByText(COPY_ERROR)).toBeNull();
    expect(within(rowEls[2]!).queryByText(COPY_ERROR)).toBeNull();
    expect(rowValues()).toEqual(before);
  });

  it("a rejected Copy all shows the failure text under the toolbar; values unchanged", async () => {
    mount("?n=3");
    const before = rowValues();
    writeText.mockRejectedValue(new Error("denied"));
    await click(screen.getByTestId("password-copy-all"));
    const batch = screen.getByTestId("password-batch");
    expect(within(batch).getAllByText(COPY_ERROR)).toHaveLength(1);
    expect(
      within(screen.getByTestId("password-batch-list")).queryByText(COPY_ERROR),
    ).toBeNull();
    expect(rowValues()).toEqual(before);
  });
});

describe("Batch error states (D-03, PWD-07)", () => {
  it("crypto missing at ?n=5: the error replaces the toolbar and the list entirely", () => {
    vi.stubGlobal("crypto", undefined);
    mount("?n=5");
    expect(screen.getByTestId("password-error")).toBeTruthy();
    for (const id of [
      "password-batch",
      "password-row",
      "password-copy-all",
      "password-regenerate",
    ]) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
  });

  it("a fill that throws after 25 calls at ?n=5 shows the error and zero rows, never a partial list", () => {
    const base = cycleFill([0, 26, 52, 62]);
    let n = 0;
    vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation(((
      buf: Uint32Array,
    ) => {
      n += 1;
      if (n > 25) throw new Error("entropy exhausted");
      return base(buf);
    }) as never);
    mount("?n=5");
    expect(screen.getByTestId("password-error")).toBeTruthy();
    expect(screen.queryAllByTestId("password-row")).toHaveLength(0);
    expect(screen.queryByTestId("password-batch")).toBeNull();
  });
});

describe("POUT-05 attribute scan", () => {
  it("no password appears in any attribute, value or placeholder at batch 1 across load, copy and Regenerate", async () => {
    mount();
    expectNoValueInAttributes(displayed());
    await click(screen.getByTestId("password-copy"));
    expectNoValueInAttributes(displayed());
    await click(screen.getByTestId("password-regenerate"));
    expectNoValueInAttributes(displayed());
    const hero = screen.getByTestId("password-output");
    expect(hero.getAttribute("translate")).toBe("no");
    expect(hero.getAttribute("spellcheck")).toBe("false");
    expect(hero.closest("form")).toBeNull();
  });

  it("no password appears in any attribute, value or placeholder at batch 5 across load, row copy, Copy all and Regenerate", async () => {
    mount("?n=5");
    expectNoValueInAttributes(displayed());
    await click(screen.getAllByTestId("password-row-copy")[2]!);
    expectNoValueInAttributes(displayed());
    await click(screen.getByTestId("password-copy-all"));
    expectNoValueInAttributes(displayed());
    await click(screen.getByTestId("password-regenerate"));
    expectNoValueInAttributes(displayed());
    for (const el of screen.getAllByTestId("password-row-value")) {
      expect(el.getAttribute("translate")).toBe("no");
      expect(el.getAttribute("spellcheck")).toBe("false");
      expect(el.closest("form")).toBeNull();
    }
  });
});

describe("Live region (D-11, POUT-05)", () => {
  it("is mounted at load: polite, sr-only, empty and outside the output zone", () => {
    mount();
    const el = screen.getByTestId("password-status");
    expect(el.getAttribute("aria-live")).toBe("polite");
    expect(el.className).toContain("sr-only");
    expect(el.textContent).toBe("");
    expect(
      screen.getByTestId("password-output-zone").contains(el),
    ).toBe(false);
    expect(screen.getByTestId("password-tool").contains(el)).toBe(true);
  });

  it("hero Copy announces Copied", async () => {
    mount();
    await click(screen.getByTestId("password-copy"));
    await waitFor(() => expect(status()).toBe("Copied"));
  });

  it("Copy all announces Copied all passwords", async () => {
    mount("?n=3");
    await click(screen.getByTestId("password-copy-all"));
    await waitFor(() => expect(status()).toBe("Copied all passwords"));
  });

  it("a row copy announces Copied", async () => {
    mount("?n=3");
    await click(screen.getAllByTestId("password-row-copy")[0]!);
    await waitFor(() => expect(status()).toBe("Copied"));
  });

  it("Regenerate announces New password generated at batch 1 and the count at batch 5", async () => {
    mount();
    await click(screen.getByTestId("password-regenerate"));
    await waitFor(() => expect(status()).toBe("New password generated"));
    cleanup();
    mount("?n=5");
    await click(screen.getByTestId("password-regenerate"));
    await waitFor(() => expect(status()).toBe("5 new passwords generated"));
  });

  it("a batch commit announces the new count, and returning to 1 announces the singular", async () => {
    mount();
    await act(async () => {
      setBatch("3");
    });
    await waitFor(() => expect(status()).toBe("3 new passwords generated"));
    await act(async () => {
      setBatch("1");
    });
    await waitFor(() => expect(status()).toBe("New password generated"));
  });

  it("a repeated identical announcement passes through empty and returns", async () => {
    mount();
    await click(screen.getByTestId("password-regenerate"));
    await waitFor(() => expect(status()).toBe("New password generated"));
    // Synchronous click: the clear to "" is visible before the next tick.
    fireEvent.click(screen.getByTestId("password-regenerate"));
    expect(status()).toBe("");
    await waitFor(() => expect(status()).toBe("New password generated"));
  });

  it("slider, Length input, set switches, symbol draft and look-alikes never announce", async () => {
    mount();
    const slider = screen.getByTestId("password-length-slider");
    fireEvent.change(slider, { target: { value: "40" } });
    fireEvent.change(screen.getByTestId("password-length"), {
      target: { value: "33" },
    });
    await click(screen.getByTestId("password-set-digits"));
    fireEvent.change(screen.getByTestId("password-symbols"), {
      target: { value: "!?" },
    });
    await click(screen.getByTestId("password-lookalikes"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(status()).toBe("");
  });

  it("an invalid batch draft does not announce", async () => {
    mount("?n=3");
    setBatch("99");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(status()).toBe("");
  });

  it("a rejected clipboard write stays silent and keeps the values", async () => {
    mount();
    const before = displayed();
    writeText.mockRejectedValue(new Error("denied"));
    await click(screen.getByTestId("password-copy"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(status()).toBe("");
    expect(screen.getByText(COPY_ERROR)).toBeTruthy();
    expect(displayed()).toEqual(before);
  });

  it("stays mounted and empty in the error state", async () => {
    vi.stubGlobal("crypto", undefined);
    mount();
    expect(screen.getByTestId("password-error")).toBeTruthy();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(screen.getByTestId("password-status").textContent).toBe("");
  });

  it("never holds a displayed password after any action", async () => {
    mount("?n=4");
    await click(screen.getByTestId("password-copy-all"));
    await waitFor(() => expect(status()).toBe("Copied all passwords"));
    for (const v of displayed()) expect(status().includes(v)).toBe(false);
    await click(screen.getByTestId("password-regenerate"));
    await waitFor(() => expect(status()).toBe("4 new passwords generated"));
    for (const v of displayed()) expect(status().includes(v)).toBe(false);
  });
});


// --- Passphrase output parity (PHR-01, D-20 a, b, e; UI-SPEC decisions 12, 28) ---

/** Exactly 7,776 distinct letters-only words, so a separator is the only symbol. */
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

async function mountPassphrase(search = "") {
  vi.mocked(loadWordlist).mockResolvedValue(fixtureList());
  mount(`?mode=passphrase${search}`);
  await waitFor(() => expect(displayed()[0]).toBeTruthy());
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });
}

/** Counts how many times the live region transitions to the given text. */
function countAnnouncements(phrase: string): () => number {
  const node = screen.getByTestId("password-status");
  let count = 0;
  const observer = new MutationObserver(() => {
    if (node.textContent === phrase) count += 1;
  });
  observer.observe(node, { childList: true, characterData: true, subtree: true });
  return () => count;
}

/**
 * Waits outside act on purpose: inside act React batches the live region's
 * clear and set into one commit, which hides the re-announcement that a real
 * browser performs between two timers.
 */
async function tick(ms = 30) {
  const g = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const before = g.IS_REACT_ACT_ENVIRONMENT;
  g.IS_REACT_ACT_ENVIRONMENT = false;
  try {
    await new Promise((r) => setTimeout(r, ms));
  } finally {
    g.IS_REACT_ACT_ENVIRONMENT = before;
  }
}

describe("Passphrase output names, counts and announcements (PHR-01, D-20b)", () => {
  it("batch 1: hero is named Copy passphrase and Regenerate announces the passphrase phrase", async () => {
    await mountPassphrase();
    expect(
      screen.getByTestId("password-copy").getAttribute("aria-label"),
    ).toBe("Copy passphrase");
    expect(screen.queryByTestId("password-batch")).toBeNull();
    await click(screen.getByTestId("password-regenerate"));
    await waitFor(() => expect(status()).toBe("New passphrase generated"));
  });

  it("batch 3: rows, toolbar, Copy all text and announcements use the passphrase noun", async () => {
    await mountPassphrase("&n=3");
    expect(rows()).toHaveLength(3);
    expect(
      screen
        .getAllByTestId("password-row-copy")
        .map((b) => b.getAttribute("aria-label")),
    ).toEqual(["Copy passphrase 1", "Copy passphrase 2", "Copy passphrase 3"]);
    expect(screen.getByText("3 passphrases")).toBeTruthy();
    const copyAll = screen.getByTestId("password-copy-all");
    expect(copyAll.getAttribute("aria-label")).toBe("Copy all passphrases");
    const values = rowValues();
    await click(copyAll);
    expect(writeText).toHaveBeenCalledWith(values.join("\n"));
    await waitFor(() => expect(status()).toBe("Copied all passphrases"));
    await click(screen.getByTestId("password-regenerate"));
    await waitFor(() => expect(status()).toBe("3 new passphrases generated"));
  });

  it("Password mode keeps every Phase 13 name and phrase", async () => {
    mount("?n=3");
    expect(screen.getByText("3 passwords")).toBeTruthy();
    expect(
      screen.getByTestId("password-copy-all").getAttribute("aria-label"),
    ).toBe("Copy all passwords");
    expect(
      screen.getAllByTestId("password-row-copy")[0]!.getAttribute("aria-label"),
    ).toBe("Copy password 1");
  });
});

describe("Repeat copy re-announces (D-20a, closes 13-REVIEW IN-05)", () => {
  it("copying the hero twice inside 2 s announces Copied twice", async () => {
    mount();
    const seen = countAnnouncements("Copied");
    await click(screen.getByTestId("password-copy"));
    await tick();
    await click(screen.getByTestId("password-copy"));
    await tick();
    expect(seen()).toBe(2);
  });

  it("a row copied twice announces Copied twice", async () => {
    mount("?n=3");
    const seen = countAnnouncements("Copied");
    await click(screen.getAllByTestId("password-row-copy")[1]!);
    await tick();
    await click(screen.getAllByTestId("password-row-copy")[1]!);
    await tick();
    expect(seen()).toBe(2);
  });

  it("the keyboard chord twice announces Copied twice", async () => {
    mount();
    const seen = countAnnouncements("Copied");
    for (let i = 0; i < 2; i++) {
      await act(async () => {
        fireEvent.keyDown(window, { key: "c", ctrlKey: true });
      });
      await tick();
    }
    expect(seen()).toBe(2);
  });

  it("Copy all twice announces Copied all passphrases twice", async () => {
    await mountPassphrase("&n=3");
    const seen = countAnnouncements("Copied all passphrases");
    await click(screen.getByTestId("password-copy-all"));
    await tick();
    await click(screen.getByTestId("password-copy-all"));
    await tick();
    expect(seen()).toBe(2);
  });

  it("a rejected write announces nothing, even after an earlier success", async () => {
    mount();
    await click(screen.getByTestId("password-copy"));
    await tick();
    writeText.mockRejectedValue(new Error("denied"));
    const seen = countAnnouncements("Copied");
    await click(screen.getByTestId("password-copy"));
    await tick();
    expect(seen()).toBe(0);
  });
});

describe("Passphrase coloring and wrapping (D-20e, UI-SPEC decision 12)", () => {
  it("the '_' separator renders one wbr per separator and textContent is the raw value", async () => {
    await mountPassphrase("&sep=underscore&words=5&num=1");
    const el = screen.getByTestId("password-output");
    const value = el.textContent ?? "";
    expect(el.querySelectorAll("wbr")).toHaveLength(4);
    expect(value.split("_")).toHaveLength(5);
    expect(el.querySelectorAll('span[data-kind="symbol"]')).toHaveLength(4);
    expect(el.querySelectorAll('span[data-kind="digit"]')).toHaveLength(1);
    await click(screen.getByTestId("password-copy"));
    expect(writeText).toHaveBeenCalledWith(value);
  });

  it("the '.' separator renders wbr in batch rows too", async () => {
    await mountPassphrase("&sep=dot&words=4&n=2");
    for (const row of screen.getAllByTestId("password-row-value")) {
      expect(row.querySelectorAll("wbr")).toHaveLength(3);
      expect((row.textContent ?? "").split(".")).toHaveLength(4);
    }
  });

  it("'-' breaks before each separator, which stays attached to the next word (UI-1)", async () => {
    await mountPassphrase("&words=4");
    const el = screen.getByTestId("password-output");
    const value = el.textContent ?? "";
    expect(el.querySelectorAll("wbr")).toHaveLength(3);
    expect(value.split("-")).toHaveLength(4);
    // Every wbr sits directly before a no-wrap group that starts with the
    // separator and holds the following word, so no line can end in a bare "-".
    for (const wbr of Array.from(el.querySelectorAll("wbr"))) {
      const group = wbr.nextElementSibling as HTMLElement;
      expect(group.className).toContain("whitespace-nowrap");
      expect((group.textContent ?? "").startsWith("-")).toBe(true);
      expect((group.textContent ?? "").length).toBeGreaterThan(1);
    }
  });

  it("'_' and '.' also break before the separator", async () => {
    for (const [sep, ch] of [
      ["underscore", "_"],
      ["dot", "."],
    ] as const) {
      await mountPassphrase(`&sep=${sep}&words=4`);
      const el = screen.getByTestId("password-output");
      for (const wbr of Array.from(el.querySelectorAll("wbr"))) {
        const group = wbr.nextElementSibling as HTMLElement;
        expect(group.className).toContain("whitespace-nowrap");
        expect((group.textContent ?? "").startsWith(ch)).toBe(true);
        expect(
          (wbr.previousElementSibling?.textContent ?? "").endsWith(ch),
        ).toBe(false);
      }
      cleanup();
    }
  });

  it("Space renders no wbr; Space is a real space", async () => {
    await mountPassphrase("&sep=space&words=4");
    const el = screen.getByTestId("password-output");
    expect(el.querySelectorAll("wbr")).toHaveLength(0);
    expect((el.textContent ?? "").split(" ")).toHaveLength(4);
  });

  it("Password mode renders no wbr and no no-wrap group", () => {
    mount();
    const el = screen.getByTestId("password-output");
    expect(el.querySelectorAll("wbr")).toHaveLength(0);
    expect(el.querySelector(".whitespace-nowrap")).toBeNull();
  });

  it("the value uses overflow-wrap anywhere in Passphrase mode and break-all in Password mode", async () => {
    await mountPassphrase();
    const cls = screen.getByTestId("password-output").className;
    expect(cls).toContain("[overflow-wrap:anywhere]");
    expect(cls).not.toContain("break-all");
    cleanup();
    mount();
    const pw = screen.getByTestId("password-output").className;
    expect(pw).toContain("break-all");
    expect(pw).not.toContain("overflow-wrap");
  });
});

describe("Passphrase errors and copy-failure styling (UI-SPEC decisions 28, copywriting)", () => {
  it("a missing Web Crypto shows the passphrase sentence", async () => {
    vi.mocked(loadWordlist).mockResolvedValue(fixtureList());
    vi.stubGlobal("crypto", undefined);
    mount("?mode=passphrase");
    await tick(30);
    expect(screen.getByTestId("password-error").textContent).toContain(
      "Secure random generation isn't available in this browser, so no passphrase was generated.",
    );
  });

  it("an unexpected failure shows the passphrase sentence", async () => {
    vi.mocked(loadWordlist).mockResolvedValue(fixtureList().slice(0, 100));
    mount("?mode=passphrase");
    await tick(30);
    expect(screen.getByTestId("password-error").textContent).toContain(
      "Something went wrong, so no passphrase was generated.",
    );
  });

  it("Password mode error copy is unchanged", () => {
    vi.stubGlobal("crypto", undefined);
    mount();
    expect(screen.getByTestId("password-error").textContent).toContain(
      "so no password was generated.",
    );
  });

  it("the batch-toolbar copy-failure line uses text-foreground", async () => {
    mount("?n=3");
    writeText.mockRejectedValue(new Error("denied"));
    await click(screen.getByTestId("password-copy-all"));
    await tick();
    const line = screen.getByText(COPY_ERROR);
    expect(line.className).toContain("text-foreground");
    expect(line.className).not.toContain("text-muted-foreground");
  });
});
