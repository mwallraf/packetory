import { StrictMode } from "react";
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
  type FakeHashClient,
} from "./hash-test-utils";

vi.mock("@/lib/hash/client", () => ({ createHashClient: vi.fn() }));

const ERROR_COPY =
  "Couldn't compute digests in this browser. Reload the page and try again.";

let fakes: FakeHashClient[];

function liveClient(): FakeHashClient {
  const last = fakes[fakes.length - 1];
  if (!last) throw new Error("no client created");
  return last;
}

function type(value: string) {
  fireEvent.change(screen.getByTestId("hash-input"), { target: { value } });
}

function rowValue(id: string): string {
  return screen.getByTestId(`hash-row-${id}-value`).textContent ?? "";
}

function expectRowsToBe(fill: number) {
  const digests = fakeDigests(fill);
  for (const algo of ALGORITHMS) {
    expect(rowValue(algo.id)).toBe(toHex(digests[algo.id]));
  }
}

async function settle(
  index: number,
  outcome: Parameters<FakeHashClient["starts"][number]["resolve"]>[0],
) {
  await act(async () => {
    liveClient().starts[index]!.resolve(outcome);
  });
}

beforeEach(() => {
  fakes = [];
  vi.mocked(createHashClient).mockImplementation(() => {
    const fake = createFakeHashClient();
    fakes.push(fake);
    return fake.client;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.mocked(createHashClient).mockReset();
});

describe("HashTool first paint (TEXT-01)", () => {
  it("TEXT-01: shows the sample and its 10 digests on mount without calling the worker", () => {
    render(<HashTool />);
    expect(createHashClient).toHaveBeenCalledTimes(1);
    expect(liveClient().starts).toHaveLength(0);
    expect(screen.getByTestId("hash-input")).toHaveProperty(
      "value",
      SAMPLE_TEXT,
    );
    for (const algo of ALGORITHMS) {
      expect(rowValue(algo.id)).toBe(SAMPLE_DIGEST_HEX[algo.id]);
    }
  });

  it("TEXT-01: renders exactly 10 rows in ALGORITHMS order", () => {
    render(<HashTool />);
    const ids = Array.from(
      screen
        .getByTestId("hash-rows")
        .querySelectorAll<HTMLElement>('[data-testid^="hash-row-"]'),
    )
      .map((el) => el.dataset.testid!)
      .map((tid) => tid.replace("hash-row-", ""))
      .filter((id) => ALGORITHMS.some((a) => a.id === id));
    expect(ids).toEqual(ALGORITHMS.map((a) => a.id));
  });

  it("TEXT-01: the textarea carries the autofill-ignore attributes and the fixed-size classes", () => {
    render(<HashTool />);
    const el = screen.getByTestId("hash-input");
    expect(el.getAttribute("spellcheck")).toBe("false");
    expect(el.getAttribute("autocorrect")).toBe("off");
    expect(el.getAttribute("autocapitalize")).toBe("off");
    expect(el.getAttribute("autocomplete")).toBe("off");
    expect(el.hasAttribute("data-1p-ignore")).toBe(true);
    expect(el.getAttribute("data-lpignore")).toBe("true");
    expect(el.getAttribute("data-form-type")).toBe("other");
    expect(el.className).toContain("field-sizing-fixed");
    expect(el.className).toContain("max-h-[320px]");
  });
});

describe("HashTool live hashing (TEXT-02)", () => {
  it("TEXT-02: typing starts a job with the exact text and applies its result", async () => {
    render(<HashTool />);
    type("abc");
    const fake = liveClient();
    expect(fake.starts).toHaveLength(1);
    expect(fake.starts[0]!.input).toEqual({ kind: "text", text: "abc" });
    await settle(0, { status: "done", digests: fakeDigests(7) });
    expectRowsToBe(7);
  });

  it("TEXT-02: an older result resolving after a newer one is discarded", async () => {
    render(<HashTool />);
    type("a");
    type("ab");
    expect(liveClient().starts).toHaveLength(2);
    await settle(1, { status: "done", digests: fakeDigests(2) });
    await settle(0, { status: "done", digests: fakeDigests(1) });
    expectRowsToBe(2);
  });

  it("TEXT-02: a cancelled outcome leaves the displayed digests unchanged", async () => {
    render(<HashTool />);
    type("a");
    await settle(0, { status: "cancelled" });
    for (const algo of ALGORITHMS) {
      expect(rowValue(algo.id)).toBe(SAMPLE_DIGEST_HEX[algo.id]);
    }
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("TEXT-02: typing the sample text back shows the sample digests instantly via cancel(), without start()", async () => {
    render(<HashTool />);
    type("abc");
    await settle(0, { status: "done", digests: fakeDigests(3) });
    expectRowsToBe(3);
    const fake = liveClient();
    const cancelsBefore = fake.cancel.mock.calls.length;
    type(SAMPLE_TEXT);
    expect(fake.starts).toHaveLength(1);
    expect(fake.cancel.mock.calls.length).toBe(cancelsBefore + 1);
    for (const algo of ALGORITHMS) {
      expect(rowValue(algo.id)).toBe(SAMPLE_DIGEST_HEX[algo.id]);
    }
  });

  it("TEXT-02: while a result is pending the rows are aria-busy and dimmed, then settle", async () => {
    render(<HashTool />);
    const rows = screen.getByTestId("hash-rows");
    expect(rows.getAttribute("aria-busy")).toBe("false");
    type("abc");
    expect(rows.getAttribute("aria-busy")).toBe("true");
    expect(rows.className).toContain("opacity-60");
    await settle(0, { status: "done", digests: fakeDigests(4) });
    expect(rows.getAttribute("aria-busy")).toBe("false");
    expect(rows.className).not.toContain("opacity-60");
  });

  it("TEXT-02: an error outcome shows the inline alert while the previous digests stay visible and busy", async () => {
    render(<HashTool />);
    type("abc");
    await settle(0, { status: "error", name: "Boom", message: "secret abc" });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe(ERROR_COPY);
    expect(alert.textContent).not.toContain("abc");
    expect(screen.getByTestId("hash-notice-error")).toBe(alert);
    for (const algo of ALGORITHMS) {
      expect(rowValue(algo.id)).toBe(SAMPLE_DIGEST_HEX[algo.id]);
    }
    expect(screen.getByTestId("hash-rows").getAttribute("aria-busy")).toBe(
      "true",
    );
  });

  it("TEXT-02: a rejected start() shows the same alert and a later success removes it", async () => {
    render(<HashTool />);
    type("a");
    await act(async () => {
      liveClient().starts[0]!.reject(new Error("DataCloneError"));
    });
    expect(screen.getByRole("alert").textContent).toBe(ERROR_COPY);
    type("ab");
    await settle(1, { status: "done", digests: fakeDigests(5) });
    expect(screen.queryByRole("alert")).toBeNull();
    expectRowsToBe(5);
  });

  it("TEXT-02: a rejection from a superseded job does not raise the alert", async () => {
    render(<HashTool />);
    type("a");
    type("ab");
    await act(async () => {
      liveClient().starts[0]!.reject(new Error("late"));
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("TEXT-02: works under StrictMode (first client disposed, live client used)", async () => {
    render(
      <StrictMode>
        <HashTool />
      </StrictMode>,
    );
    expect(fakes.length).toBeGreaterThanOrEqual(2);
    expect(fakes[0]!.dispose).toHaveBeenCalledTimes(1);
    type("abc");
    expect(fakes[0]!.starts).toHaveLength(0);
    expect(liveClient().starts).toHaveLength(1);
    await settle(0, { status: "done", digests: fakeDigests(6) });
    expectRowsToBe(6);
  });

  it("TEXT-02: unmount disposes the client and a late result causes no warning or error", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(<HashTool />);
    type("abc");
    const fake = liveClient();
    unmount();
    expect(fake.dispose).toHaveBeenCalledTimes(1);
    await act(async () => {
      fake.starts[0]!.resolve({ status: "done", digests: fakeDigests(9) });
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe("HashTool input meta (TEXT-03)", () => {
  it.each([
    ["hello world", "11 bytes (UTF-8)"],
    ["a", "1 byte (UTF-8)"],
    ["", "0 bytes (UTF-8)"],
    ["é", "2 bytes (UTF-8)"],
    ["€", "3 bytes (UTF-8)"],
    ["\u{1F680}", "4 bytes (UTF-8)"],
    ["\uD800", "3 bytes (UTF-8)"],
  ])("TEXT-03: %j shows %s", (value, expected) => {
    render(<HashTool />);
    if (value !== SAMPLE_TEXT) type(value);
    expect(screen.getByTestId("hash-bytes").textContent).toBe(expected);
  });

  it("TEXT-03: the hint block is always rendered and described by the textarea", () => {
    render(<HashTool />);
    const hint = screen.getByTestId("hash-input-hint");
    expect(hint.id).toBe("hash-input-meta");
    expect(hint.textContent).toContain(
      "Hashes exactly what is typed, with no trailing newline.",
    );
    expect(hint.textContent).toContain("Pasted CRLF line endings become LF.");
    expect(hint.textContent).toContain("printf '%s'");
    expect(hint.textContent).toContain("echo -n");
    expect(
      screen.getByTestId("hash-input").getAttribute("aria-describedby"),
    ).toBe("hash-input-meta");
  });

  it("TEXT-03: empty input shows the empty-string note, hashes the empty text and keeps 10 rows", () => {
    render(<HashTool />);
    expect(screen.queryByTestId("hash-notice-empty")).toBeNull();
    type("");
    expect(screen.getByTestId("hash-notice-empty").textContent).toBe(
      "Empty input. Showing the digests of an empty string.",
    );
    expect(liveClient().starts).toHaveLength(1);
    expect(liveClient().starts[0]!.input).toEqual({ kind: "text", text: "" });
    expect(
      screen
        .getByTestId("hash-rows")
        .querySelectorAll('[data-testid$="-value"]'),
    ).toHaveLength(10);
  });
});

describe("HashTool 1 MiB soft cap (TEXT-03, D-07, D-07a)", () => {
  const SOFT_CAP_COPY =
    "This text is over 1 MiB, so updates may lag. Hashing still runs.";

  afterEach(() => {
    vi.useRealTimers();
  });

  it("TEXT-03: exactly 1,048,576 bytes shows no notice and starts synchronously", () => {
    render(<HashTool />);
    type("a".repeat(1_048_576));
    expect(screen.queryByTestId("hash-notice-soft-cap")).toBeNull();
    expect(liveClient().starts).toHaveLength(1);
  });

  it("TEXT-03: 1,048,577 bytes shows the exact notice with no link and debounces start() by 150 ms", async () => {
    vi.useFakeTimers();
    render(<HashTool />);
    const big = "a".repeat(1_048_577);
    type(big);
    const notice = screen.getByTestId("hash-notice-soft-cap");
    expect(notice.textContent).toBe(SOFT_CAP_COPY);
    expect(notice.querySelector("a")).toBeNull();
    expect(liveClient().starts).toHaveLength(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(149);
    });
    expect(liveClient().starts).toHaveLength(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(liveClient().starts).toHaveLength(1);
    expect(liveClient().starts[0]!.input).toEqual({ kind: "text", text: big });
  });

  it("TEXT-03: the byte count is measured in bytes, not characters, for the cap", () => {
    vi.useFakeTimers();
    render(<HashTool />);
    // 524,289 two-byte characters = 1,048,578 bytes (> cap) but < 1 MiB chars.
    type("é".repeat(524_289));
    expect(screen.getByTestId("hash-notice-soft-cap")).toBeTruthy();
  });

  it("TEXT-03: two above-cap changes within 150 ms produce one start() with the latest text", async () => {
    vi.useFakeTimers();
    render(<HashTool />);
    type("a".repeat(1_048_577));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    const latest = "b".repeat(1_048_577);
    type(latest);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(liveClient().starts).toHaveLength(1);
    expect(liveClient().starts[0]!.input).toEqual({
      kind: "text",
      text: latest,
    });
  });

  it("TEXT-03: a below-cap change after an above-cap change cancels the timer", async () => {
    vi.useFakeTimers();
    render(<HashTool />);
    type("a".repeat(1_048_577));
    type("small");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(liveClient().starts).toHaveLength(1);
    expect(liveClient().starts[0]!.input).toEqual({
      kind: "text",
      text: "small",
    });
    expect(screen.queryByTestId("hash-notice-soft-cap")).toBeNull();
  });

  it("TEXT-03: going above the cap supersedes the in-flight job immediately", () => {
    vi.useFakeTimers();
    render(<HashTool />);
    type("abc");
    const cancelsBefore = liveClient().cancel.mock.calls.length;
    type("a".repeat(1_048_577));
    expect(liveClient().cancel.mock.calls.length).toBeGreaterThan(cancelsBefore);
  });

  it("TEXT-03: unmounting with a pending debounce timer never calls start()", async () => {
    vi.useFakeTimers();
    const { unmount } = render(<HashTool />);
    type("a".repeat(1_048_577));
    const fake = liveClient();
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(fake.starts).toHaveLength(0);
  });
});
