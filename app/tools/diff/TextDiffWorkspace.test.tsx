import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TextDiffOutcome } from "@/lib/text-diff/client";
import { compareText } from "@/lib/text-diff/engine";
import { TextDiffWorkspace } from "./TextDiffWorkspace";

const { compare, cancel } = vi.hoisted(() => ({
  compare: vi.fn<(input: { original: string; modified: string }) => Promise<TextDiffOutcome>>(),
  cancel: vi.fn(),
}));
vi.mock("@/lib/text-diff/client", () => ({ createTextDiffClient: () => ({ compare, cancel }) }));

const original = () => screen.getByRole("textbox", { name: "Original" });
const modified = () => screen.getByRole("textbox", { name: "Modified" });
const compareButton = () => screen.getByRole<HTMLButtonElement>("button", { name: "Compare" });
const clearButton = () => screen.getByRole("button", { name: "Clear all" });
const status = () => screen.getByRole("status");

function paste(left: string, right: string) {
  fireEvent.change(original(), { target: { value: left } });
  fireEvent.change(modified(), { target: { value: right } });
}

function deferred() {
  let resolve!: (outcome: TextDiffOutcome) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<TextDiffOutcome>((done, fail) => { resolve = done; reject = fail; });
  compare.mockReturnValueOnce(promise);
  return { resolve, reject };
}

describe("Text Diff workspace", () => {
  beforeEach(() => {
    compare.mockReset();
    cancel.mockReset();
  });
  afterEach(cleanup);

  it("marks a finished comparison stale and preserves the raw edited snippets", async () => {
    render(<TextDiffWorkspace />);
    paste("  192.0.2.1 ", "  192.0.2.2 ");
    compare.mockResolvedValueOnce(compareText({ original: "  192.0.2.1 ", modified: "  192.0.2.2 " }));
    await act(async () => fireEvent.click(compareButton()));
    expect(compare).toHaveBeenCalledWith({ original: "  192.0.2.1 ", modified: "  192.0.2.2 " });
    expect(status().textContent).toBe("1 modified");

    fireEvent.change(modified(), { target: { value: "  192.0.2.3 " } });
    expect(status().textContent).toBe("Out of date. Compare again to update the results.");
    expect(screen.getByRole("region", { name: "Comparison results" })).toBeTruthy();
  });

  it("allows only a valid, workspace-scoped non-composing shortcut and blocks duplicates", async () => {
    const job = deferred();
    render(<TextDiffWorkspace />);
    paste("  \t", "192.0.2.2");
    expect(compareButton().disabled).toBe(true);
    fireEvent.keyDown(modified(), { key: "Enter", ctrlKey: true });
    expect(compare).not.toHaveBeenCalled();

    paste("192.0.2.1", "192.0.2.2");
    fireEvent.keyDown(document.body, { key: "Enter", ctrlKey: true });
    fireEvent.keyDown(modified(), { key: "Enter", metaKey: true, repeat: true });
    fireEvent.keyDown(modified(), { key: "Enter", metaKey: true, isComposing: true });
    expect(compare).not.toHaveBeenCalled();
    fireEvent.keyDown(modified(), { key: "Enter", ctrlKey: true });
    fireEvent.submit(compareButton().form!);
    expect(compare).toHaveBeenCalledTimes(1);
    expect(status().textContent).toBe("Comparing…");
    await act(async () => job.resolve({ status: "done", rows: [] }));

    const next = deferred();
    fireEvent.keyDown(modified(), { key: "Enter", metaKey: true });
    expect(compare).toHaveBeenCalledTimes(2);
    await act(async () => next.resolve({ status: "done", rows: [] }));
  });

  it("clears and focuses Original while a stale success cannot replace a newer result", async () => {
    const abandoned = deferred();
    const newest = deferred();
    render(<TextDiffWorkspace />);
    paste("192.0.2.1", "192.0.2.2");
    fireEvent.click(compareButton());
    fireEvent.click(clearButton());
    expect((original() as HTMLTextAreaElement).value).toBe("");
    expect((modified() as HTMLTextAreaElement).value).toBe("");
    expect(document.activeElement).toBe(original());
    expect(status().textContent).toBe("");
    expect(cancel).toHaveBeenCalled();

    paste("router", "router");
    fireEvent.click(compareButton());
    await act(async () => newest.resolve(compareText({ original: "router", modified: "router" })));
    await act(async () => abandoned.resolve(compareText({ original: "192.0.2.1", modified: "192.0.2.2" })));
    expect(status().textContent).toBe("No differences found.");
    expect(screen.queryByRole("region", { name: "Comparison results" })).toBeNull();
  });

  it("drops a rejection caused by stale work and keeps editors usable after a current error", async () => {
    const stale = deferred();
    render(<TextDiffWorkspace />);
    paste("before", "after");
    fireEvent.click(compareButton());
    fireEvent.change(modified(), { target: { value: "new" } });
    await act(async () => stale.reject(new Error("private text")));
    expect(status().textContent).toBe("");
    expect(compareButton().disabled).toBe(false);

    compare.mockRejectedValueOnce(new Error("private text"));
    await act(async () => fireEvent.click(compareButton()));
    expect(status().textContent).toBe("Couldn’t compare this text. Try again.");
    expect((original() as HTMLTextAreaElement).value).toBe("before");
    expect((modified() as HTMLTextAreaElement).value).toBe("new");
  });

  it("cancels pending work on unmount", async () => {
    const job = deferred();
    const { unmount } = render(<TextDiffWorkspace />);
    paste("before", "after");
    fireEvent.click(compareButton());
    cancel.mockClear();
    unmount();
    expect(cancel).toHaveBeenCalledTimes(1);
    await act(async () => job.resolve({ status: "done", rows: [] }));
  });
});
