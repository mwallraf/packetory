import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createHashClient } from "@/lib/hash/client";
import { toHex } from "@/lib/hash/format";
import { SAMPLE_DIGEST_HEX } from "@/lib/hash/sample";
import { HashTool } from "./HashTool";
import {
  createFakeHashClient,
  fakeDigests,
  type FakeHashClient,
} from "./hash-test-utils";

vi.mock("@/lib/hash/client", () => ({ createHashClient: vi.fn() }));

let fakes: FakeHashClient[];

function liveClient(): FakeHashClient {
  const last = fakes[fakes.length - 1];
  if (!last) throw new Error("no client created");
  return last;
}

function paste(value: string) {
  fireEvent.change(screen.getByTestId("hash-verify"), { target: { value } });
}

function type(value: string) {
  fireEvent.change(screen.getByTestId("hash-input"), { target: { value } });
}

function result(): HTMLElement {
  return screen.getByTestId("hash-verify-result");
}

function matchBadges(): string[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-testid$="-match"]'),
  ).map((el) => el.dataset.testid!);
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

describe("HashTool verify box (OUT-04)", () => {
  it("OUT-04: the result line is a polite live region and is empty while idle", () => {
    render(<HashTool />);
    expect(result().getAttribute("aria-live")).toBe("polite");
    expect(result().textContent).toBe("");
    expect(matchBadges()).toEqual([]);
  });

  it("OUT-04: pasting the sample SHA-256 highlights that row and says so", () => {
    render(<HashTool />);
    paste(SAMPLE_DIGEST_HEX.sha256);
    expect(screen.getByTestId("hash-row-sha256-match").textContent).toContain(
      "Match",
    );
    expect(matchBadges()).toEqual(["hash-row-sha256-match"]);
    expect(result().textContent).toBe("Matches SHA-256.");
    expect(screen.getByTestId("hash-row-sha256").className).toContain(
      "border-primary",
    );
    expect(screen.getByTestId("hash-row-md5").className).not.toContain(
      "bg-primary/10",
    );
  });

  it("OUT-04: a sha256sum line and a BSD tag line highlight the same row", () => {
    render(<HashTool />);
    paste(SAMPLE_DIGEST_HEX.sha256 + "  -");
    expect(matchBadges()).toEqual(["hash-row-sha256-match"]);
    paste("SHA256 (file.iso) = " + SAMPLE_DIGEST_HEX.sha256.toUpperCase());
    expect(matchBadges()).toEqual(["hash-row-sha256-match"]);
  });

  it("OUT-04: equal digests on several rows highlight all of them", async () => {
    render(<HashTool />);
    type("abc");
    const twin = fakeDigests(9);
    await settle(0, { status: "done", digests: twin });
    // fakeDigests fills every row with the same byte: 32-byte rows collide.
    paste(toHex(twin.sha256));
    expect(matchBadges()).toEqual([
      "hash-row-sha256-match",
      "hash-row-sha3-256-match",
    ]);
    expect(result().textContent).toBe("Matches SHA-256 and SHA3-256.");
  });

  it("OUT-04: a value matching nothing shows a neutral no-match, never destructive", () => {
    render(<HashTool />);
    paste("deadbeef");
    expect(result().textContent).toBe(
      "No match. This value doesn't equal any digest of the current text.",
    );
    expect(result().innerHTML).not.toContain("destructive");
    expect(result().className).not.toContain("destructive");
    expect(matchBadges()).toEqual([]);
  });

  it("OUT-04: a malformed value adds the neutral length hint", () => {
    render(<HashTool />);
    paste("xyz");
    expect(result().textContent).toBe(
      "No match. This value doesn't equal any digest of the current text. Expected 8, 32, 40, 56, 64, 96 or 128 hex characters; got 3.",
    );
    expect(result().innerHTML).not.toContain("destructive");
  });

  it("OUT-04: whitespace-only input is idle, not a no-match", () => {
    render(<HashTool />);
    paste("   \n ");
    expect(result().textContent).toBe("");
    expect(matchBadges()).toEqual([]);
  });

  it("OUT-04: while digests are stale it shows Comparing... and asserts no match, then re-evaluates", async () => {
    render(<HashTool />);
    paste(SAMPLE_DIGEST_HEX.sha256);
    expect(matchBadges()).toEqual(["hash-row-sha256-match"]);

    type("abc"); // job left unresolved: the rows still hold the sample digests
    expect(result().textContent).toBe("Comparing...");
    expect(matchBadges()).toEqual([]);

    await settle(0, { status: "done", digests: fakeDigests(3) });
    expect(result().textContent).toContain("No match.");
    expect(matchBadges()).toEqual([]);

    paste(toHex(fakeDigests(3).sha256));
    expect(matchBadges()).toEqual([
      "hash-row-sha256-match",
      "hash-row-sha3-256-match",
    ]);
  });

  it("OUT-04: an empty field stays idle even while digests are stale", () => {
    render(<HashTool />);
    type("abc");
    expect(result().textContent).toBe("");
  });

  it("OUT-04: the verify input is capped at 4096 characters with the autofill-ignore attributes", () => {
    render(<HashTool />);
    const el = screen.getByTestId("hash-verify");
    expect(el.getAttribute("maxlength")).toBe("4096");
    expect(el.getAttribute("spellcheck")).toBe("false");
    expect(el.getAttribute("autocomplete")).toBe("off");
    expect(el.getAttribute("autocorrect")).toBe("off");
    expect(el.getAttribute("autocapitalize")).toBe("off");
    expect(el.hasAttribute("data-1p-ignore")).toBe(true);
    expect(el.getAttribute("data-lpignore")).toBe("true");
    expect(el.getAttribute("data-form-type")).toBe("other");
    expect(el.className).toContain("font-mono");
    expect(el.className).toContain("text-base");
  });

  it("OUT-04: the field is labelled Expected checksum and sits between the input and the digests", () => {
    render(<HashTool />);
    expect(screen.getByLabelText("Expected checksum")).toBe(
      screen.getByTestId("hash-verify"),
    );
    const tool = screen.getByTestId("hash-tool");
    const input = screen.getByTestId("hash-input");
    const verify = screen.getByTestId("hash-verify");
    const rows = screen.getByTestId("hash-rows");
    expect(
      input.compareDocumentPosition(verify) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      verify.compareDocumentPosition(rows) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(tool.contains(verify)).toBe(true);
  });

  it("OUT-04: match copy states equality only (no authenticity wording)", () => {
    render(<HashTool />);
    paste(SAMPLE_DIGEST_HEX.sha256);
    expect(result().textContent).not.toMatch(
      /verified|authentic|safe|trusted/i,
    );
  });
});
