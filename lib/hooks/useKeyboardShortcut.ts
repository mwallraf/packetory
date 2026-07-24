"use client";

import { useEffect, useRef } from "react";

/**
 * Handler map for the reusable global keyboard-shortcut plumbing (D-03,
 * QUAL-04). Every field is optional: a shortcut with no registered handler
 * is a silent no-op, never a throw — this is what keeps `/` safe to bind
 * globally in Phase 1 even though no landing-page target exists yet.
 */
export type KeyboardShortcutHandlers = {
  /** "/" — focus the primary input. Unbound-safe: no target exists in
   * Phase 1 (D-03); Phase 2+ tool pages register this once a primary input
   * exists. Never fires while focus is already inside an editable field,
   * so it can't hijack normal typing. */
  slash?: () => void;
  /** Enter — execute the primary action. */
  enter?: () => void;
  /** Escape — clear the primary input / restore focus. */
  escape?: () => void;
  /** Ctrl/Cmd+C — copy the primary result. Only fires when focus is NOT
   * inside an editable field, so native text-selection copy keeps working
   * inside inputs/textareas/contenteditable elements. */
  copy?: () => void;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  // `isContentEditable` and attribute reflection for the `contentEditable`
  // IDL property aren't fully computed by jsdom (used in this hook's own
  // unit tests), so also check the attribute and the raw property value
  // directly — real browsers satisfy the first check anyway.
  if (target.isContentEditable) return true;
  const contentEditableAttr = target.getAttribute("contenteditable");
  if (contentEditableAttr === "" || contentEditableAttr === "true") return true;
  return target.contentEditable === "true";
}

/** True when focus is on a native/ARIA interactive control (button, link,
 * radio, or an editable field) that self-activates on Enter. Used to guard
 * the global `Enter` shortcut (CR-01) so it doesn't double-fire alongside a
 * focused control's own `click` — otherwise both the control's `onClick`
 * (against a stale pre-update closure, since React batches the `enter`
 * handler's state update) and the global `enter` handler run for the same
 * keypress, desyncing what's copied/downloaded from what's displayed. */
function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (isEditableTarget(target)) return true;
  return target.closest('button, [role="button"], [role="radio"], a[href]') !== null;
}

/**
 * Reusable global keyboard-shortcut hook (D-03, QUAL-04, project-brief.md
 * §6). Attaches a single window-level keydown listener dispatching to at
 * most one of {slash, enter, escape, copy}. This hook is deliberately
 * framework-agnostic plumbing only — no command-palette / quick-switcher
 * logic lives here (deferred, D-03); it's consumed unchanged by Phase 2+
 * tool pages, each supplying its own handlers.
 *
 * Handlers are read from a ref on every keydown (not re-subscribed on every
 * render), so passing a fresh handlers object each render is safe and never
 * causes the listener to be re-attached.
 */
export function useKeyboardShortcut(handlers: KeyboardShortcutHandlers): void {
  const handlersRef = useRef(handlers);

  // Refs must not be written during render (react-hooks/refs) — sync the
  // latest handlers into the ref from an effect that runs after every
  // render instead, keeping the single keydown listener below stable.
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const current = handlersRef.current;
      const editable = isEditableTarget(event.target);

      if (event.key === "/") {
        // Unbound-safe (D-03): no-op with no handler, never throws. Never
        // hijacks typing already in progress inside an editable field.
        if (!editable && current.slash) {
          event.preventDefault();
          current.slash();
        }
        return;
      }

      if (event.key === "Enter") {
        // Guard against double-firing alongside a focused native control's
        // own Enter-activation (CR-01) — only fire the global shortcut when
        // focus isn't already on a control that handles Enter itself.
        if (!isInteractiveTarget(event.target)) {
          current.enter?.();
        }
        return;
      }

      if (event.key === "Escape") {
        current.escape?.();
        return;
      }

      const isCopyChord =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c";
      if (isCopyChord && !editable) {
        current.copy?.();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
