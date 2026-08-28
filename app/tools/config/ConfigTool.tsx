"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Copy } from "lucide-react";
import { copyPlainText, copyRichText } from "@/lib/config/clipboard";
import {
  buildConfigHtml,
  highlightConfig,
  type ConfigProfile,
  type ConfigTokenKind,
} from "@/lib/config/highlight";

type CopyState = "idle" | "copied" | "plain-fallback" | "error";

const TOKEN_CLASSES: Record<ConfigTokenKind, string> = {
  plain: "text-foreground",
  comment: "text-slate-500 italic dark:text-slate-400",
  command: "font-semibold text-blue-700 dark:text-blue-300",
  keyword: "font-semibold text-violet-700 dark:text-violet-300",
  interface: "text-amber-700 dark:text-amber-300",
  address: "text-emerald-700 dark:text-emerald-300",
  number: "text-rose-700 dark:text-rose-300",
  string: "text-fuchsia-700 dark:text-fuchsia-300",
};

const COPY_ERROR_MESSAGE =
  "Couldn't copy — select the configuration and copy it manually.";

export function ConfigTool() {
  const [config, setConfig] = useState("");
  const [profile, setProfile] = useState<ConfigProfile>("cisco");
  const [richCopyState, setRichCopyState] = useState<CopyState>("idle");
  const [plainCopyState, setPlainCopyState] = useState<CopyState>("idle");
  const richResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const plainResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const highlightedLines = useMemo(
    () => highlightConfig(config, profile),
    [config, profile]
  );

  useEffect(() => {
    const richReset = richResetRef;
    const plainReset = plainResetRef;
    return () => {
      if (richReset.current) clearTimeout(richReset.current);
      if (plainReset.current) clearTimeout(plainReset.current);
    };
  }, []);

  function resetCopyStates() {
    if (richResetRef.current) clearTimeout(richResetRef.current);
    if (plainResetRef.current) clearTimeout(plainResetRef.current);
    setRichCopyState("idle");
    setPlainCopyState("idle");
  }

  function scheduleReset(
    timeoutRef: typeof richResetRef,
    reset: () => void
  ) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(reset, 2000);
  }

  async function handleRichCopy() {
    try {
      const result = await copyRichText(
        config,
        buildConfigHtml(config, profile)
      );
      setRichCopyState(result === "rich" ? "copied" : "plain-fallback");
    } catch {
      setRichCopyState("error");
    }
    scheduleReset(richResetRef, () => setRichCopyState("idle"));
  }

  async function handlePlainCopy() {
    try {
      await copyPlainText(config);
      setPlainCopyState("copied");
    } catch {
      setPlainCopyState("error");
    }
    scheduleReset(plainResetRef, () => setPlainCopyState("idle"));
  }

  const isEmpty = config.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 sm:max-w-sm">
        <label
          htmlFor="config-profile"
          className="text-[14px] leading-[1.4] font-semibold text-foreground"
        >
          Language / profile
        </label>
        <select
          id="config-profile"
          data-testid="config-profile"
          value={profile}
          onChange={(event) => {
            setProfile(event.target.value as ConfigProfile);
            resetCopyStates();
          }}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-[14px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="cisco">Cisco IOS / IOS-XE / IOS-XR</option>
          <option value="plain">Plain text</option>
        </select>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label
            htmlFor="config-input"
            className="text-[14px] leading-[1.4] font-semibold text-foreground"
          >
            Configuration
          </label>
          <textarea
            id="config-input"
            data-testid="config-input"
            value={config}
            onChange={(event) => {
              setConfig(event.target.value);
              resetCopyStates();
            }}
            placeholder="Paste a network configuration here…"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="h-96 w-full resize-y rounded-lg border border-input bg-transparent px-4 py-3 font-mono text-[13px] leading-[1.5] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[14px] leading-[1.4] font-semibold text-foreground">
            Preview
          </span>
          <div
            data-testid="config-preview"
            className="h-96 max-w-full overflow-auto rounded-lg border border-border bg-secondary"
          >
            {isEmpty ? (
              <p className="p-4 font-mono text-[13px] leading-[1.5] text-muted-foreground">
                Your highlighted preview will appear here.
              </p>
            ) : (
              <pre className="min-w-full w-max p-4 font-mono text-[13px] leading-[1.5]">
                {highlightedLines.map((line, lineIndex) => (
                  <Fragment key={lineIndex}>
                    {line.map((token, tokenIndex) => (
                      <span
                        key={`${lineIndex}-${tokenIndex}`}
                        className={TOKEN_CLASSES[token.kind]}
                        data-token={token.kind}
                      >
                        {token.text}
                      </span>
                    ))}
                    {lineIndex < highlightedLines.length - 1 ? "\n" : null}
                  </Fragment>
                ))}
              </pre>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            data-testid="config-copy-rich"
            onClick={handleRichCopy}
            disabled={isEmpty}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-4 text-[14px] leading-[1.4] font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary/80 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          >
            {richCopyState === "copied" ||
            richCopyState === "plain-fallback" ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <Clipboard aria-hidden="true" className="size-4" />
            )}
            {richCopyState === "copied"
              ? "Copied!"
              : richCopyState === "plain-fallback"
                ? "Copied as plain text"
                : "Copy for email"}
          </button>
          <span aria-live="polite" className="sr-only">
            {richCopyState === "copied"
              ? "Copied rich text for email."
              : richCopyState === "plain-fallback"
                ? "Rich clipboard unavailable. Copied as plain text."
                : ""}
          </span>
          {richCopyState === "error" && (
            <span className="text-[14px] leading-[1.4] text-muted-foreground">
              {COPY_ERROR_MESSAGE}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <button
            type="button"
            data-testid="config-copy-plain"
            onClick={handlePlainCopy}
            disabled={isEmpty}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border px-4 text-[14px] leading-[1.4] font-semibold text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          >
            {plainCopyState === "copied" ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <Copy aria-hidden="true" className="size-4" />
            )}
            {plainCopyState === "copied" ? "Copied!" : "Copy plain text"}
          </button>
          <span aria-live="polite" className="sr-only">
            {plainCopyState === "copied" ? "Copied plain text." : ""}
          </span>
          {plainCopyState === "error" && (
            <span className="text-[14px] leading-[1.4] text-muted-foreground">
              {COPY_ERROR_MESSAGE}
            </span>
          )}
        </div>
      </div>

      <p className="text-[14px] leading-[1.4] text-muted-foreground">
        Your configuration stays in this browser tab and is never uploaded or
        saved.
      </p>
    </div>
  );
}

export default ConfigTool;
