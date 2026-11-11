"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BATCH_MAX,
  BATCH_MIN,
  CryptoUnavailableError,
  GenerationExhaustedError,
  LENGTH_MAX,
  LENGTH_MIN,
  WORDS_MAX,
  WORDS_MIN,
  DEFAULT_OPTIONS,
  clampInt,
  generateBatch,
  generatePassphraseBatch,
  normalizeSymbols,
  normalizeToolOptions,
  parseOptions,
  serializeOptions,
  type GuessRateKey,
  type Mode,
  type Separator,
  type ToolOptions,
} from "@/lib/password";
import { loadWordlist } from "@/lib/password/wordlist";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { useKeyboardShortcut } from "@/lib/hooks/useKeyboardShortcut";
import { reloadPage } from "./reload";
import { ModeToggle } from "./ModeToggle";
import { PassphraseOptionsPanel } from "./PassphraseOptionsPanel";
import { PasswordOptionsPanel, type SetKey } from "./PasswordOptionsPanel";
import { PasswordOutput } from "./PasswordOutput";
import { StrengthPanel } from "./StrengthPanel";

export type GenError = "crypto" | "exhausted" | "unexpected" | null;

/**
 * The only strings the live region may ever hold (D-11, POUT-05). A union of
 * fixed phrases plus one numeric template, so a password cannot be passed in.
 */
export type StatusPhrase =
  | "Copied"
  | "Copied all passwords"
  | "Copied all passphrases"
  | "New password generated"
  | "New passphrase generated"
  | `${number} new passwords generated`
  | `${number} new passphrases generated`
  | "Options reset. New password generated"
  | "Options reset. New passphrase generated"
  | "Loading word list"
  | "Word list loaded. New passphrase generated";

function generatedPhrase(n: number, mode: Mode): StatusPhrase {
  if (mode === "passphrase") {
    return n === 1
      ? "New passphrase generated"
      : `${n} new passphrases generated`;
  }
  return n === 1 ? "New password generated" : `${n} new passwords generated`;
}

/**
 * "ready": results or a fail-closed error. "loading": the EFF list is on its
 * way and nothing was drawn. "wordlist-error": the list could not be loaded,
 * and no passphrase exists from any source (D-04).
 */
export type GenStatus = "ready" | "loading" | "wordlist-error";

export type Generated = {
  results: string[];
  error: GenError;
  generation: number;
  status: GenStatus;
};

/**
 * One generation attempt (D-03, D-12). It fails closed on EVERY throw: no
 * password, no previous result, no fallback randomness and no logging. A
 * `GenerationExhaustedError` and a `CryptoUnavailableError` each get their own
 * copy; any other throw gets a neutral message, so a non-crypto failure is
 * never mislabelled as a missing Web Crypto (WR-01).
 */
function generate(
  opts: ToolOptions,
  generation: number,
  list: readonly string[] | null,
): Generated {
  if (opts.mode === "passphrase" && list === null) {
    // No list yet: nothing is drawn, so no randomness is consumed.
    return { results: [], error: null, status: "loading", generation };
  }
  try {
    return {
      results:
        opts.mode === "passphrase" && list !== null
          ? generatePassphraseBatch(opts, list, opts.batch)
          : generateBatch(opts, opts.batch),
      error: null,
      status: "ready",
      generation,
    };
  } catch (e) {
    const error: GenError =
      e instanceof GenerationExhaustedError
        ? "exhausted"
        : e instanceof CryptoUnavailableError
          ? "crypto"
          : "unexpected";
    return { results: [], error, status: "ready", generation };
  }
}

/**
 * Parses a draft that must be a plain ASCII integer in [min, max]; returns null
 * for anything else (empty, signs, decimals, exponents, hex, non-ASCII digits,
 * out of range). JS `\d` matches ASCII digits only, so full-width and
 * Arabic-Indic digits fail. A 400-digit string becomes Infinity and fails the
 * range check.
 */
function parseIntInRange(value: string, min: number, max: number): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (n < min || n > max) return null;
  return n;
}

/**
 * Mirrors the options, and only the options, into the address bar (POUT-03,
 * D-13). Raw History API with a null state and no fragment: no router call, no
 * history push, and nothing generated ever reaches the URL because
 * `serializeOptions` accepts `ToolOptions` only. Idempotent, so StrictMode's
 * double mount writes the same canonical URL twice.
 */
function writeUrl(opts: ToolOptions) {
  try {
    const qs = serializeOptions(opts);
    const path = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    window.history.replaceState(null, "", path);
  } catch {
    // Throttled (Safari throws SecurityError after 100 calls per 30 s) or
    // unavailable: the URL is a convenience mirror only and must never abort
    // a commit, so the displayed password keeps obeying the displayed options.
  }
}

/**
 * Single lazy initializer for the island's first state (D-02). `window` is
 * deliberately NOT guarded: this component must never run on the server, so a
 * server execution has to fail loudly instead of silently generating a
 * password that would be baked into the prerendered HTML (RESEARCH Pattern 1).
 * It has no side effects (React StrictMode runs it twice in dev), and it does
 * not write the URL. The parsed mode is kept (D-03): a passphrase bookmark
 * starts in the loading state with nothing drawn, and the one mount effect
 * below starts the word-list load (D-05).
 */
function initialState(): { options: ToolOptions; gen: Generated } {
  const options = normalizeToolOptions(parseOptions(window.location.search));
  return { options, gen: generate(options, 0, null) };
}

export function PasswordTool() {
  const [seed] = useState(initialState);
  const [options, setOptions] = useState<ToolOptions>(seed.options);
  const [lengthDraft, setLengthDraft] = useState(String(seed.options.length));
  const [lengthError, setLengthError] = useState(false);
  const [symbolDraft, setSymbolDraft] = useState(seed.options.symbolSet);
  const [wordsDraft, setWordsDraft] = useState(String(seed.options.words));
  const [wordsError, setWordsError] = useState(false);
  const [batchDraft, setBatchDraft] = useState(String(seed.options.batch));
  const [batchError, setBatchError] = useState(false);
  const [gen, setGen] = useState<Generated>(seed.gen);
  // Attack scenario (D-09): local display state only. It never regenerates,
  // is never written to the URL and is never announced.
  const [scenario, setScenario] = useState<GuessRateKey>("fast");
  const heroCopy = useCopyToClipboard();
  const allCopy = useCopyToClipboard();
  // Copy sequence counters (D-20a, closes 13-REVIEW IN-05): `copied` stays true
  // for 2 s, so a repeat copy would not re-run the announcement effects. A
  // counter bumped after every settled copy does; a rejected write leaves
  // `copied` false, and the effects' early return keeps it silent. lib/hooks is
  // untouched.
  const [heroSeq, setHeroSeq] = useState(0);
  const [allSeq, setAllSeq] = useState(0);
  const [status, setStatus] = useState<"" | StatusPhrase>("");
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lengthRef = useRef<HTMLInputElement>(null);
  const wordCountRef = useRef<HTMLInputElement>(null);
  // Async word-list loading (D-04, RESEARCH Pattern 1). Refs, not closures: a
  // load continuation outlives the render that started it, so it must read the
  // newest sequence token and generation, never a stale captured copy.
  const seqRef = useRef(0);
  const wordsRef = useRef<readonly string[] | null>(null);
  const generationRef = useRef(seed.gen.generation);
  const lastLoadErrorRef = useRef<unknown>(null);

  // Clear first and set the phrase on the next tick, so an identical repeated
  // announcement is read again. Stable, so effects and rows can depend on it.
  const announce = useCallback((phrase: StatusPhrase) => {
    if (statusTimer.current) clearTimeout(statusTimer.current);
    setStatus("");
    statusTimer.current = setTimeout(() => setStatus(phrase), 0);
  }, []);

  useEffect(() => {
    return () => {
      if (statusTimer.current) clearTimeout(statusTimer.current);
    };
  }, []);

  // Copy announcements follow the hook state, never the click: `copy()` cannot
  // report success, so a rejected write stays silent. The timer keeps the
  // setState out of the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!heroCopy.copied) return;
    const timer = setTimeout(() => announce("Copied"), 0);
    return () => clearTimeout(timer);
  }, [heroCopy.copied, heroSeq, announce]);

  useEffect(() => {
    if (!allCopy.copied) return;
    const timer = setTimeout(
      () =>
        announce(
          options.mode === "passphrase"
            ? "Copied all passphrases"
            : "Copied all passwords",
        ),
      0,
    );
    return () => clearTimeout(timer);
  }, [allCopy.copied, allSeq, announce, options.mode]);

  async function copyHero(value: string) {
    await heroCopy.copy(value);
    setHeroSeq((n) => n + 1);
  }

  async function copyAll(value: string) {
    await allCopy.copy(value);
    setAllSeq((n) => n + 1);
  }

  const onRowCopied = useCallback(() => announce("Copied"), [announce]);

  useEffect(() => {
    writeUrl(options);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only canonical rewrite; idempotent under StrictMode
  }, []);

  // The single effect that generates (D-05; a deliberate departure from
  // Phase 13 D-02, which forbade any mount-time generation). A passphrase
  // bookmark has no list yet, so the load must start after mount. The start is
  // deferred a tick and cleared in the cleanup, so StrictMode's discarded first
  // run never starts a load: exactly one promise is awaited and one result is
  // applied (RESEARCH Pitfall 6). The cleanup also bumps the sequence token so
  // an unmounted island ignores a late settle. The timer keeps the setState out
  // of the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (seed.options.mode !== "passphrase" || wordsRef.current !== null) return;
    const timer = setTimeout(() => requestLoad(seed.options, true), 0);
    return () => {
      clearTimeout(timer);
      seqRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only load; requestLoad reads refs and stable setters only
  }, []);

  // The new generation and the copy-hook reset happen in the same handler, so
  // a stale "Copied!" never survives next to a value it no longer matches
  // (WR-02, D-11) and no effect is needed.
  function applyGenerated(next: Generated) {
    generationRef.current = next.generation;
    setGen(next);
    heroCopy.reset();
    allCopy.reset();
  }

  // Starts a word-list load and applies its result only while it is still the
  // newest request (D-04). Both settle paths are handled; nothing is ever
  // generated inside a setState updater. The list itself is a plain cache, so
  // a stale-but-valid list is kept for the next activation.
  function requestLoad(opts: ToolOptions, announceStart: boolean) {
    const token = ++seqRef.current;
    if (announceStart) announce("Loading word list");
    loadWordlist().then(
      (list) => {
        wordsRef.current = list;
        if (token !== seqRef.current || opts.mode !== "passphrase") return;
        const applied = generate(opts, generationRef.current + 1, list);
        applyGenerated(applied);
        if (applied.status === "ready" && applied.error === null) {
          announce("Word list loaded. New passphrase generated");
        }
      },
      (e: unknown) => {
        if (token !== seqRef.current) return;
        lastLoadErrorRef.current = e;
        applyGenerated({
          results: [],
          error: null,
          status: "wordlist-error",
          generation: generationRef.current + 1,
        });
      },
    );
  }

  // Retry after a word-list failure (D-04). The Turbopack production runtime
  // caches a rejected chunk import, so calling the loader again cannot recover
  // from a ChunkLoadError: reload the page instead (the options are already in
  // the URL, so the reload lands on the D-05 bookmark path). Any other failure
  // starts a fresh load. No fallback list and no previous value is ever shown.
  function retryLoad() {
    const last = lastLoadErrorRef.current;
    if (
      typeof last === "object" &&
      last !== null &&
      (last as { name?: unknown }).name === "ChunkLoadError"
    ) {
      reloadPage();
      return;
    }
    applyGenerated(generate(options, generationRef.current + 1, null));
    requestLoad(options, true);
  }

  function regenerate() {
    // Loading or failed: there is no list to draw from, so do nothing and say
    // nothing (UI-SPEC decision 23).
    if (options.mode === "passphrase" && wordsRef.current === null) return;
    const next = generate(options, generationRef.current + 1, wordsRef.current);
    applyGenerated(next);
    if (next.error === null) {
      announce(generatedPhrase(next.results.length, options.mode));
    }
  }

  // The one path every option change takes (D-06): normalize, invalidate any
  // in-flight word-list load, set, generate, reset the copy confirmation, and
  // only then mirror the options into the URL (best-effort, CR-01). Synchronous
  // except for the first Passphrase use, which applies a loading state and
  // starts the load; the displayed output already obeys the new options when
  // the handler returns.
  function commit(next: ToolOptions): Generated {
    const normalized = normalizeToolOptions(next);
    seqRef.current += 1;
    setOptions(normalized);
    const words = wordsRef.current;
    if (normalized.mode === "passphrase" && words === null) {
      const loading = generate(normalized, generationRef.current + 1, null);
      applyGenerated(loading);
      requestLoad(normalized, gen.status !== "loading");
      writeUrl(normalized);
      return loading;
    }
    const applied = generate(normalized, generationRef.current + 1, words);
    applyGenerated(applied);
    writeUrl(normalized);
    return applied;
  }

  function onModeChange(next: Mode) {
    commit({ ...options, mode: next });
  }

  function onLengthDraftChange(value: string) {
    setLengthDraft(value);
    const n = parseIntInRange(value, LENGTH_MIN, LENGTH_MAX);
    if (n === null) {
      setLengthError(true);
      return;
    }
    setLengthError(false);
    if (n !== options.length) commit({ ...options, length: n });
  }

  function onLengthBlur() {
    const trimmed = lengthDraft.trim();
    const result = /^\d+$/.test(trimmed)
      ? clampInt(Number(trimmed), LENGTH_MIN, LENGTH_MAX, options.length)
      : options.length;
    if (result !== options.length) commit({ ...options, length: result });
    setLengthDraft(String(result));
    setLengthError(false);
  }

  function onSliderChange(n: number) {
    setLengthDraft(String(n));
    setLengthError(false);
    commit({ ...options, length: n });
  }

  // Word count: the same draft rules as Length (D-02).
  function onWordsDraftChange(value: string) {
    setWordsDraft(value);
    const n = parseIntInRange(value, WORDS_MIN, WORDS_MAX);
    if (n === null) {
      setWordsError(true);
      return;
    }
    setWordsError(false);
    if (n !== options.words) commit({ ...options, words: n });
  }

  function onWordsBlur() {
    const trimmed = wordsDraft.trim();
    const result = /^\d+$/.test(trimmed)
      ? clampInt(Number(trimmed), WORDS_MIN, WORDS_MAX, options.words)
      : options.words;
    if (result !== options.words) commit({ ...options, words: result });
    setWordsDraft(String(result));
    setWordsError(false);
  }

  function onWordsSliderChange(n: number) {
    setWordsDraft(String(n));
    setWordsError(false);
    commit({ ...options, words: n });
  }

  function onSeparatorChange(separator: Separator) {
    commit({ ...options, separator });
  }

  function onCapitalizeChange(checked: boolean) {
    commit({ ...options, capitalize: checked });
  }

  function onAppendNumberChange(checked: boolean) {
    commit({ ...options, appendNumber: checked });
  }

  // A batch commit announces how many passwords there are now; every other
  // option commit stays silent (D-11).
  function announceCommit(applied: Generated) {
    if (applied.status === "ready" && applied.error === null) {
      announce(generatedPhrase(applied.results.length, options.mode));
    }
  }

  // Batch count: the same draft rules as Length (D-05, D-10).
  function onBatchDraftChange(value: string) {
    setBatchDraft(value);
    const n = parseIntInRange(value, BATCH_MIN, BATCH_MAX);
    if (n === null) {
      setBatchError(true);
      return;
    }
    setBatchError(false);
    if (n !== options.batch) announceCommit(commit({ ...options, batch: n }));
  }

  function onBatchBlur() {
    const trimmed = batchDraft.trim();
    const result = /^\d+$/.test(trimmed)
      ? clampInt(Number(trimmed), BATCH_MIN, BATCH_MAX, options.batch)
      : options.batch;
    if (result !== options.batch) {
      announceCommit(commit({ ...options, batch: result }));
    }
    setBatchDraft(String(result));
    setBatchError(false);
  }

  function onSetToggle(key: SetKey, checked: boolean) {
    commit({ ...options, [key]: checked });
  }

  // Live generation from the normalized draft. The draft itself is never
  // rewritten while typing (D-05), and a keystroke that normalizes to the same
  // set does not regenerate (RESEARCH Pitfall 13).
  function onSymbolDraftChange(value: string) {
    setSymbolDraft(value);
    const next = normalizeSymbols(value);
    if (next !== options.symbolSet) commit({ ...options, symbolSet: next });
  }

  function onSymbolBlur() {
    setSymbolDraft(normalizeSymbols(symbolDraft));
  }

  function onLookalikesChange(checked: boolean) {
    commit({ ...options, avoidLookalikes: checked });
  }

  // Esc (D-14): every option, draft and hint back to the defaults, a new
  // generation and the bare URL. No key changes and no remount, so focus stays
  // exactly where it was (RESEARCH Pattern 8).
  function resetAll() {
    setLengthDraft(String(DEFAULT_OPTIONS.length));
    setLengthError(false);
    setSymbolDraft(DEFAULT_OPTIONS.symbolSet);
    setBatchDraft(String(DEFAULT_OPTIONS.batch));
    setBatchError(false);
    setWordsDraft(String(DEFAULT_OPTIONS.words));
    setWordsError(false);
    setScenario("fast");
    const next = commit({ ...DEFAULT_OPTIONS, mode: options.mode });
    if (next.status === "ready" && next.error === null) {
      announce(
        options.mode === "passphrase"
          ? "Options reset. New passphrase generated"
          : "Options reset. New password generated",
      );
    }
  }

  // Ctrl/Cmd+C is defined for exactly one result (WR-03 precedent) and never
  // overrides a text selection the user made (D-14, T-13-17).
  const singleResult =
    gen.status === "ready" && gen.error === null && gen.results.length === 1
      ? gen.results[0]!
      : null;

  useKeyboardShortcut({
    slash: () => {
      const target =
        options.mode === "passphrase"
          ? wordCountRef.current
          : lengthRef.current;
      target?.focus();
      target?.select();
    },
    enter: () => regenerate(),
    escape: () => resetAll(),
    copy:
      singleResult === null
        ? undefined
        : () => {
            if (window.getSelection()?.toString()) return;
            void copyHero(singleResult);
          },
  });

  return (
    <div data-testid="password-tool" className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <ModeToggle mode={options.mode} onModeChange={onModeChange} />
        <div data-testid="password-output-zone">
          <PasswordOutput
            gen={gen}
            mode={options.mode}
            separator={options.separator}
            heroCopy={heroCopy}
            allCopy={allCopy}
            onCopyHero={(value) => void copyHero(value)}
            onCopyAll={(value) => void copyAll(value)}
            onRegenerate={regenerate}
            onRetry={retryLoad}
            onRowCopied={onRowCopied}
          />
        </div>
        <StrengthPanel
          options={options}
          scenario={scenario}
          onScenarioChange={setScenario}
        />
      </div>
      {options.mode === "passphrase" ? (
        <PassphraseOptionsPanel
          options={options}
          wordsDraft={wordsDraft}
          wordsError={wordsError}
          wordCountRef={wordCountRef}
          batchDraft={batchDraft}
          batchError={batchError}
          onWordsDraftChange={onWordsDraftChange}
          onWordsBlur={onWordsBlur}
          onWordsSliderChange={onWordsSliderChange}
          onSeparatorChange={onSeparatorChange}
          onCapitalizeChange={onCapitalizeChange}
          onAppendNumberChange={onAppendNumberChange}
          onBatchDraftChange={onBatchDraftChange}
          onBatchBlur={onBatchBlur}
        />
      ) : (
        <PasswordOptionsPanel
          options={options}
          lengthDraft={lengthDraft}
          lengthError={lengthError}
          lengthRef={lengthRef}
          symbolDraft={symbolDraft}
          batchDraft={batchDraft}
          batchError={batchError}
          onLengthDraftChange={onLengthDraftChange}
          onLengthBlur={onLengthBlur}
          onSliderChange={onSliderChange}
          onSetToggle={onSetToggle}
          onSymbolDraftChange={onSymbolDraftChange}
          onSymbolBlur={onSymbolBlur}
          onLookalikesChange={onLookalikesChange}
          onBatchDraftChange={onBatchDraftChange}
          onBatchBlur={onBatchBlur}
        />
      )}
      <span
        aria-live="polite"
        className="sr-only"
        data-testid="password-status"
      >
        {status}
      </span>
    </div>
  );
}

export default PasswordTool;
