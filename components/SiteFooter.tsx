import Link from "next/link";

/**
 * Site-wide footer rendered below {children} in app/layout.tsx on every
 * route (D-14). Its only Phase 1 job is the "Privacy" link to /privacy —
 * the human-review-gated privacy notice (D-15).
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-4 py-6 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left lg:px-8">
        <p className="text-[14px] leading-[1.4] font-normal text-muted-foreground">
          &copy; {new Date().getFullYear()} Packetory
        </p>
        <nav aria-label="Footer" className="flex items-center gap-4">
          <Link
            href="/privacy"
            data-testid="footer-privacy-link"
            className="rounded-md text-[14px] leading-[1.4] font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
