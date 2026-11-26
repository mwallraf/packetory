export type TextDiffInput = {
  original: string;
  modified: string;
};

export type TextDiffSpan = {
  kind: "equal" | "added" | "removed";
  text: string;
};

export type TextDiffLine = {
  number: number;
  text: string;
  hasNewline: boolean;
  spans: TextDiffSpan[];
};

export type TextDiffRow =
  | { kind: "equal" | "modified"; original: TextDiffLine; modified: TextDiffLine }
  | { kind: "removed"; original: TextDiffLine; modified: null }
  | { kind: "added"; original: null; modified: TextDiffLine };

export type TextDiffError = "input-limit" | "comparison-limit" | "worker-error";

export type TextDiffResult =
  | { status: "done"; rows: TextDiffRow[] }
  | { status: "error"; code: TextDiffError };
