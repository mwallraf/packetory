"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getSortedTools } from "@/tools/registry";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileNav } from "@/components/MobileNav";

/**
 * Registry-driven top nav bar, rendered on every route via app/layout.tsx
 * (SHELL-02). Desktop tool links are derived by iterating getSortedTools()
 * — never hardcoded (SHELL-04). `status:"planned"` tools (all four in
 * Phase 1) render muted and non-navigable per D-01; `status:"active"` tools
 * render as real links, with the current-route link distinguished by both
 * the accent tint AND a non-color underline indicator (QUAL-05).
 *
 * At <=320px the desktop nav hides and MobileNav's hamburger trigger takes
 * over (D-04); the logo and ThemeToggle stay visible outside its drawer.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const tools = getSortedTools();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-secondary">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          data-testid="site-logo"
          className="shrink-0 rounded-md text-[16px] leading-[1.5] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          Packetory
        </Link>

        <nav
          aria-label="Tool navigation"
          className="hidden flex-1 items-center justify-center gap-1 sm:flex"
        >
          {tools.map((tool) => {
            const href = `/tools/${tool.slug}`;
            const isNavigable = tool.status !== "planned";
            const isActive =
              isNavigable &&
              (pathname === href || pathname.startsWith(`${href}/`));

            if (!isNavigable) {
              // status:"planned" — muted, non-clickable (D-01). Rendered as
              // a <span>, not a <Link>, so it is never a real navigation
              // target or an extraneous tab stop.
              return (
                <span
                  key={tool.slug}
                  data-testid="nav-link-planned"
                  aria-disabled="true"
                  className="rounded-md px-2.5 py-1.5 text-[14px] leading-[1.4] font-semibold text-muted-foreground/60"
                >
                  {tool.shortName}
                </span>
              );
            }

            return (
              <Link
                key={tool.slug}
                href={href}
                data-testid="nav-link"
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-md border-b-2 px-2.5 py-1.5 text-[14px] leading-[1.4] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-foreground hover:text-primary"
                )}
              >
                {tool.shortName}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <MobileNav tools={tools} pathname={pathname} />
        </div>
      </div>
    </header>
  );
}
