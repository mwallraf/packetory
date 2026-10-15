import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createHashClient } from "@/lib/hash/client";
import { ALGORITHMS } from "@/lib/hash/algorithms";
import { formatChecksumLines, formatLabeledList } from "@/lib/hash/export";
import { formatDigest, toHex, toHexUpper } from "@/lib/hash/format";
import { SAMPLE_DIGEST_HEX, sampleDigests } from "@/lib/hash/sample";
import { HashTool } from "./HashTool";
import { COPY_ERROR_MESSAGE } from "./DigestRow";
import {
  createFakeHashClient,
  fakeDigests,
  stubClipboard,
  type FakeHashClient,
} from "./hash-test-utils";

vi.mock("@/lib/hash/client", () => ({ createHashClient: vi.fn() }));

let fakes: FakeHashClient[];

function liveClient(): FakeHashClient {
  const last = fakes[fakes.length - 1];
  if (!last) throw new Error("no client created");
  return last;
}

function rowValue(id: string): string {
  return screen.getByTestId(`hash-row-${id}-value`).textContent ?? "";
}

function allRows(): string[] {
  return ALGORITHMS.map((a) => rowValue(a.id));
}

function type(value: string) {
  fireEvent.change(screen.getByTestId("hash-input"), { target: { value } });
}

async function click(testId: string) {
  await act(async () => {
    fireEvent.click(screen.getByTestId(testId));
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

describe("OUT-03 encoding toggle", () => {
  it("OUT-03: hex is the default and HEX uppercases every digest", async () => {
    render(<HashTool />);
    expect(rowValue("sha256")).toBe(SAMPLE_DIGEST_HEX.sha256);
    await click("hash-encoding-HEX");
    for (const algo of ALGORITHMS) {
      expect(rowValue(algo.id)).toBe(SAMPLE_DIGEST_HEX[algo.id].toUpperCase());
    }
  });

  it("OUT-03: Base64 encodes every digest except CRC32, which stays lowercase hex", async () => {
    render(<HashTool />);
    await click("hash-encoding-base64");
    expect(rowValue("sha256")).toBe(
      "uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek=",
    );
    expect(rowValue("crc32")).toBe("0d4a1185");
  });

  it("OUT-03: CRC32 follows the HEX case choice", async () => {
    render(<HashTool />);
    await click("hash-encoding-HEX");
    expect(rowValue("crc32")).toBe("0D4A1185");
  });

  it("OUT-03: hex -> Base64 -> hex restores the exact original display and never re-hashes", async () => {
    render(<HashTool />);
    const original = allRows();
    await click("hash-encoding-base64");
    expect(allRows()).not.toEqual(original);
    await click("hash-encoding-hex");
    expect(allRows()).toEqual(original);
    await click("hash-encoding-HEX");
    await click("hash-encoding-hex");
    expect(allRows()).toEqual(original);
    expect(liveClient().starts).toHaveLength(0);
  });

  it("OUT-03: clicking the already-selected item never deselects (Radix empty value ignored)", async () => {
    render(<HashTool />);
    await click("hash-encoding-hex");
    expect(screen.getByTestId("hash-encoding-hex").getAttribute("data-state")).toBe(
      "on",
    );
    expect(rowValue("sha256")).toBe(SAMPLE_DIGEST_HEX.sha256);
  });

  it("OUT-03: 'Always hex' shows on the CRC32 row only while Base64 is selected", async () => {
    render(<HashTool />);
    expect(screen.queryByTestId("hash-row-crc32-always-hex")).toBeNull();
    await click("hash-encoding-base64");
    expect(screen.getByTestId("hash-row-crc32-always-hex").textContent).toBe(
      "Always hex",
    );
    for (const algo of ALGORITHMS) {
      if (algo.id === "crc32") continue;
      expect(screen.queryByTestId(`hash-row-${algo.id}-always-hex`)).toBeNull();
    }
    await click("hash-encoding-HEX");
    expect(screen.queryByTestId("hash-row-crc32-always-hex")).toBeNull();
  });

  it("OUT-03: a toggle while a hash is in flight formats the incoming result in the new encoding", async () => {
    render(<HashTool />);
    type("x");
    expect(liveClient().starts).toHaveLength(1);
    await click("hash-encoding-base64");
    expect(liveClient().starts).toHaveLength(1);
    await act(async () => {
      liveClient().starts[0]!.resolve({
        status: "done",
        digests: fakeDigests(7),
      });
    });
    const b64 = (n: number) => Buffer.alloc(n, 7).toString("base64");
    for (const algo of ALGORITHMS) {
      if (algo.id === "crc32") {
        expect(rowValue("crc32")).toBe("07070707");
      } else {
        expect(rowValue(algo.id)).toBe(b64(algo.bits / 8));
      }
    }
  });
});

describe("OUT-01 per-row copy", () => {
  it("OUT-01: copies the digest as displayed (uppercase), swaps to 'Copied!' and announces it", async () => {
    const writeText = stubClipboard();
    render(<HashTool />);
    await click("hash-encoding-HEX");
    await click("hash-row-sha256-copy");
    expect(writeText).toHaveBeenCalledWith(
      SAMPLE_DIGEST_HEX.sha256.toUpperCase(),
    );
    expect(
      screen.getByTestId("hash-row-sha256-copy").getAttribute("aria-label"),
    ).toBe("Copied!");
    expect(screen.getByTestId("hash-row-sha256-status").textContent).toBe(
      "Copied!",
    );
    // Other rows are untouched.
    expect(
      screen.getByTestId("hash-row-md5-copy").getAttribute("aria-label"),
    ).toBe("Copy MD5 digest");
  });

  it("OUT-01: every row has a copy button labelled 'Copy {LABEL} digest'", () => {
    render(<HashTool />);
    for (const algo of ALGORITHMS) {
      expect(
        screen.getByTestId(`hash-row-${algo.id}-copy`).getAttribute("aria-label"),
      ).toBe(`Copy ${algo.label} digest`);
    }
  });

  it("OUT-01: the Copied! state resets when the displayed value changes", async () => {
    stubClipboard();
    render(<HashTool />);
    await click("hash-row-sha256-copy");
    expect(
      screen.getByTestId("hash-row-sha256-copy").getAttribute("aria-label"),
    ).toBe("Copied!");
    await click("hash-encoding-base64");
    expect(
      screen.getByTestId("hash-row-sha256-copy").getAttribute("aria-label"),
    ).toBe("Copy SHA-256 digest");
  });

  it("OUT-01: a rejected clipboard write shows the neutral error line", async () => {
    const writeText = stubClipboard();
    writeText.mockRejectedValueOnce(new Error("denied"));
    render(<HashTool />);
    await click("hash-row-md5-copy");
    expect(screen.getByText(COPY_ERROR_MESSAGE)).toBeTruthy();
    expect(
      screen.getByTestId("hash-row-md5-copy").getAttribute("aria-label"),
    ).toBe("Copy MD5 digest");
  });
});

describe("OUT-02 copy all", () => {
  it("OUT-02: 'Labeled list' (default) writes the labeled list in the current encoding", async () => {
    const writeText = stubClipboard();
    render(<HashTool />);
    await click("hash-encoding-base64");
    await click("hash-copy-all");
    expect(writeText).toHaveBeenCalledWith(
      formatLabeledList(sampleDigests(), "base64"),
    );
    expect(screen.getByTestId("hash-copy-all").textContent).toBe("Copied!");
    expect(screen.getByTestId("hash-copy-all-status").textContent).toBe(
      "Copied!",
    );
  });

  it("OUT-02: 'Checksum lines' writes lowercase checksum lines even while HEX is selected", async () => {
    const writeText = stubClipboard();
    render(<HashTool />);
    await click("hash-encoding-HEX");
    await click("hash-copyall-checksum");
    await click("hash-copy-all");
    const payload = writeText.mock.calls[0]![0] as string;
    expect(payload).toBe(formatChecksumLines(sampleDigests()));
    expect(payload).toContain(`${SAMPLE_DIGEST_HEX.sha256}  -`);
    expect(payload).not.toMatch(/[A-F]{4}/);
  });

  it("OUT-02: copy all on empty input still exports all 10 algorithms", async () => {
    const writeText = stubClipboard();
    render(<HashTool />);
    type("");
    await act(async () => {
      liveClient().starts[0]!.resolve({
        status: "done",
        digests: fakeDigests(0),
      });
    });
    await click("hash-copyall-checksum");
    await click("hash-copy-all");
    const payload = writeText.mock.calls[0]![0] as string;
    expect(payload.split("\n")).toHaveLength(20);
    expect(payload).toBe(formatChecksumLines(fakeDigests(0)));
  });

  it("OUT-02: exactly one item stays selected per toggle group", async () => {
    render(<HashTool />);
    await click("hash-copyall-labeled");
    expect(
      screen.getByTestId("hash-copyall-labeled").getAttribute("data-state"),
    ).toBe("on");
    await click("hash-copyall-checksum");
    expect(
      screen.getByTestId("hash-copyall-labeled").getAttribute("data-state"),
    ).toBe("off");
    expect(
      screen.getByTestId("hash-copyall-checksum").getAttribute("data-state"),
    ).toBe("on");
  });

  it("OUT-02: a clipboard failure shows the neutral error line", async () => {
    const writeText = stubClipboard();
    writeText.mockRejectedValueOnce(new Error("denied"));
    render(<HashTool />);
    await click("hash-copy-all");
    expect(screen.getByText(COPY_ERROR_MESSAGE)).toBeTruthy();
  });

  it("OUT-02: format helpers agree with what the rows display", () => {
    const d = sampleDigests();
    expect(formatDigest("sha256", d.sha256, "hex")).toBe(toHex(d.sha256));
    expect(toHexUpper(d.md5)).toBe(SAMPLE_DIGEST_HEX.md5.toUpperCase());
  });
});

describe("OUT-05 row presentation", () => {
  it("OUT-05: MD5 and SHA-1 show 'Not for security'; CRC32 shows 'Error detection only'", () => {
    render(<HashTool />);
    expect(screen.getByTestId("hash-row-md5-security").textContent).toBe(
      "Not for security",
    );
    expect(screen.getByTestId("hash-row-sha1-security").textContent).toBe(
      "Not for security",
    );
    expect(screen.getByTestId("hash-row-crc32-security").textContent).toBe(
      "Error detection only",
    );
  });

  it("OUT-05: no other row has a security badge", () => {
    render(<HashTool />);
    for (const algo of ALGORITHMS) {
      if (algo.notForSecurity) continue;
      expect(screen.queryByTestId(`hash-row-${algo.id}-security`)).toBeNull();
    }
  });

  it("OUT-05: the badge is visible text, never a tooltip or title", () => {
    render(<HashTool />);
    for (const id of ["md5", "sha1", "crc32"]) {
      const badge = screen.getByTestId(`hash-row-${id}-security`);
      expect(badge.hasAttribute("title")).toBe(false);
      expect(badge.getAttribute("role")).not.toBe("tooltip");
      expect(badge.querySelector("svg")).not.toBeNull();
    }
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("OUT-05: the SHA-256 row is primary (4px accent bar, semibold value); no other row is", () => {
    render(<HashTool />);
    const sha = screen.getByTestId("hash-row-sha256");
    expect(sha.className).toContain("border-l-4");
    expect(sha.className).toContain("border-l-primary");
    expect(screen.getByTestId("hash-row-sha256-value").className).toContain(
      "font-semibold",
    );
    for (const algo of ALGORITHMS) {
      if (algo.id === "sha256") continue;
      expect(screen.getByTestId(`hash-row-${algo.id}`).className).not.toContain(
        "border-l-4",
      );
    }
  });
});
