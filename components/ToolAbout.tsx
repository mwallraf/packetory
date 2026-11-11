import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import {
  buildFaqJsonLd,
  serializeJsonLd,
  type FaqItem,
} from "@/lib/seo/jsonld";
import { cn } from "@/lib/utils";

/**
 * Shared "About this tool" area (Phase 10, INFO-01/02/03/05). A Server
 * Component with no client JavaScript: the two disclosures are native
 * `<details>` elements that start closed and toggle without any handler,
 * hook or state. It is rendered as the LAST child of `main`, never above or
 * over the tool.
 */

const SUMMARY_CLASS =
  "flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg py-2 text-[16px] leading-[1.5] font-semibold text-muted-foreground transition-colors outline-none select-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden";

const CHEVRON_CLASS =
  "size-4 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none";

/**
 * FAQPage JSON-LD script, built from the same `items` that render the
 * visible FAQ. This is the only raw-HTML injection in the About system; the
 * payload is `serializeJsonLd` output, which escapes every `<` (T-10-01).
 */
export function FaqJsonLd({ items }: { items: readonly FaqItem[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd(buildFaqJsonLd(items)),
      }}
    />
  );
}

export function ToolAbout({
  slug,
  faqItems,
  children,
  className,
}: {
  slug: string;
  faqItems: readonly FaqItem[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      data-testid="about-tool"
      aria-labelledby="about-heading"
      className={cn("mt-16 w-full max-w-3xl border-t border-border pt-8", className)}
    >
      <FaqJsonLd items={faqItems} />
      <h2
        id="about-heading"
        className="text-[14px] leading-[1.4] font-semibold text-muted-foreground"
      >
        About this tool
      </h2>
      <div className="mt-4">
        <details className="group" data-testid={`${slug}-worked-example`}>
          <summary className={SUMMARY_CLASS}>
            <ChevronRight aria-hidden="true" className={CHEVRON_CLASS} />
            Worked example
          </summary>
          <div className="pt-2 pb-4 pl-6">{children}</div>
        </details>
        <details className="group" data-testid={`${slug}-faq`}>
          <summary className={SUMMARY_CLASS}>
            <ChevronRight aria-hidden="true" className={CHEVRON_CLASS} />
            {`FAQ (${faqItems.length} questions)`}
          </summary>
          <div className="space-y-6 pt-2 pb-4 pl-6">
            {faqItems.map((item) => (
              <div key={item.question} data-testid={`${slug}-faq-item`}>
                <p className="text-[14px] leading-[1.4] font-semibold text-foreground">
                  {item.question}
                </p>
                <p className="mt-1 text-[16px] leading-[1.5] font-normal text-muted-foreground">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
