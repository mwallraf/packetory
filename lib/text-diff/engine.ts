import { diffArrays, diffChars } from "diff";
import { exceedsInputLength } from "./limits";
import type { TextDiffInput, TextDiffLine, TextDiffOptions, TextDiffResult, TextDiffRow } from "./types";

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

function comparisonText(text: string, options: TextDiffOptions): string {
  return options.ignoreTrailingWhitespace ? text.replace(/[^\S\n]+$/u, "") : text;
}

function comparisonKey(text: string, options: TextDiffOptions): string {
  const value = comparisonText(text, options);
  return options.ignoreCase ? value.toLowerCase() : value;
}

function replacement(
  original: TextDiffLine, modified: TextDiffLine, deadline: number, options: TextDiffOptions,
): TextDiffRow {
  const remaining = deadline - Date.now();
  const left = comparisonText(original.text, options);
  const right = comparisonText(modified.text, options);
  const changes = remaining > 0 && left.length + right.length <= MAX_INLINE_LENGTH
    ? diffChars(left, right, {
      ignoreCase: options.ignoreCase,
      maxEditLength: MAX_INLINE_EDITS,
      timeout: Math.min(remaining, INLINE_TIMEOUT_MS),
    })
    : undefined;
  if (changes) {
    const originalChars = Array.from(left);
    const modifiedChars = Array.from(right);
    let oldIndex = 0;
    let newIndex = 0;
    original.spans = [];
    modified.spans = [];
    for (const change of changes) {
      if (!change.added) {
        original.spans.push({
          kind: change.removed ? "removed" : "equal",
          text: originalChars.slice(oldIndex, oldIndex + change.count).join(""),
        });
        oldIndex += change.count;
      }
      if (!change.removed) {
        modified.spans.push({
          kind: change.added ? "added" : "equal",
          text: modifiedChars.slice(newIndex, newIndex + change.count).join(""),
        });
        newIndex += change.count;
      }
    }
    if (left.length < original.text.length) {
      original.spans.push({ kind: "equal", text: original.text.slice(left.length) });
    }
    if (right.length < modified.text.length) {
      modified.spans.push({ kind: "equal", text: modified.text.slice(right.length) });
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
  options: TextDiffOptions,
) {
  const removedKeys = removed.map(({ text }) => comparisonKey(text, options));
  const addedKeys = added.map(({ text }) => comparisonKey(text, options));
  let oldIndex = 0;
  let newIndex = 0;
  const removeLine = () => rows.push({ kind: "removed", original: removed[oldIndex++], modified: null });
  const addLine = () => rows.push({ kind: "added", original: null, modified: added[newIndex++] });

  while (oldIndex < removed.length && newIndex < added.length) {
    const original = removed[oldIndex];
    const modified = added[newIndex];
    if (related(removedKeys[oldIndex], addedKeys[newIndex])) {
      rows.push(replacement(original, modified, inlineDeadline, options));
      oldIndex++;
      newIndex++;
      continue;
    }

    // Find a nearby insertion or deletion before pairing rows. Both cursors
    // only move forward, including when no related line is within the window.
    let found = false;
    for (let offset = 1; offset <= LOOKAHEAD; offset++) {
      if (newIndex + offset < added.length && related(removedKeys[oldIndex], addedKeys[newIndex + offset])) {
        for (let i = 0; i < offset; i++) addLine();
        found = true;
        break;
      }
      if (oldIndex + offset < removed.length && related(removedKeys[oldIndex + offset], addedKeys[newIndex])) {
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

export function compareText({ original, modified, options = {} }: TextDiffInput): TextDiffResult {
  if (exceedsInputLength(original, modified)) {
    return { status: "error", code: "input-limit" };
  }
  const originalLines = lines(original);
  const modifiedLines = lines(modified);
  if (originalLines.length > MAX_INPUT_LINES || modifiedLines.length > MAX_INPUT_LINES) {
    return { status: "error", code: "input-limit" };
  }
  function prepare(tokens: string[]) {
    return tokens.map((token, index) => {
      const hasNewline = token.endsWith("\n");
      const text = hasNewline ? token.slice(0, -1) : token;
      return { token, number: index + 1, text, key: comparisonKey(text, options) + (hasNewline ? "\n" : "") };
    }).filter(({ text }) => !options.ignoreBlankLines || text.trim() !== "");
  }
  const originals = prepare(originalLines);
  const modifications = prepare(modifiedLines);
  const changes = diffArrays(originals, modifications, {
    comparator: (left, right) => left.key === right.key,
    maxEditLength: MAX_LINE_EDITS,
    timeout: LINE_TIMEOUT_MS,
  });
  if (!changes) return { status: "error", code: "comparison-limit" };

  const rows: TextDiffRow[] = [];
  let originalIndex = 0;
  let modifiedIndex = 0;
  let removed: TextDiffLine[] = [];
  let added: TextDiffLine[] = [];
  const inlineDeadline = Date.now() + INLINE_TOTAL_MS;

  function flushChanges() {
    appendChangeRows(rows, removed, added, inlineDeadline, options);
    removed = [];
    added = [];
  }

  for (const change of changes) {
    if (change.removed) {
      for (const { token, number } of change.value) removed.push(line(token, number, "removed"));
      originalIndex += change.count;
    } else if (change.added) {
      for (const { token, number } of change.value) added.push(line(token, number, "added"));
      modifiedIndex += change.count;
    } else {
      flushChanges();
      for (let i = 0; i < change.count; i++) {
        const left = originals[originalIndex++];
        const right = modifications[modifiedIndex++];
        rows.push({
          kind: "equal",
          original: line(left.token, left.number, "equal"),
          modified: line(right.token, right.number, "equal"),
        });
      }
    }
  }
  flushChanges();
  return { status: "done", rows };
}
