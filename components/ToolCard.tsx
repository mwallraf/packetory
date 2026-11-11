import Link from "next/link";
import {
  Cpu,
  FileTerminal,
  Fingerprint,
  Globe,
  Hash,
  Network,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ToolDefinition } from "@/tools/registry";

/**
 * Maps a registry `icon` string (project-brief.md §8.1) to its lucide-react
 * component. Every icon referenced by tools/registry.ts MUST have an entry
 * here, and a missing one throws (CFG-03: no silent fallback to another
 * tool's icon).
 */
export const ICONS: Record<string, LucideIcon> = {
  Fingerprint,
  Network,
  Globe,
  Cpu,
  Hash,
  FileTerminal,
};

/** Throws unless `name` is an own-property ICONS entry (prototype keys such
 * as `toString` never resolve). A void assertion, not a component-returning
 * helper, so `const Icon = ICONS[name]` stays lint-clean under
 * react-hooks/static-components. */
export function assertToolIcon(name: string): void {
  if (!Object.hasOwn(ICONS, name)) {
    throw new Error(
      `Unknown tool icon "${name}": add it to ICONS in components/ToolCard.tsx`
    );
  }
}

const CATEGORY_LABELS: Record<ToolDefinition["category"], string> = {
  network: "Network",
  dns: "DNS",
  web: "Web",
  encode: "Encode",
  generate: "Generate",
};

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  assertToolIcon(tool.icon);
  const Icon = ICONS[tool.icon];
  const isPlanned = tool.status === "planned";
  const href = `/tools/${tool.slug}`;
  const isNavigable = !isPlanned;

  return (
    <Card
      data-testid="tool-card"
      className={cn(
        "relative h-full",
        isNavigable &&
          "has-[:hover]:ring-primary/40 has-[:hover]:shadow-md transition-shadow has-[:focus-visible]:outline-none has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50"
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon
              aria-hidden="true"
              className="size-5 shrink-0 text-muted-foreground"
            />
            {/* Heading role: 20px / 600 / 1.2 line-height (UI-SPEC Typography) */}
            <CardTitle
              data-testid="tool-card-name"
              className="text-[20px] leading-[1.2] font-semibold"
            >
              {isNavigable ? (
                <Link
                  href={href}
                  className="after:absolute after:inset-0 focus-visible:outline-none"
                >
                  {tool.name}
                </Link>
              ) : (
                tool.name
              )}
            </CardTitle>
          </div>
          {isPlanned ? (
            // Label role: 14px / 600 / 1.4 — muted neutral slate, never accent (UI-SPEC Color).
            <Badge
              variant="secondary"
              className="shrink-0 whitespace-nowrap text-[14px] leading-[1.4] font-semibold text-muted-foreground"
            >
              Coming soon
            </Badge>
          ) : null}
        </div>
        {/* Body role: 16px / 400 / 1.5, clamped to 2 lines (UI-SPEC UI Considerations overflow row) */}
        <CardDescription
          data-testid="tool-card-description"
          className="line-clamp-2 text-[16px] leading-[1.5] font-normal"
        >
          {tool.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Label role: 14px / 600 / 1.4 */}
        <span
          data-testid="tool-card-category"
          className="text-[14px] leading-[1.4] font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {CATEGORY_LABELS[tool.category]}
        </span>
      </CardContent>
    </Card>
  );
}
