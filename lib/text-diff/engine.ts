import { diffArrays, diffChars } from "diff";
import { exceedsInputLength } from "./limits";
import type { TextDiffInput, TextDiffLine, TextDiffResult, TextDiffRow } from "./types";

const MAX_INPUT_LINES = 5_000;
const MAX_LINE_EDITS = 1_000;
const LINE_TIMEOUT_MS = 200;
const MAX_INLINE_LENGTH = 2_048;
const MAX_INLINE_EDITS = 256;
const INLINE_TIMEOUT_MS = 10;
const INLINE_TOTAL_MS = 65;
const LOOKAHEAD = 8;
const EDGE_LENGTH = 128;

function lines(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

function line(token: string, number: number, kind: "equal" | "removed" | "added"): TextDiffLine {
  const hasNewline = token.endsWith("\n");
  const text = hasNewline ? token.slice(0, -1) : token;
  return { number, text, hasNewline, spans: text ? [{ kind, text }] : [] };
}

function replacement(original: TextDiffLine, modified: TextDiffLine, deadline: number): TextDiffRow {
  const remaining = deadline - Date.now();
  const changes = remaining > 0 && original.text.length + modified.text.length <= MAX_INLINE_LENGTH
    ? diffChars(original.text, modified.text, {
      maxEditLength: MAX_INLINE_EDITS,
      timeout: Math.min(remaining, INLINE_TIMEOUT_MS),
    })
    : undefined;
  if (changes) {
    original.spans = [];
    modified.spans = [];
    for (const change of changes) {
      if (!change.added) {
        original.spans.push({ kind: change.removed ? "removed" : "equal", text: change.value });
      }
      if (!change.removed) {
        modified.spans.push({ kind: change.added ? "added" : "equal", text: change.value });
      }
    }
  }
  return { kind: "modified", original, modified };
}

/** Shared edges capture local edits without computing an inline diff for every candidate. */
function related(original: string, modified: string): boolean {
  if (original === modified) return true; // A final newline may be the only difference.
  const left = original.trim();
  const right = modified.trim();
  if (left === right) return true;

  const shorter = Math.min(left.length, right.length);
  if (shorter < 2 || shorter * 2 < Math.max(left.length, right.length)) return false;

  let prefix = 0;
  while (prefix < Math.min(shorter, EDGE_LENGTH) && left[prefix] === right[prefix]) prefix++;
  let suffix = 0;
  while (suffix < Math.min(shorter - prefix, EDGE_LENGTH)
    && left[left.length - suffix - 1] === right[right.length - suffix - 1]) suffix++;
  return prefix + suffix >= Math.max(2, Math.ceil(Math.min(shorter, EDGE_LENGTH * 2) / 2));
}

function appendChangeRows(
  rows: TextDiffRow[],
  removed: TextDiffLine[],
  added: TextDiffLine[],
  inlineDeadline: number,
) {
  let oldIndex = 0;
  let newIndex = 0;
  const removeLine = () => rows.push({ kind: "removed", original: removed[oldIndex++], modified: null });
  const addLine = () => rows.push({ kind: "added", original: null, modified: added[newIndex++] });

  while (oldIndex < removed.length && newIndex < added.length) {
    const original = removed[oldIndex];
    const modified = added[newIndex];
    if (related(original.text, modified.text)) {
      rows.push(replacement(original, modified, inlineDeadline));
      oldIndex++;
      newIndex++;
      continue;
    }

    // Find a nearby insertion or deletion before pairing rows. Both cursors
    // only move forward, including when no related line is within the window.
    let found = false;
    for (let offset = 1; offset <= LOOKAHEAD; offset++) {
      if (newIndex + offset < added.length && related(original.text, added[newIndex + offset].text)) {
        for (let i = 0; i < offset; i++) addLine();
        found = true;
        break;
      }
      if (oldIndex + offset < removed.length && related(removed[oldIndex + offset].text, modified.text)) {
        for (let i = 0; i < offset; i++) removeLine();
        found = true;
        break;
      }
    }
    if (!found) {
      removeLine();
      addLine();
    }
  }
  while (oldIndex < removed.length) removeLine();
  while (newIndex < added.length) addLine();
}

export function compareText({ original, modified }: TextDiffInput): TextDiffResult {
  if (exceedsInputLength(original, modified)) {
    return { status: "error", code: "input-limit" };
  }
  const originalLines = lines(original);
  const modifiedLines = lines(modified);
  if (originalLines.length > MAX_INPUT_LINES || modifiedLines.length > MAX_INPUT_LINES) {
    return { status: "error", code: "input-limit" };
  }
  const changes = diffArrays(originalLines, modifiedLines, {
    maxEditLength: MAX_LINE_EDITS,
    timeout: LINE_TIMEOUT_MS,
  });
  if (!changes) return { status: "error", code: "comparison-limit" };

  const rows: TextDiffRow[] = [];
  let originalNumber = 1;
  let modifiedNumber = 1;
  let removed: TextDiffLine[] = [];
  let added: TextDiffLine[] = [];
  const inlineDeadline = Date.now() + INLINE_TOTAL_MS;

  function flushChanges() {
    appendChangeRows(rows, removed, added, inlineDeadline);
    removed = [];
    added = [];
  }

  for (const change of changes) {
    if (change.removed) {
      for (const token of change.value) removed.push(line(token, originalNumber++, "removed"));
    } else if (change.added) {
      for (const token of change.value) added.push(line(token, modifiedNumber++, "added"));
    } else {
      flushChanges();
      for (const token of change.value) {
        rows.push({
          kind: "equal",
          original: line(token, originalNumber++, "equal"),
          modified: line(token, modifiedNumber++, "equal"),
        });
      }
    }
  }
  flushChanges();
  return { status: "done", rows };
}
