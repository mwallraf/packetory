import { Fragment } from "react";
import { segmentRuns, type RunKind } from "./runs";

const RUN_CLASS: Record<RunKind, string> = {
  letter: "text-foreground",
  digit: "text-sky-700 dark:text-sky-300",
  symbol: "text-amber-700 dark:text-amber-300",
};

/**
 * Renders a password as adjacent per-run spans (PWD-08, D-09): letters in the
 * foreground color, digits in sky and symbols in amber. Keys are indexes,
 * never the text (D-10), and there are no whitespace or text nodes between the
 * spans, so the parent's textContent is exactly the raw value. Segmentation is
 * a cheap derivation of the displayed value, so it is not memoized.
 */
export function ColoredPassword({
  value,
  breakAfter,
}: {
  value: string;
  /**
   * A single separator character ("_" or "."). When set, a `wbr` element is
   * rendered after each occurrence so a long passphrase can wrap there
   * (UI-SPEC decision 12). `wbr` adds no text, so textContent stays the raw
   * value.
   */
  breakAfter?: string;
}) {
  return (
    <>
      {segmentRuns(value).map((run, i) => (
        <Fragment key={i}>
          <span data-kind={run.kind} className={RUN_CLASS[run.kind]}>
            {run.text}
          </span>
          {breakAfter !== undefined
            ? Array.from(run.text).map((ch, j) =>
                ch === breakAfter ? <wbr key={j} /> : null,
              )
            : null}
        </Fragment>
      ))}
    </>
  );
}
