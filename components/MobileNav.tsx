"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { ToolDefinition } from "@/tools/registry";

/**
 * <=320px hamburger drawer (D-04, SHELL-06). The logo and ThemeToggle stay
 * visible in SiteHeader OUTSIDE this Sheet — only the tool nav collapses
 * behind the hamburger trigger. Uses each tool's `shortName` (single-line,
 * per UI-SPEC's long-text consideration) and scrolls vertically if the link
 * list outgrows the viewport while the header stays pinned (overflow
 * backstop). Radix's Dialog primitive (which Sheet wraps) provides the
 * default focus trap, Esc-to-close, and focus-return-to-trigger behavior.
 */
export function MobileNav({
  tools,
  pathname,
}: {
  tools: ToolDefinition[];
  pathname: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label="Open navigation menu"
          data-testid="mobile-nav-trigger"
          className="size-11 shrink-0 rounded-lg p-0 sm:hidden"
        >
          <Menu aria-hidden="true" className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        data-testid="mobile-nav-drawer"
        className="flex w-3/4 max-w-xs flex-col gap-0 p-0"
      >
        <SheetHeader className="shrink-0 border-b border-border">
          <SheetTitle>Tools</SheetTitle>
        </SheetHeader>
        <nav
          aria-label="Tool navigation"
          className="flex-1 overflow-y-auto p-4"
        >
          <ul className="flex flex-col gap-1">
            {tools.map((tool) => {
              const href = `/tools/${tool.slug}`;
              const isNavigable = tool.status !== "planned";
              const isActive =
                isNavigable &&
                (pathname === href || pathname.startsWith(`${href}/`));

              return (
                <li key={tool.slug}>
                  {isNavigable ? (
                    <Link
                      href={href}
                      data-testid="mobile-nav-link"
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "block whitespace-nowrap rounded-md border-l-2 px-3 py-2 text-[14px] leading-[1.4] font-semibold",
                        isActive
                          ? "border-primary text-primary"
                          : "border-transparent text-foreground hover:text-primary"
                      )}
                    >
                      {tool.shortName}
                    </Link>
                  ) : (
                    // status:"planned" — muted, non-clickable (D-01).
                    <span
                      data-testid="mobile-nav-link-planned"
                      aria-disabled="true"
                      className="block whitespace-nowrap rounded-md border-l-2 border-transparent px-3 py-2 text-[14px] leading-[1.4] font-semibold text-muted-foreground/60"
                    >
                      {tool.shortName}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
