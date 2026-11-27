"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTextDiffClient, type TextDiffOutcome } from "@/lib/text-diff/client";
import type { TextDiffError, TextDiffInput, TextDiffOptions, TextDiffRow } from "@/lib/text-diff/types";
import { TextDiffResults } from "./TextDiffResults";
import { textDiffExample } from "./example";
import { fitsExpandedResult } from "./result-model";

const emptyInput: TextDiffInput = { original: "", modified: "" };
const AUTO_COMPARE_DELAY_MS = 350;
const AUTO_COMPARE_CHARACTER_LIMIT = 10_000;
const AUTO_COMPARE_LINE_LIMIT = 100;
const comparisonOptions = [
  { key: "ignoreBlankLines", label: "Ignore blank", description: "Skip empty lines and lines containing only whitespace." },
  { key: "ignoreTrailingWhitespace", label: "Ignore trailing spaces", description: "Ignore whitespace at the end of each line. Leading indentation still matters." },
  { key: "ignoreCase", label: "Ignore case", description: "Treat uppercase and lowercase differences as equal." },
] as const;
const errorText: Record<TextDiffError, string> = {
  "input-limit": "One snippet is too long. Shorten it and compare again.",
  "comparison-limit": "This comparison is too large to display. Try comparing a smaller section.",
  "worker-error": "Couldn’t compare this text. Try again.",
};

type Comparison =
  | { status: "idle" | "pending" }
  | { status: "done"; rows: TextDiffRow[]; stale: boolean; id: number }
  | { status: "error"; code: TextDiffError };

function hasPair(input: TextDiffInput): boolean {
  return Boolean(input.original.trim() && input.modified.trim());
}

function fitsAutoCompare(text: string): boolean {
  return text.length < AUTO_COMPARE_CHARACTER_LIMIT
    && text.split(/\r\n|\r|\n/).length <= AUTO_COMPARE_LINE_LIMIT;
}

function summarize(rows: TextDiffRow[], hasOptions: boolean): string {
  const counts = { added: 0, removed: 0, modified: 0 };
  for (const row of rows) {
    if (row.kind !== "equal") counts[row.kind]++;
  }
  return Object.entries(counts).filter(([, count]) => count > 0)
    .map(([kind, count]) => `${count} ${kind}`).join(" · ")
    || (hasOptions ? "No differences with the current options." : "No differences found.");
}

function statusText(comparison: Comparison, hasOptions: boolean): string {
  if (comparison.status === "pending") return "Comparing…";
  if (comparison.status === "error") return errorText[comparison.code];
  if (comparison.status === "done") {
    return comparison.stale ? "Out of date. Compare again to update the results." : summarize(comparison.rows, hasOptions);
  }
  return "";
}

export function TextDiffWorkspace() {
  const [client] = useState(createTextDiffClient);
  const [input, setInput] = useState(emptyInput);
  const [comparison, setComparison] = useState<Comparison>({ status: "idle" });
  const requestId = useRef(0);
  const autoCompareTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef(false);
  const original = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const canCompare = hasPair(input) && comparison.status !== "pending";

  useEffect(() => () => {
    clearTimeout(autoCompareTimer.current);
    requestId.current++;
    client.cancel();
  }, [client]);

  async function compare(pair: TextDiffInput) {
    clearTimeout(autoCompareTimer.current);
    if (!hasPair(pair) || pending.current) return;
    const id = ++requestId.current;
    pending.current = true;
    setComparison({ status: "pending" });

    let outcome: TextDiffOutcome;
    try {
      // The client cancels earlier work as part of starting a new job.
      outcome = await client.compare(pair);
    } catch {
      outcome = { status: "error", code: "worker-error" };
    }

    if (id !== requestId.current) return;
    pending.current = false;
    switch (outcome.status) {
      case "done":
        setComparison(fitsExpandedResult(outcome.rows)
          ? { ...outcome, stale: false, id }
          : { status: "error", code: "comparison-limit" });
        break;
      case "error":
        setComparison(outcome);
        break;
      case "cancelled":
        setComparison({ status: "idle" });
        break;
    }
  }

  function cancelComparison() {
    clearTimeout(autoCompareTimer.current);
    requestId.current++;
    pending.current = false;
    client.cancel();
  }

  function updateInput(nextInput: TextDiffInput, autoCompare: boolean) {
    cancelComparison();
    setInput(nextInput);
    setComparison((current) => current.status === "done"
      ? { ...current, stale: true }
      : { status: "idle" });
    if (autoCompare && fitsAutoCompare(nextInput.original)
      && fitsAutoCompare(nextInput.modified) && hasPair(nextInput)) {
      autoCompareTimer.current = setTimeout(() => void compare(nextInput), AUTO_COMPARE_DELAY_MS);
    }
  }

  function changeOption(key: keyof TextDiffOptions, checked: boolean) {
    updateInput({ ...input, options: { ...input.options, [key]: checked } }, true);
  }

  function clearAll() {
    cancelComparison();
    setInput(emptyInput);
    setComparison({ status: "idle" });
    original.current?.focus();
  }

  function tryExample() {
    const example = { ...textDiffExample, options: input.options };
    setInput(example);
    original.current?.focus();
    void compare(example);
  }

  function handleShortcut(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)
      || event.altKey || event.shiftKey || event.repeat || event.nativeEvent.isComposing
      || !canCompare || event.defaultPrevented) return;
    event.preventDefault();
    void compare(input);
  }

  const canTryExample = input.original === "" && input.modified === "" && comparison.status === "idle";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void compare(input);
      }}
      onKeyDown={handleShortcut}
      className="space-y-6"
    >
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {(["original", "modified"] as const).map((side) => (
          <div className="grid min-w-0 gap-2" key={side}>
            <Label htmlFor={`${id}-${side}`} className="text-sm leading-normal font-semibold">
              {side === "original" ? "Original" : "Modified"}
            </Label>
            <Textarea
              ref={side === "original" ? original : undefined}
              id={`${id}-${side}`}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              placeholder={`Paste ${side} text`}
              className="min-h-36 bg-background p-4 font-mono text-[10pt] leading-normal md:min-h-48 md:text-[10pt] dark:bg-background"
              value={input[side]}
              onChange={(event) => updateInput({ ...input, [side]: event.currentTarget.value }, side === "modified")}
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          type="submit"
          aria-keyshortcuts="Control+Enter Meta+Enter"
          disabled={!canCompare}
          className="h-11 bg-cyan-700 px-4 font-semibold text-white hover:bg-cyan-800 dark:bg-primary dark:text-slate-950 dark:hover:bg-cyan-300"
        >
          Compare
        </Button>
        <Button type="button" variant="outline" onClick={clearAll} className="h-11 px-4 font-semibold">
          Clear all
        </Button>
        <fieldset className="flex min-w-0 flex-wrap gap-x-3">
          <legend className="sr-only">Comparison options</legend>
          {comparisonOptions.map(({ key, label, description }) => (
            <label key={key} title={description} className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={Boolean(input.options?.[key])}
                onChange={(event) => changeOption(key, event.currentTarget.checked)}
                aria-description={description}
                className="size-3.5 accent-cyan-700 dark:accent-primary"
              />
              {label}
            </label>
          ))}
        </fieldset>
        {canTryExample && (
          <Button type="button" variant="ghost" onClick={tryExample} className="h-11 px-4 font-semibold">
            Try an example
          </Button>
        )}
      </div>
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={`text-sm leading-normal empty:sr-only ${comparison.status === "error" ? "rounded-lg border border-destructive px-4 py-2" : ""}`}
      >
        {statusText(comparison, Object.values(input.options ?? {}).some(Boolean))}
      </p>
      {comparison.status === "done" && comparison.rows.some((row) => row.kind !== "equal")
        && <TextDiffResults key={comparison.id} rows={comparison.rows} />}
    </form>
  );
}
