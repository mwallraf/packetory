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

let fakes: FakeHashClient[];
let pushSpy: ReturnType<typeof vi.spyOn>;
let replaceSpy: ReturnType<typeof vi.spyOn>;

function liveClient(): FakeHashClient {
  const last = fakes[fakes.length - 1];
  if (!last) throw new Error("no client created");
  return last;
}

function setUrl(pathAndQuery: string) {
  window.history.replaceState(null, "", pathAndQuery);
}

function mount(pathAndQuery: string, strict = false) {
  setUrl(pathAndQuery);
  pushSpy = vi.spyOn(window.history, "pushState");
  replaceSpy = vi.spyOn(window.history, "replaceState");
  return render(strict ? <StrictMode><HashTool /></StrictMode> : <HashTool />);
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

function expectAllRowsPending() {
  for (const algo of ALGORITHMS) {
    const copy = screen.getByTestId(`hash-row-${algo.id}-copy`);
    expect((copy as HTMLButtonElement).disabled).toBe(true);
    expect(rowValue(algo.id)).not.toContain(SAMPLE_DIGEST_HEX[algo.id]);
    expect(rowValue(algo.id)).toContain("Computing");
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
  setUrl("/");
});

describe("HashTool ?text= restore (TEXT-04)", () => {
  it("TEXT-04: ?text=abc restores the text, hashes it, and shows pending rows until the result lands", async () => {
    mount("/tools/hash?text=abc");
    expect(screen.getByTestId("hash-input")).toHaveProperty("value", "abc");
    const fake = liveClient();
    expect(fake.starts).toHaveLength(1);
    expect(fake.starts[0]!.input).toEqual({ kind: "text", text: "abc" });
    expectAllRowsPending();
    expect(
      (screen.getByTestId("hash-copy-all") as HTMLButtonElement).disabled,
    ).toBe(true);

    await settle(0, { status: "done", digests: fakeDigests(9) });
    expectRowsToBe(9);
    expect(
      (screen.getByTestId("hash-copy-all") as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(
      (screen.getByTestId("hash-row-sha256-copy") as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("TEXT-04: an empty ?text= loads the sample and never starts the worker", () => {
    mount("/tools/hash?text=");
    expect(screen.getByTestId("hash-input")).toHaveProperty(
      "value",
      SAMPLE_TEXT,
    );
    expect(liveClient().starts).toHaveLength(0);
    for (const algo of ALGORITHMS) {
      expect(rowValue(algo.id)).toBe(SAMPLE_DIGEST_HEX[algo.id]);
    }
  });

  it("TEXT-04: no ?text= parameter loads the sample", () => {
    mount("/tools/hash");
    expect(screen.getByTestId("hash-input")).toHaveProperty(
      "value",
      SAMPLE_TEXT,
    );
    expect(liveClient().starts).toHaveLength(0);
  });

  it("TEXT-04: the first occurrence of a repeated parameter wins", () => {
    mount("/tools/hash?text=a&text=b");
    expect(screen.getByTestId("hash-input")).toHaveProperty("value", "a");
  });

  it("TEXT-04: pending verify shows Comparing... for a non-empty expected value", async () => {
    mount("/tools/hash?text=abc");
    fireEvent.change(screen.getByTestId("hash-verify"), {
      target: { value: "deadbeef" },
    });
    expect(screen.getByTestId("hash-verify-result").textContent).toContain(
      "Comparing",
    );
    await settle(0, { status: "done", digests: fakeDigests(1) });
    expect(screen.getByTestId("hash-verify-result").textContent).not.toContain(
      "Comparing",
    );
  });

  it("TEXT-04: typing never writes the address bar or history (D-20)", async () => {
    mount("/tools/hash?text=abc");
    const before = window.location.search;
    for (const v of ["a", "ab", "abc", "abcd", "abcde"]) type(v);
    await settle(0, { status: "done", digests: fakeDigests(3) });
    expect(pushSpy).toHaveBeenCalledTimes(0);
    expect(replaceSpy).toHaveBeenCalledTimes(0);
    expect(window.location.search).toBe(before);
  });

  it("TEXT-04: editing while the restore is in flight shows only the newest text's digests", async () => {
    mount("/tools/hash?text=abc");
    type("abcd");
    expect(liveClient().starts).toHaveLength(2);
    await settle(0, { status: "done", digests: fakeDigests(1) });
    // The older "abc" result is discarded: still pending for "abcd".
    expectAllRowsPending();
    await settle(1, { status: "done", digests: fakeDigests(2) });
    expectRowsToBe(2);
  });

  it("TEXT-04: StrictMode double mount still ends showing the restored digests", async () => {
    mount("/tools/hash?text=abc", true);
    const fake = liveClient();
    const last = fake.starts[fake.starts.length - 1]!;
    expect(last.input).toEqual({ kind: "text", text: "abc" });
    await act(async () => {
      last.resolve({ status: "done", digests: fakeDigests(5) });
    });
    expectRowsToBe(5);
  });
});
