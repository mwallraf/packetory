"use client";

import { useState } from "react";
import {
  GenerationExhaustedError,
  generateBatch,
  normalizeToolOptions,
  parseOptions,
  type ToolOptions,
} from "@/lib/password";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { PasswordOutput } from "./PasswordOutput";

export type GenError = "crypto" | "exhausted" | null;

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
  const [options] = useState<ToolOptions>(seed.options);
  const [gen, setGen] = useState<Generated>(seed.gen);
  const heroCopy = useCopyToClipboard();

  // The new generation and the copy-hook reset happen in the same handler, so
  // a stale "Copied!" never survives next to a value it no longer matches
  // (WR-02, D-11) and no effect is needed.
  function applyGenerated(next: Generated) {
    setGen(next);
    heroCopy.reset();
  }

  function regenerate() {
    applyGenerated(generate(options, gen.generation + 1));
  }

  return (
    <div data-testid="password-tool" className="flex flex-col gap-8">
      <div data-testid="password-output-zone">
        <PasswordOutput
          gen={gen}
          heroCopy={heroCopy}
          onRegenerate={regenerate}
        />
      </div>
    </div>
  );
}

export default PasswordTool;
