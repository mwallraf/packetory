"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BATCH_MAX,
  BATCH_MIN,
  GenerationExhaustedError,
  LENGTH_MAX,
  LENGTH_MIN,
  clampInt,
  generateBatch,
  normalizeSymbols,
  normalizeToolOptions,
  parseOptions,
  serializeOptions,
  type ToolOptions,
} from "@/lib/password";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { PasswordOptionsPanel, type SetKey } from "./PasswordOptionsPanel";
import { PasswordOutput } from "./PasswordOutput";

export type GenError = "crypto" | "exhausted" | null;

/**
 * The only strings the live region may ever hold (D-11, POUT-05). A union of
 * fixed phrases plus one numeric template, so a password cannot be passed in.
 */
export type StatusPhrase =
  | "Copied"
  | "Copied all passwords"
  | "New password generated"
  | `${number} new passwords generated`
  | "Options reset. New password generated";

function generatedPhrase(n: number): StatusPhrase {
  return n === 1 ? "New password generated" : `${n} new passwords generated`;
}

export type Generated = {
  results: string[];
  error: GenError;
  generation: number;
};

/**
 * One generation attempt (D-03, D-12). It fails closed on EVERY throw: no
 * password, no previous result, no fallback randomness and no logging. A
 * `GenerationExhaustedError` gets its own copy; everything else (Web Crypto
 * missing, an unusable fill, any other throw) is the Web Crypto error.
 */
function generate(opts: ToolOptions, generation: number): Generated {
  try {
    return {
      results: generateBatch(opts, opts.batch),
      error: null,
      generation,
    };
  } catch (e) {
    return {
      results: [],
      error: e instanceof GenerationExhaustedError ? "exhausted" : "crypto",
      generation,
    };
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
  const qs = serializeOptions(opts);
  const path = qs
    ? `${window.location.pathname}?${qs}`
    : window.location.pathname;
  window.history.replaceState(null, "", path);
}

/**
 * Single lazy initializer for the island's first state (D-02). `window` is
 * deliberately NOT guarded: this component must never run on the server, so a
 * server execution has to fail loudly instead of silently generating a
 * password that would be baked into the prerendered HTML (RESEARCH Pattern 1).
 * It has no side effects (React StrictMode runs it twice in dev), and it does
 * not write the URL. The mode is coerced to password and the passphrase fields
 * pass through unchanged (D-07).
 */
function initialState(): { options: ToolOptions; gen: Generated } {
  const options = normalizeToolOptions({
    ...parseOptions(window.location.search),
    mode: "password",
  });
  return { options, gen: generate(options, 0) };
}

export function PasswordTool() {
  const [seed] = useState(initialState);
  const [options, setOptions] = useState<ToolOptions>(seed.options);
  const [lengthDraft, setLengthDraft] = useState(String(seed.options.length));
  const [lengthError, setLengthError] = useState(false);
  const [symbolDraft, setSymbolDraft] = useState(seed.options.symbolSet);
  const [batchDraft, setBatchDraft] = useState(String(seed.options.batch));
  const [batchError, setBatchError] = useState(false);
  const [gen, setGen] = useState<Generated>(seed.gen);
  const heroCopy = useCopyToClipboard();
  const allCopy = useCopyToClipboard();
  const [status, setStatus] = useState<"" | StatusPhrase>("");
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, [heroCopy.copied, announce]);

  useEffect(() => {
    if (!allCopy.copied) return;
    const timer = setTimeout(() => announce("Copied all passwords"), 0);
    return () => clearTimeout(timer);
  }, [allCopy.copied, announce]);

  const onRowCopied = useCallback(() => announce("Copied"), [announce]);

  useEffect(() => {
    writeUrl(options);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only canonical rewrite; idempotent under StrictMode
  }, []);

  // The new generation and the copy-hook reset happen in the same handler, so
  // a stale "Copied!" never survives next to a value it no longer matches
  // (WR-02, D-11) and no effect is needed.
  function applyGenerated(next: Generated) {
    setGen(next);
    heroCopy.reset();
    allCopy.reset();
  }

  function regenerate() {
    const next = generate(options, gen.generation + 1);
    applyGenerated(next);
    if (next.error === null) announce(generatedPhrase(next.results.length));
  }

  // The one path every option change takes (D-06): normalize with the mode
  // forced to password, set, write the URL, generate, then reset the copy
  // confirmation.
  // Synchronous, so the displayed output already obeys the new options when
  // the handler returns.
  function commit(next: ToolOptions): Generated {
    const normalized = normalizeToolOptions({ ...next, mode: "password" });
    setOptions(normalized);
    writeUrl(normalized);
    const applied = generate(normalized, gen.generation + 1);
    applyGenerated(applied);
    return applied;
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

  // A batch commit announces how many passwords there are now; every other
  // option commit stays silent (D-11).
  function announceCommit(applied: Generated) {
    if (applied.error === null) announce(generatedPhrase(applied.results.length));
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

  return (
    <div data-testid="password-tool" className="flex flex-col gap-8">
      <div data-testid="password-output-zone">
        <PasswordOutput
          gen={gen}
          heroCopy={heroCopy}
          allCopy={allCopy}
          onRegenerate={regenerate}
          onRowCopied={onRowCopied}
        />
      </div>
      <PasswordOptionsPanel
        options={options}
        lengthDraft={lengthDraft}
        lengthError={lengthError}
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
