import { Fragment } from "react";
import { segmentRuns, type RunKind } from "./runs";

const RUN_CLASS: Record<RunKind, string> = {
  letter: "text-foreground",
  digit: "text-sky-700 dark:text-sky-300",
  symbol: "text-amber-700 dark:text-amber-300",
};

type Piece = { kind: RunKind; text: string; sep: boolean };

/**
 * Splits every run at each occurrence of the separator character, so the
 * separator is a piece of its own and everything else keeps its run's kind.
 */
function pieces(value: string, separator: string): Piece[] {
  const out: Piece[] = [];
  for (const run of segmentRuns(value)) {
    let plain = "";
    for (const ch of run.text) {
      if (ch === separator) {
        if (plain !== "") out.push({ kind: run.kind, text: plain, sep: false });
        plain = "";
        out.push({ kind: run.kind, text: ch, sep: true });
      } else {
        plain += ch;
      }
    }
    if (plain !== "") out.push({ kind: run.kind, text: plain, sep: false });
  }
  return out;
}

function span(piece: Piece, key: number) {
  return (
    <span key={key} data-kind={piece.kind} className={RUN_CLASS[piece.kind]}>
      {piece.text}
    </span>
  );
}

/**
 * Renders a password as adjacent per-run spans (PWD-08, D-09): letters in the
 * foreground color, digits in sky and symbols in amber. Keys are indexes,
 * never the text (D-10), and there are no whitespace or text nodes between the
 * spans, so the parent's textContent is exactly the raw value. Segmentation is
 * a cheap derivation of the displayed value, so it is not memoized.
 */
export function ColoredPassword({
  value,
  breakBefore,
}: {
  value: string;
  /**
   * A single separator character ("-", "_" or "."). When set, a `wbr` is
   * rendered before each occurrence and the separator is kept together with
   * the text that follows it in a no-wrap group, so a wrapped line never ends
   * in a bare separator (a trailing "-" reads as hyphenation) and a word is
   * never split from its separator. `wbr` adds no text, so textContent stays
   * the raw value.
   */
  breakBefore?: string;
}) {
  if (breakBefore === undefined) {
    return <>{segmentRuns(value).map((run, i) => span({ ...run, sep: false }, i))}</>;
  }
  const all = pieces(value, breakBefore);
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < all.length; i += 1) {
    const piece = all[i]!;
    if (!piece.sep) {
      nodes.push(span(piece, i));
      continue;
    }
    const group: React.ReactNode[] = [span(piece, i)];
    while (i + 1 < all.length && !all[i + 1]!.sep) {
      i += 1;
      group.push(span(all[i]!, i));
    }
    nodes.push(
      <Fragment key={`g${i}`}>
        <wbr />
        <span className="whitespace-nowrap">{group}</span>
      </Fragment>,
    );
  }
  return <>{nodes}</>;
}
