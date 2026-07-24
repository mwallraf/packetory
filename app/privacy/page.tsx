import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy — Packetory",
  description:
    "How Packetory handles data: no tracking cookies, no accounts, no PII, and cookie-free analytics with allow-list query-param redaction.",
};

/**
 * Privacy notice (D-14, D-15). This is a real, honest first-pass draft
 * describing Packetory's ACTUAL current behavior — it ships live but is
 * explicitly flagged below as not yet human-approved / launch-final
 * (autonomy boundary: legal/privacy text requires human sign-off,
 * project-brief.md §14). It makes no compliance claim (e.g. GDPR/CCPA) the
 * project has not actually completed.
 */
export default function PrivacyPage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-[32px] leading-[1.2] font-semibold text-foreground">
          Privacy
        </h1>

        <div
          data-testid="privacy-draft-notice"
          className="mt-4 rounded-md border border-border bg-secondary px-4 py-3 text-[14px] leading-[1.4] font-semibold text-muted-foreground"
        >
          Draft notice: this page describes Packetory&apos;s actual current
          behavior and is published in good faith, but it has not yet
          received a final human legal/privacy review. It is not
          launch-final. The final Belgian/EU analytics and disclosure
          configuration will be confirmed before public launch.
        </div>

        <div className="mt-8 space-y-6 text-[16px] leading-[1.5] font-normal text-foreground">
          <p>
            Packetory is built to be used without giving up anything about
            yourself. This page describes exactly what the site does and
            does not do with your data — no legal boilerplate, no vague
            reassurances.
          </p>

          <section>
            <h2 className="text-[20px] leading-[1.2] font-semibold text-foreground">
              No accounts, no personal data
            </h2>
            <p className="mt-2">
              Packetory has no user accounts, no login, and no sign-up. We do
              not ask for your name, email address, or any other personally
              identifiable information (PII), and we do not collect any in
              v1. Every tool runs entirely in your browser unless a result
              inherently requires an external lookup (for example, a DNS
              query or a MAC vendor lookup) — those requests go directly
              from your browser to the relevant service, not through
              Packetory&apos;s own servers where avoidable.
            </p>
            <p className="mt-2">
              For example, the DNS Lookup tool sends the domain you enter
              directly from your browser to Cloudflare (the primary
              DNS-over-HTTPS resolver) and, only if Cloudflare is
              unavailable, to Google (an explicit fallback) — the domain is
              never stored or sent anywhere else.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] leading-[1.2] font-semibold text-foreground">
              No tracking cookies
            </h2>
            <p className="mt-2">
              Packetory does not set any tracking cookie, and no consent
              banner is shown because none is required for how the site
              operates:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                Your light/dark theme preference is saved only in your
                browser&apos;s <code>localStorage</code>, never in a cookie,
                and is never sent to any server.
              </li>
              <li>
                Page-view analytics (see below) run without cookies or any
                cross-visit identifier.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-[20px] leading-[1.2] font-semibold text-foreground">
              Analytics: cookie-free, and redacted by default
            </h2>
            <p className="mt-2">
              Packetory uses Vercel Analytics, which is cookie-free by
              design, to understand aggregate traffic (for example, which
              tool pages are visited). Before any page URL is reported, its
              query parameters are passed through a central, safe-by-default
              allow-list: a query parameter is only ever reported if it has
              been explicitly and deliberately added to that allow-list.
              Every other parameter — including any future tool input such
              as a MAC address, an internal hostname, a private IP address,
              or a secret/token typed into a URL — is stripped before the
              page view leaves your browser. As of today, that allow-list is
              empty, so no query parameters are reported at all.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] leading-[1.2] font-semibold text-foreground">
              What we don&apos;t do
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>No device fingerprinting or cross-visit identifiers.</li>
              <li>No sale or sharing of data with third parties.</li>
              <li>No advertising trackers.</li>
              <li>
                No claim of GDPR, CCPA, or any other formal compliance
                certification — Packetory is a small, privacy-minded
                side project, and this notice describes its actual
                behavior rather than asserting a legal status it hasn&apos;t
                formally verified.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-[20px] leading-[1.2] font-semibold text-foreground">
              Language
            </h2>
            <p className="mt-2">
              Packetory is currently available in English only.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] leading-[1.2] font-semibold text-foreground">
              Changes to this notice
            </h2>
            <p className="mt-2">
              As Packetory adds new tools, this notice will be updated to
              stay accurate — for example, if a future tool ever needs a new
              analytics query parameter, that parameter will be reviewed and
              added to the allow-list deliberately, and this page will
              reflect that.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
