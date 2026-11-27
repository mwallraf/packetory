import { memo, useId, useState } from "react";
import type { TextDiffLine, TextDiffRow, TextDiffSpan } from "@/lib/text-diff/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { groupResultRows } from "./result-model";

const highlightClasses = {
  added: "bg-emerald-200 text-emerald-950 no-underline dark:bg-emerald-800 dark:text-emerald-100",
  removed: "bg-red-200 text-red-950 no-underline dark:bg-red-800 dark:text-red-100",
};

function renderSpan(span: TextDiffSpan, index: number) {
  if (span.kind === "added") return <ins key={index} className={highlightClasses.added}>{span.text}</ins>;
  if (span.kind === "removed") return <del key={index} className={highlightClasses.removed}>{span.text}</del>;
  return span.text;
}

function DiffLine({
  line, side, changed, hideOnMobile, otherNumber, missingNewline,
}: {
  line: TextDiffLine | null;
  side: "original" | "modified";
  changed: boolean;
  hideOnMobile?: boolean;
  otherNumber?: number;
  missingNewline: boolean;
}) {
  if (!line) return <div className="hidden bg-card md:block" aria-hidden="true" />;

  const added = side === "modified";
  const change = added ? "Added" : "Removed";
  return (
    <div className={cn(
      "grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-2 px-2 py-1",
      hideOnMobile && "hidden md:grid",
      changed && (added
        ? "bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100"
        : "bg-red-50 text-red-950 dark:bg-red-950 dark:text-red-100"),
    )}>
      <span className={cn("min-w-[3ch] tabular-nums", !changed && "text-foreground/70")}>
        <span className="sr-only">
          {changed ? `${change}, ` : ""}{side} line {line.number}
        </span>
        <span aria-hidden="true">{changed ? (added ? "+" : "−") : " "}{line.number}</span>
        {otherNumber !== undefined && (
          <span className="md:hidden">
            <span className="sr-only">, modified line {otherNumber}</span>
            {otherNumber !== line.number && <span aria-hidden="true">/{otherNumber}</span>}
          </span>
        )}
      </span>
      <div className="min-w-0">
        <code className="whitespace-pre-wrap [overflow-wrap:anywhere]">{line.spans.map(renderSpan)}</code>
        {missingNewline && <p className="mt-1 font-sans text-sm italic">No newline at end of text</p>}
      </div>
    </div>
  );
}

function DiffRow({ row }: { row: TextDiffRow }) {
  const changed = row.kind !== "equal";
  const newlineChanged = row.kind === "modified" && row.original.hasNewline !== row.modified.hasNewline;
  return (
    <div className="grid min-w-0 md:grid-cols-2 md:divide-x">
      <DiffLine
        side="original"
        line={row.original}
        changed={changed}
        otherNumber={row.kind === "equal" ? row.modified.number : undefined}
        missingNewline={newlineChanged && !row.original?.hasNewline}
      />
      <DiffLine
        side="modified"
        line={row.modified}
        changed={changed}
        hideOnMobile={!changed}
        missingNewline={newlineChanged && !row.modified?.hasNewline}
      />
    </div>
  );
}

function ContextFold({ rows }: { rows: TextDiffRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        aria-expanded={expanded}
        aria-controls={id}
        className="h-11 w-full justify-start rounded-none bg-card px-4 font-sans font-semibold"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Hide" : "Show"} {rows.length} unchanged lines
      </Button>
      <div id={id} hidden={!expanded}>
        {expanded && rows.map((row, index) => <DiffRow key={index} row={row} />)}
      </div>
    </div>
  );
}

export const TextDiffResults = memo(function TextDiffResults({ rows }: { rows: TextDiffRow[] }) {
  return (
    <section aria-label="Comparison results" className="overflow-hidden rounded-lg border bg-background font-mono text-[10pt] leading-normal">
      <div className="hidden grid-cols-2 divide-x border-b bg-card font-sans font-semibold md:grid">
        <p className="px-2 py-2">Original</p>
        <p className="px-2 py-2">Modified</p>
      </div>
      {groupResultRows(rows).map((item) => item.kind === "row"
        ? <DiffRow key={item.index} row={item.row} />
        : <ContextFold key={item.index} rows={item.rows} />)}
    </section>
  );
});
