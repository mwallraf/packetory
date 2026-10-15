"use client";

import { useEffect, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { createHashClient, type HashClient } from "@/lib/hash/client";
import { ALGORITHMS } from "@/lib/hash/algorithms";
import { toHex } from "@/lib/hash/format";
import { SAMPLE_TEXT, sampleDigests } from "@/lib/hash/sample";
import type { Digests } from "@/lib/hash/types";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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

  const clientRef = useRef<HashClient | null>(null);
  const seqRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // The client is created INSIDE the effect: dispose() is final and React
  // StrictMode runs mount -> cleanup -> mount, so a client created anywhere
  // else would be dead after the first cleanup.
  useEffect(() => {
    const client = createHashClient();
    clientRef.current = client;
    return () => {
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

  function handleTextChange(value: string) {
    setText(value);
    if (value === SAMPLE_TEXT) {
      seqRef.current += 1;
      clientRef.current?.cancel();
      setResult(sampleResult());
      return;
    }
    runHash(value);
  }

  // The displayed digests belong to older text until the latest job lands.
  const stale = result.text !== text;

  return (
    <div data-testid="hash-tool" className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="hash-input"
          className="text-[14px] leading-[1.4] font-semibold text-foreground"
        >
          Text to hash
        </Label>
        <Textarea
          id="hash-input"
          data-testid="hash-input"
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
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
      </div>

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
        <div
          data-testid="hash-rows"
          aria-busy={stale}
          className={cn(
            "flex flex-col gap-2 transition-opacity",
            stale && "opacity-60",
          )}
        >
          {ALGORITHMS.map((algo) => (
            <div
              key={algo.id}
              data-testid={"hash-row-" + algo.id}
              className="flex flex-col gap-1 rounded-md border border-border bg-secondary px-4 py-3"
            >
              <span className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
                {algo.label}
              </span>
              <span
                data-testid={"hash-row-" + algo.id + "-value"}
                className="min-w-0 font-mono text-base leading-[1.5] break-all text-foreground"
              >
                {toHex(result.digests[algo.id])}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
