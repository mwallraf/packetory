"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Info,
  Link as LinkIcon,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import { createHashClient, type HashClient } from "@/lib/hash/client";
import { ALGORITHMS } from "@/lib/hash/algorithms";
import { formatDigest, type DigestEncoding } from "@/lib/hash/format";
import { SAMPLE_TEXT, sampleDigests } from "@/lib/hash/sample";
import { encodeText } from "@/lib/hash/source";
import { buildShareLink } from "@/lib/hash/share-link";
import { matchExpected, normalizeExpected } from "@/lib/hash/verify";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { useKeyboardShortcut } from "@/lib/hooks/useKeyboardShortcut";
import type { Digests } from "@/lib/hash/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { COPY_ERROR_MESSAGE, DigestRow } from "./DigestRow";
import { OutputToolbar } from "./OutputToolbar";
import { VerifyBox } from "./VerifyBox";

/** Soft cap on UTF-8 bytes (D-07): above it a notice shows; hashing still runs. */
const TEXT_SOFT_CAP_BYTES = 1_048_576;
/** Debounce applied only above the soft cap (D-06 discretion). */
const SOFT_CAP_DEBOUNCE_MS = 150;

const EMPTY_NOTICE_COPY = "Empty input. Showing the digests of an empty string.";
const SOFT_CAP_COPY =
  "This text is over 1 MiB, so updates may lag. Hashing still runs.";
const LINK_TOO_LONG_COPY =
  "Text is too long for a link (over 2,000 encoded characters).";
const LINK_UNENCODABLE_COPY = "This text can't be encoded into a link.";
const RESET_NOTICE_COPY = "Reset to the sample.";
const HASH_ERROR_COPY =
  "Couldn't compute digests in this browser. Reload the page and try again.";

/** True while a Radix dialog (the mobile nav Sheet) is open: its Esc closes it. */
function isDialogOpen(): boolean {
  return document.querySelector('[role="dialog"][data-state="open"]') !== null;
}

/** Digests paired with the exact text they were computed from. */
type Settled = { text: string; digests: Digests };

function sampleResult(): Settled {
  return { text: SAMPLE_TEXT, digests: sampleDigests() };
}

/**
 * Reads `?text=` once, at mount (TEXT-04, D-20). Read-only: the tool never
 * writes the typed text back into the address bar, history or the Next navigation layer. The
 * first occurrence wins; a missing or empty value falls back to the sample.
 */
function readTextParam(): string | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("text");
  return value === null || value === "" ? null : value;
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
  const [text, setText] = useState<string>(() => readTextParam() ?? SAMPLE_TEXT);
  // Null while a `?text=` restore is still hashing: the sample's digests must
  // never be shown beside non-sample text (rows show pending placeholders).
  const [result, setResult] = useState<Settled | null>(() =>
    text === SAMPLE_TEXT ? sampleResult() : null,
  );
  const [hashError, setHashError] = useState(false);
  // Display-only (D-11): never an input to runHash; toggling re-formats the
  // stored digest bytes and never re-hashes.
  const [encoding, setEncoding] = useState<DigestEncoding>("hex");
  // The pasted expected checksum (OUT-04); compared only, never hashed.
  const [expected, setExpected] = useState("");

  // The text Esc replaced, kept until the next edit so it can be restored.
  const [restorable, setRestorable] = useState<string | null>(null);

  const linkCopy = useCopyToClipboard();
  // Drives the SHA-256 row's "Copied!" when the keyboard shortcut copies it.
  const primaryCopy = useCopyToClipboard();

  const clientRef = useRef<HashClient | null>(null);
  const seqRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  // The client is created INSIDE the effect: dispose() is final and React
  // StrictMode runs mount -> cleanup -> mount, so a client created anywhere
  // else would be dead after the first cleanup.
  useEffect(() => {
    const client = createHashClient();
    clientRef.current = client;
    // A restored `?text=` has no precomputed digests: hash it now. Only the
    // async continuation sets state, so nothing is set synchronously here.
    if (text !== SAMPLE_TEXT) runHash(text);
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      client.dispose();
      clientRef.current = null;
      seqRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-time read of the restored text; the effect must run once per mount, not on every edit.
  }, []);

  function handleTextChange(value: string) {
    setText(value);
    setRestorable(null);
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

  /**
   * Esc (D-23): cancels the in-flight job and any debounce timer, restores the
   * sample and its constant digests, clears the verify box and any engine
   * error. The encoding and copy-all toggles are untouched.
   */
  function resetToSample() {
    // Esc must never irrecoverably discard typed text: keep it for "Restore
    // your text". A second Esc over the sample keeps the earlier stash.
    if (text !== SAMPLE_TEXT) setRestorable(text);
    cancelPending();
    setText(SAMPLE_TEXT);
    setResult(sampleResult());
    setExpected("");
    setHashError(false);
  }

  // Enter is intentionally left unbound: it must reach the textarea and insert
  // a newline (INT-01). Hashing is live, so there is nothing to execute.
  useKeyboardShortcut({
    slash: () => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.select();
    },
    escape: () => {
      // Esc closes an open dialog (mobile nav); it must not also wipe the tool.
      if (isDialogOpen()) return;
      resetToSample();
    },
    copy: () => {
      // Never clobber a native copy of a text selection, and never copy
      // while no settled result exists (?text= restore still hashing).
      if ((window.getSelection()?.toString() ?? "") !== "") return;
      if (result === null) return;
      void primaryCopy.copy(
        formatDigest("sha256", result.digests.sha256, encoding),
      );
    },
  });

  // The Copied! state belongs to one displayed SHA-256 string.
  const displayedSha256 =
    result === null ? "" : formatDigest("sha256", result.digests.sha256, encoding);
  const resetPrimaryCopy = primaryCopy.reset;
  useEffect(() => {
    resetPrimaryCopy();
  }, [displayedSha256, resetPrimaryCopy]);

  // Built from the CURRENT text (never result.text) at render; copied only on
  // an explicit click (D-20/D-21). The Copied! state belongs to one text.
  const link = buildShareLink(window.location.origin, text);
  const resetLinkCopy = linkCopy.reset;
  useEffect(() => {
    resetLinkCopy();
  }, [text, resetLinkCopy]);

  const byteLength = useMemo(() => encodeText(text).length, [text]);

  // The displayed digests belong to older text until the latest job lands.
  const stale = result === null || result.text !== text;
  const overSoftCap = byteLength > TEXT_SOFT_CAP_BYTES;

  // Derived at render so it re-evaluates whenever the settled digests change
  // (D-19). Never asserted against stale digests: pending until they settle.
  const digests = result === null ? null : result.digests;
  const verifyMatch = useMemo(
    () => (digests === null ? null : matchExpected(expected, digests)),
    [expected, digests],
  );
  const verify =
    verifyMatch === null
      ? normalizeExpected(expected) === null
        ? ({ state: "idle" } as const)
        : ({ state: "pending" } as const)
      : verifyMatch.state !== "idle" && stale
        ? ({ state: "pending" } as const)
        : verifyMatch;
  const matchedIds = verify.state === "match" ? verify.ids : [];

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
        <div className="flex flex-col items-start gap-1">
          <Button
            type="button"
            variant="outline"
            disabled={!link.ok}
            onClick={() => {
              if (link.ok) void linkCopy.copy(link.url);
            }}
            aria-describedby={
              link.ok
                ? undefined
                : link.reason === "empty"
                  ? "hash-notice-empty"
                  : "hash-notice-link"
            }
            data-testid="hash-copy-link"
            className="h-11 gap-1 text-primary"
          >
            {linkCopy.copied ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <LinkIcon aria-hidden="true" className="size-4" />
            )}
            {linkCopy.copied ? "Copied!" : "Copy link"}
          </Button>
          <span
            aria-live="polite"
            className="sr-only"
            data-testid="hash-copy-link-status"
          >
            {linkCopy.copied ? "Copied!" : ""}
          </span>
          {linkCopy.error && (
            <span className="text-[14px] leading-[1.4] font-normal text-muted-foreground">
              {COPY_ERROR_MESSAGE}
            </span>
          )}
        </div>
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
          <p data-testid="hash-input-link-notice">
            The link contains your text.
          </p>
        </div>
      </div>

      {text === "" && (
        <p
          id="hash-notice-empty"
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

      {!link.ok && link.reason !== "empty" && (
        <p
          id="hash-notice-link"
          data-testid="hash-notice-link"
          className="flex items-start gap-2 text-[14px] leading-[1.4] text-muted-foreground"
        >
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {link.reason === "too-long" ? LINK_TOO_LONG_COPY : LINK_UNENCODABLE_COPY}
        </p>
      )}

      {restorable !== null && (
        <div
          data-testid="hash-notice-restore"
          className="flex items-start gap-2 text-[14px] leading-[1.4] text-muted-foreground"
        >
          <Undo2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{RESET_NOTICE_COPY}</span>
          <Button
            type="button"
            variant="ghost"
            data-testid="hash-restore"
            className="h-11"
            onClick={() => {
              const stored = restorable;
              setRestorable(null);
              handleTextChange(stored);
              textareaRef.current?.focus();
            }}
          >
            Restore your text
          </Button>
        </div>
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

      <VerifyBox value={expected} onChange={setExpected} result={verify} />

      <div className="flex flex-col gap-2">
        <h2 className="text-[20px] leading-[1.2] font-semibold text-foreground">
          Digests
        </h2>
        <OutputToolbar
          encoding={encoding}
          onEncodingChange={setEncoding}
          digests={digests}
        />
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
              value={
                result === null
                  ? ""
                  : formatDigest(algo.id, result.digests[algo.id], encoding)
              }
              pending={result === null}
              placeholderLength={algo.bits / 4}
              primary={algo.id === "sha256"}
              notForSecurity={algo.notForSecurity}
              alwaysHex={algo.id === "crc32" && encoding === "base64"}
              matched={matchedIds.includes(algo.id)}
              // SHA-256 row only: externalCopied={primaryCopy.copied} mirrors the shortcut.
              externalCopied={algo.id === "sha256" && primaryCopy.copied}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
