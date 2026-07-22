import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCopyToClipboard } from "./useCopyToClipboard";

describe("useCopyToClipboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("writes the exact value to the clipboard via navigator.clipboard.writeText", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const { result } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      await result.current.copy("203.0.113.7");
    });

    expect(writeText).toHaveBeenCalledWith("203.0.113.7");
  });

  it("sets copied=true after a successful copy, then reverts to false after the ~2s timeout", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const { result } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      await result.current.copy("abc");
    });
    expect(result.current.copied).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.copied).toBe(false);
  });

  it("leaves copied false and surfaces an error flag on a rejected writeText, without throwing", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("clipboard denied"));
    Object.assign(navigator, { clipboard: { writeText } });

    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy("abc");
    });

    expect(result.current.copied).toBe(false);
    expect(result.current.error).toBe(true);
  });

  it("copies the value byte-for-byte — no trimming or case changes", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const { result } = renderHook(() => useCopyToClipboard());
    const mixedCaseIpv6 = "  2001:DB8::AbCd  ";
    await act(async () => {
      await result.current.copy(mixedCaseIpv6);
    });

    expect(writeText).toHaveBeenCalledWith(mixedCaseIpv6);
  });

  it("clears a pending revert timer and resets error on a fresh successful copy", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const { result } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      await result.current.copy("first");
    });
    expect(result.current.copied).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(500);
      await result.current.copy("second");
    });
    expect(result.current.copied).toBe(true);
    expect(result.current.error).toBe(false);
  });
});
