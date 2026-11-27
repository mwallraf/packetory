"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTextDiffClient } from "@/lib/text-diff/client";
import type { TextDiffError, TextDiffInput, TextDiffRow } from "@/lib/text-diff/types";
import { TextDiffResults } from "./TextDiffResults";

const emptyInput: TextDiffInput = { original: "", modified: "" };
const errorText: Record<TextDiffError, string> = {
  "input-limit": "One snippet is too long. Shorten it and compare again.",
  "comparison-limit": "This comparison is too large to display. Try comparing a smaller section.",
  "worker-error": "Couldn’t compare this text. Try again.",
};

function summarize(rows: TextDiffRow[]): string {
  const counts = { added: 0, removed: 0, modified: 0 };
  for (const row of rows) {
    if (row.kind !== "equal") counts[row.kind]++;
  }
  return Object.entries(counts).filter(([, count]) => count > 0)
    .map(([kind, count]) => `${count} ${kind}`).join(" · ") || "No differences found.";
}

export function TextDiffWorkspace() {
  const [client] = useState(createTextDiffClient);
  const [input, setInput] = useState(emptyInput);
  const [rows, setRows] = useState<TextDiffRow[] | null>(null);
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);
  const [pending, setPending] = useState(false);
  const original = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const canCompare = !!(input.original.trim() && input.modified.trim()) && !pending;

  useEffect(() => () => client.cancel(), [client]);

  async function compare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCompare) return;
    setRows(null);
    setStatus("Comparing…");
    setIsError(false);
    setPending(true);
    const outcome = await client.compare(input);
    setPending(false);
    if (outcome.status === "done") {
      setRows(outcome.rows);
      setStatus(summarize(outcome.rows));
    } else if (outcome.status === "error") {
      setIsError(true);
      setStatus(errorText[outcome.code]);
    }
  }

  function clearAll() {
    client.cancel();
    setInput(emptyInput);
    setRows(null);
    setStatus("");
    setIsError(false);
    setPending(false);
    original.current?.focus();
  }

  return (
    <form onSubmit={compare} className="space-y-6">
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
              className="min-h-36 bg-background p-4 font-mono text-base leading-normal md:min-h-48 md:text-base dark:bg-background"
              value={input[side]}
              onChange={(event) => setInput({ ...input, [side]: event.currentTarget.value })}
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={!canCompare}
          className="h-11 bg-cyan-700 px-4 font-semibold text-white hover:bg-cyan-800 dark:bg-primary dark:text-slate-950 dark:hover:bg-cyan-300"
        >
          Compare
        </Button>
        <Button type="button" variant="outline" onClick={clearAll} className="h-11 px-4 font-semibold">
          Clear all
        </Button>
      </div>
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={`text-sm leading-normal empty:sr-only ${isError ? "rounded-lg border border-destructive px-4 py-2" : ""}`}
      >
        {status}
      </p>
      {rows?.some((row) => row.kind !== "equal") && <TextDiffResults rows={rows} />}
    </form>
  );
}
