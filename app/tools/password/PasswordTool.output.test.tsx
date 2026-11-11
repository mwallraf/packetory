import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { BATCH_MAX, BATCH_MIN } from "@/lib/password";
import { PasswordTool } from "./PasswordTool";
import { cycleFill } from "./password-test-utils";

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
  return screen.getByTestId("password-status").textContent ?? "";
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
