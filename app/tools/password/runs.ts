/**
 * Pure run segmentation for the color-coded password output (PWD-08, D-09).
 * React-free, so it is testable without a DOM.
 */

export type RunKind = "letter" | "digit" | "symbol";

export type Run = { kind: RunKind; text: string };

/**
 * Classifies one character by its code: A-Z and a-z are letters, 0-9 are
 * digits and every other character is a symbol.
 */
export function kindOf(ch: string): RunKind {
  const code = ch.charCodeAt(0);
  if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) {
    return "letter";
  }
  if (code >= 0x30 && code <= 0x39) return "digit";
  return "symbol";
}

/** Groups consecutive characters of the same kind into runs, in order. */
export function segmentRuns(value: string): Run[] {
  const runs: Run[] = [];
  for (const ch of value) {
    const kind = kindOf(ch);
    const last = runs[runs.length - 1];
    if (last !== undefined && last.kind === kind) {
      last.text += ch;
    } else {
      runs.push({ kind, text: ch });
    }
  }
  return runs;
}
