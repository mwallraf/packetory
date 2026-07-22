import { getSortedTools } from "@/tools/registry";
import { ToolCard } from "@/components/ToolCard";
import { IpBadge } from "@/components/IpBadge";

export default function Home() {
  const tools = getSortedTools();

  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          {/* Display role: 32px / 600 / 1.2 line-height, one h1 per page (UI-SPEC Typography) */}
          <h1 className="text-[32px] leading-[1.2] font-semibold text-foreground">
            Instant network tools for engineers.
          </h1>
          <p className="mt-4 text-[16px] leading-[1.5] font-normal text-muted-foreground">
            Zero-effort, zero-login utilities for network engineers, sysadmins,
            and developers — every tool below shows a useful result the
            instant you land, no forms required.
          </p>
          {/* Visitor-IP widget: secondary to the tool grid below, not a tool
              card of its own (D-08, SHELL-03). */}
          <div className="mt-6 flex justify-center">
            <IpBadge />
          </div>
        </div>

        {/* Flat responsive grid: single column at 320px, no category grouping (D-02, SHELL-06). */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </main>
    </div>
  );
}
