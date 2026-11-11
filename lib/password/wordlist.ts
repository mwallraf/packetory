/**
 * Lazy, memoized loader for the vendored EFF Large list (D-12).
 *
 * The list is reachable only through the literal dynamic import below, so it
 * is its own chunk and never part of initial page JS. There is no fetch and
 * no `public/` asset. There is never a fallback list: if the import fails,
 * the returned promise rejects with the importer's own error and the memo is
 * cleared so the next call retries (Phase 14's Retry, PHR-03). Phase 14 adds
 * a sequence token around calls. The library barrel must not re-export this
 * module (the plan 12-05 guard enforces it).
 */

export type WordlistImporter = () => Promise<{ default: string }>;

export function createWordlistLoader(
  importer: WordlistImporter = () => import("./wordlist/eff-large"),
): () => Promise<readonly string[]> {
  let memo: Promise<readonly string[]> | null = null;

  return function load(): Promise<readonly string[]> {
    if (memo !== null) {
      return memo;
    }
    const p: Promise<readonly string[]> = importer().then((m) =>
      Object.freeze(m.default.split(" ")),
    );
    memo = p;
    // Identity check on the very promise that is stored and returned: a stale
    // failure must never clear a newer in-flight promise.
    p.catch(() => {
      if (memo === p) {
        memo = null;
      }
    });
    return p;
  };
}

export const loadWordlist = createWordlistLoader();
