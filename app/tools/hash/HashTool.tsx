"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Info, TriangleAlert } from "lucide-react";
import { createHashClient, type HashClient } from "@/lib/hash/client";
import { ALGORITHMS } from "@/lib/hash/algorithms";
import { formatDigest, type DigestEncoding } from "@/lib/hash/format";
import { SAMPLE_TEXT, sampleDigests } from "@/lib/hash/sample";
import { encodeText } from "@/lib/hash/source";
import type { Digests } from "@/lib/hash/types";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { DigestRow } from "./DigestRow";
import { OutputToolbar } from "./OutputToolbar";

/** Soft cap on UTF-8 bytes (D-07): above it a notice shows; hashing still runs. */
const TEXT_SOFT_CAP_BYTES = 1_048_576;
/** Debounce applied only above the soft cap (D-06 discretion). */
const SOFT_CAP_DEBOUNCE_MS = 150;

const EMPTY_NOTICE_COPY = "Empty input. Showing the digests of an empty string.";
const SOFT_CAP_COPY =
  "This text is over 1 MiB, so updates may lag. Hashing still runs.";
const HASH_ERROR_COPY =
  "Couldn't compute digests in this browser. Reload the page and try again.";

/** Digests paired with the exact text they were computed from. */
type Settled = { text: string; digests: Digests };

function sampleResult(): Settled {
  return { text: SAMPLE_TEXT, digests: sampleDigests() };
}

/**
 * Hash Generator island (TEXT-01, TEXT-02). Paints the 10 digests of the
 * sample from precomputed constants on first render (no worker call), then
 * hashes typed text live through the Phase 8 `HashClient`. A result is applied
 * only if it belongs to the latest started job (`seqRef`).
 *
 * The typed text is never logged, persisted or stored.
 */
export function HashTool() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [result, setResult] = useState<Settled>(sampleResult);
  const [hashError, setHashError] = useState(false);
  // Display-only (D-11): never an input to runHash; toggling re-formats the
  // stored digest bytes and never re-hashes.
  const [encoding, setEncoding] = useState<DigestEncoding>("hex");

  const clientRef = useRef<HashClient | null>(null);
  const seqRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // The client is created INSIDE the effect: dispose() is final and React
  // StrictMode runs mount -> cleanup -> mount, so a client created anywhere
  // else would be dead after the first cleanup.
  useEffect(() => {
    const client = createHashClient();
    clientRef.current = client;
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      client.dispose();
      clientRef.current = null;
      seqRef.current += 1;
    };
  }, []);

  function runHash(value: string) {
    const client = clientRef.current;
    if (!client) return;
    const id = ++seqRef.current;
    void client
      .start({ kind: "text", text: value })
      .then((outcome) => {
        if (id !== seqRef.current) return;
        if (outcome.status === "done") {
          setResult({ text: value, digests: outcome.digests });
          setHashError(false);
        } else if (outcome.status === "error") {
          setHashError(true);
        }
        // "cancelled": a superseded job; never shown as an error.
      })
      .catch(() => {
        if (id !== seqRef.current) return;
        setHashError(true);
      });
  }

  /** Drops any pending debounced job and supersedes the in-flight one. */
  function cancelPending() {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    seqRef.current += 1;
    clientRef.current?.cancel();
  }

  function handleTextChange(value: string) {
    setText(value);
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (value === SAMPLE_TEXT) {
      // Instant path: the sample digests are constants, no worker call.
      cancelPending();
      setResult(sampleResult());
      setHashError(false);
      return;
    }
    if (encodeText(value).length > TEXT_SOFT_CAP_BYTES) {
      // Supersede the in-flight job now; start the new one after a short pause.
      cancelPending();
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        runHash(value);
      }, SOFT_CAP_DEBOUNCE_MS);
      return;
    }
    runHash(value);
  }

  const byteLength = useMemo(() => encodeText(text).length, [text]);

  // The displayed digests belong to older text until the latest job lands.
  const stale = result.text !== text;
  const overSoftCap = byteLength > TEXT_SOFT_CAP_BYTES;

  return (
    <div data-testid="hash-tool" className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <Label
            htmlFor="hash-input"
            className="text-[14px] leading-[1.4] font-semibold text-foreground"
          >
            Text to hash
          </Label>
          <span
            data-testid="hash-bytes"
            className="tabular-nums text-[14px] leading-[1.4] text-muted-foreground"
          >
            {byteLength === 1 ? "1 byte" : `${byteLength} bytes`} (UTF-8)
          </span>
        </div>
        <Textarea
          id="hash-input"
          data-testid="hash-input"
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onFocus={(e) => {
            // D-03: the untouched sample is selected so the first keystroke
            // replaces it. Selected immediately (a fast first keystroke must
            // not beat the selection) and again next frame (covers browsers
            // that place the caret after the focus event); onMouseUp below
            // stops the click from collapsing it.
            if (e.currentTarget.value === SAMPLE_TEXT) {
              const el = e.currentTarget;
              el.select();
              requestAnimationFrame(() => el.select());
            }
          }}
          onMouseUp={(e) => {
            // Pitfall 7: the click's mouseup would collapse the select-all made
            // on focus. Suppress it only while the untouched sample is fully
            // selected, so later clicks place the caret normally.
            const el = e.currentTarget;
            if (
              el.value === SAMPLE_TEXT &&
              el.selectionStart === 0 &&
              el.selectionEnd === el.value.length
            ) {
              e.preventDefault();
            }
          }}
          aria-describedby="hash-input-meta"
          rows={3}
          placeholder="Type or paste text to hash"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
          className="font-mono text-base md:text-base leading-[1.5] field-sizing-fixed min-h-[96px] max-h-[320px] resize-y overflow-y-auto break-all"
        />
        <div
          id="hash-input-meta"
          data-testid="hash-input-hint"
          className="flex flex-col gap-1 text-[14px] leading-[1.4] text-muted-foreground"
        >
          <p>
            Hashes exactly what is typed, with no trailing newline.{" "}
            <code className="font-mono">echo</code> adds one; use{" "}
            <code className="font-mono">printf &apos;%s&apos;</code> or{" "}
            <code className="font-mono">echo -n</code> to match. Pasted CRLF
            line endings become LF.
          </p>
        </div>
      </div>

      {text === "" && (
        <p
          data-testid="hash-notice-empty"
          className="flex items-start gap-2 text-[14px] leading-[1.4] text-muted-foreground"
        >
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {EMPTY_NOTICE_COPY}
        </p>
      )}

      {overSoftCap && (
        <p
          data-testid="hash-notice-soft-cap"
          className="flex items-start gap-2 text-[14px] leading-[1.4] text-muted-foreground"
        >
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {SOFT_CAP_COPY}
        </p>
      )}

      {hashError && (
        <p
          role="alert"
          data-testid="hash-notice-error"
          className="flex items-start gap-2 text-[14px] leading-[1.4] text-destructive"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {HASH_ERROR_COPY}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-[20px] leading-[1.2] font-semibold text-foreground">
          Digests
        </h2>
        <OutputToolbar encoding={encoding} onEncodingChange={setEncoding} />
        <div
          data-testid="hash-rows"
          aria-busy={stale}
          className={cn(
            "flex flex-col gap-2 transition-opacity",
            stale && "opacity-60",
          )}
        >
          {ALGORITHMS.map((algo) => (
            <DigestRow
              key={algo.id}
              id={algo.id}
              label={algo.label}
              value={formatDigest(algo.id, result.digests[algo.id], encoding)}
              primary={algo.id === "sha256"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
