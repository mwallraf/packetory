import { diffArrays, diffChars } from "diff";
import type { TextDiffInput, TextDiffLine, TextDiffResult, TextDiffRow } from "./types";

const MAX_INPUT_LENGTH = 200_000;
const MAX_INPUT_LINES = 5_000;
const MAX_LINE_EDITS = 1_000;
const MAX_INLINE_LENGTH = 2_048;

function lines(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

function line(token: string, number: number, kind: "equal" | "removed" | "added"): TextDiffLine {
  const hasNewline = token.endsWith("\n");
  const text = hasNewline ? token.slice(0, -1) : token;
  return { number, text, hasNewline, spans: text ? [{ kind, text }] : [] };
}

function replacement(original: TextDiffLine, modified: TextDiffLine): TextDiffRow {
  const changes = original.text.length + modified.text.length <= MAX_INLINE_LENGTH
    ? diffChars(original.text, modified.text, { maxEditLength: 256, timeout: 10 })
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

export function compareText({ original, modified }: TextDiffInput): TextDiffResult {
  if (original.length > MAX_INPUT_LENGTH || modified.length > MAX_INPUT_LENGTH) {
    return { status: "error", code: "input-limit" };
  }
  const originalLines = lines(original);
  const modifiedLines = lines(modified);
  if (originalLines.length > MAX_INPUT_LINES || modifiedLines.length > MAX_INPUT_LINES) {
    return { status: "error", code: "input-limit" };
  }
  const changes = diffArrays(originalLines, modifiedLines, {
    maxEditLength: MAX_LINE_EDITS,
    timeout: 200,
  });
  if (!changes) return { status: "error", code: "comparison-limit" };

  const rows: TextDiffRow[] = [];
  let originalNumber = 1;
  let modifiedNumber = 1;
  let removed: TextDiffLine[] = [];
  let added: TextDiffLine[] = [];

  function flushChanges() {
    const paired = Math.min(removed.length, added.length);
    for (let i = 0; i < paired; i++) rows.push(replacement(removed[i], added[i]));
    for (const original of removed.slice(paired)) rows.push({ kind: "removed", original, modified: null });
    for (const modified of added.slice(paired)) rows.push({ kind: "added", original: null, modified });
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
