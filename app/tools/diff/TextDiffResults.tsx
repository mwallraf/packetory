import type { TextDiffLine, TextDiffRow } from "@/lib/text-diff/types";

function DiffLine({ line }: { line: TextDiffLine | null }) {
  if (!line) return <div aria-hidden="true" />;
  return (
    <div className="flex min-w-0 gap-2 px-2 py-1">
      <span className="shrink-0 tabular-nums text-muted-foreground">{line.number}</span>
      <code className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">
        {line.spans.map((span, index) => {
          if (span.kind === "removed") {
            return <del key={index} className="bg-red-200 text-red-950 no-underline dark:bg-red-800 dark:text-red-100">{span.text}</del>;
          }
          if (span.kind === "added") {
            return <ins key={index} className="bg-emerald-200 text-emerald-950 no-underline dark:bg-emerald-800 dark:text-emerald-100">{span.text}</ins>;
          }
          return <span key={index}>{span.text}</span>;
        })}
      </code>
    </div>
  );
}

export function TextDiffResults({ rows }: { rows: TextDiffRow[] }) {
  return (
    <section aria-label="Comparison results" className="overflow-hidden rounded-lg border bg-background font-mono text-sm">
      {rows.map((row, index) => (
        <div key={index} className="grid min-w-0 md:grid-cols-2 md:divide-x">
          <DiffLine line={row.original} />
          <DiffLine line={row.modified} />
        </div>
      ))}
    </section>
  );
}
