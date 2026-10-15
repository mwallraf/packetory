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
      .filter((tid) => !tid.endsWith("-value"))
      .map((tid) => tid.replace("hash-row-", ""));
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
