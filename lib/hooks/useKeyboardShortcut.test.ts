import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcut } from "./useKeyboardShortcut";

/** Dispatches a synthetic keydown, defaulting the target to `window`. */
function dispatchKeydown(
  init: KeyboardEventInit,
  target: EventTarget = window
) {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

describe("useKeyboardShortcut", () => {
  it("calls the slash handler and prevents default on '/' keydown", () => {
    const slash = vi.fn();
    renderHook(() => useKeyboardShortcut({ slash }));

    const event = dispatchKeydown({ key: "/" });

    expect(slash).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("is unbound-safe: pressing '/' with no registered handler is a no-op that never throws (D-03)", () => {
    renderHook(() => useKeyboardShortcut({}));

    expect(() => dispatchKeydown({ key: "/" })).not.toThrow();
  });

  it("fires the copy handler on Ctrl/Cmd+C when focus is outside an editable field", () => {
    const copy = vi.fn();
    renderHook(() => useKeyboardShortcut({ copy }));

    dispatchKeydown({ key: "c", ctrlKey: true });
    expect(copy).toHaveBeenCalledTimes(1);

    dispatchKeydown({ key: "c", metaKey: true });
    expect(copy).toHaveBeenCalledTimes(2);
  });

  it("does NOT fire the copy handler when focus is inside an editable field (input/textarea/contenteditable)", () => {
    const copy = vi.fn();
    renderHook(() => useKeyboardShortcut({ copy }));

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    dispatchKeydown({ key: "c", ctrlKey: true }, input);
    expect(copy).not.toHaveBeenCalled();

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();
    dispatchKeydown({ key: "c", metaKey: true }, textarea);
    expect(copy).not.toHaveBeenCalled();

    const editableDiv = document.createElement("div");
    editableDiv.contentEditable = "true";
    document.body.appendChild(editableDiv);
    editableDiv.focus();
    dispatchKeydown({ key: "c", ctrlKey: true }, editableDiv);
    expect(copy).not.toHaveBeenCalled();

    input.remove();
    textarea.remove();
    editableDiv.remove();
  });

  it("fires the escape and enter handlers when registered", () => {
    const escape = vi.fn();
    const enter = vi.fn();
    renderHook(() => useKeyboardShortcut({ escape, enter }));

    dispatchKeydown({ key: "Escape" });
    dispatchKeydown({ key: "Enter" });

    expect(escape).toHaveBeenCalledTimes(1);
    expect(enter).toHaveBeenCalledTimes(1);
  });

  it("removes the keydown listener on unmount (no leaked listeners)", () => {
    const slash = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcut({ slash }));

    unmount();
    dispatchKeydown({ key: "/" });

    expect(slash).not.toHaveBeenCalled();
  });
});
