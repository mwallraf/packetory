import {
  Cpu,
  Fingerprint,
  Globe,
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
import type { ToolDefinition } from "@/tools/registry";

/**
 * Maps a registry `icon` string (project-brief.md §8.1) to its lucide-react
 * component. Every icon referenced by tools/registry.ts MUST have an entry
 * here.
 */
const ICONS: Record<string, LucideIcon> = {
  Fingerprint,
  Network,
  Globe,
  Cpu,
};

const CATEGORY_LABELS: Record<ToolDefinition["category"], string> = {
  network: "Network",
  dns: "DNS",
  web: "Web",
  encode: "Encode",
  generate: "Generate",
};

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const Icon = ICONS[tool.icon] ?? Fingerprint;
  const isPlanned = tool.status === "planned";

  return (
    <Card data-testid="tool-card" className="h-full">
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
              {tool.name}
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
