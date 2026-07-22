import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Packetory — Instant network tools for engineers",
  description:
    "Packetory is a fast, no-friction collection of network and infrastructure utilities: UUID generator, IP subnet calculator, DNS lookup, and MAC address inspector.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the theme class to <html> before first paint — no FOUC,
            no hydration-mismatch warning (SHELL-05 no-flash backstop). */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <TooltipProvider>
            <header className="border-b border-border">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                <span className="text-[16px] leading-[1.5] font-semibold">
                  Packetory
                </span>
                <ThemeToggle />
              </div>
            </header>
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
