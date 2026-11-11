import { Fragment } from "react";
import { highlightConfig } from "@/lib/config/highlight";
import { TOKEN_CLASSES } from "@/lib/config/token-classes";
import { SAMPLE_CONFIG } from "./faq-data";

/**
 * Server-rendered worked example for the Config page (Phase 10, D-10, D-11).
 * Runs the real tokenizer at build time and styles every span from the shared
 * TOKEN_CLASSES map, so the example cannot drift from the interactive tool.
 * Tokens are React text children (auto-escaped); no raw-HTML path is used.
 */
export function ConfigExample() {
  const lines = highlightConfig(SAMPLE_CONFIG, "cisco");

  return (
    <div>
      <p className="text-[14px] leading-[1.4] font-semibold text-foreground">
        Cisco IOS snippet, highlighted (documentation addresses only, RFC 5737)
      </p>
      <div
        data-testid="config-worked-example-preview"
        role="region"
        aria-label="Highlighted example configuration"
        tabIndex={0}
        className="mt-2 max-w-full overflow-x-auto rounded-lg border border-border bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <pre className="min-w-full w-max p-4 font-mono text-[14px] leading-[1.5]">
          {lines.map((line, lineIndex) => (
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
              {lineIndex < lines.length - 1 ? "\n" : null}
            </Fragment>
          ))}
        </pre>
      </div>
      <p className="mt-4 text-[16px] leading-[1.5] font-normal text-muted-foreground">
        Copy for email should keep these colors and the monospace formatting
        when you paste into email or documents. Copy plain text gives the raw
        configuration.
      </p>
    </div>
  );
}
