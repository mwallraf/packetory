/**
 * Single source of truth for the UUID tool page's FAQ content and worked
 * example (D-09, D-10, D-11). Both the visible FAQ prose and the FAQPage
 * JSON-LD in `page.tsx` map over `faqItems`, so structured data and
 * on-screen content cannot drift.
 *
 * Copy notes (RESEARCH.md prohibitions, judgment-tier):
 * - Uniqueness is described probabilistically (collision probability
 *   negligible for practical purposes), never as an absolute guarantee.
 * - UUID v7 is described as time-ordered/sortable, never as a strict
 *   global monotonic sequence across independent generators.
 */

export type FaqItem = {
  question: string;
  answer: string;
};

export const faqItems: FaqItem[] = [
  {
    question: "What's the difference between UUID v4 and v7?",
    answer:
      "UUID v4 is fully random — every value is generated independently with no relationship to when it was created. UUID v7 embeds a Unix millisecond timestamp in its first bits, so values generated later sort after values generated earlier when compared as plain strings. That makes v7 time-ordered and sortable, not a strict global sequence guaranteed across independent machines or processes — clock skew and same-millisecond generation mean ordering is approximate, not absolute.",
  },
  {
    question: "Are UUIDs guaranteed unique?",
    answer:
      "Not in an absolute mathematical sense — but the collision probability is negligible for practical purposes. A v4 UUID has 122 random bits, so you'd need to generate billions of UUIDs per second for centuries before the odds of a single collision became meaningful. For virtually every real-world use case, treating a freshly generated UUID as unique is safe.",
  },
  {
    question: "Can I use a UUID as a database primary key?",
    answer:
      "Yes. UUID v4 works but its randomness can hurt index locality (new rows scatter across a B-tree index rather than appending). UUID v7 is generally a better fit for primary keys because its time-ordered structure keeps new inserts clustered near the end of the index, similar to an auto-incrementing integer, while still avoiding the enumeration and multi-node coordination problems of a sequential ID.",
  },
  {
    question: "Do I need to store hyphens with a UUID?",
    answer:
      "No — hyphens are purely a display convention (grouping the 32 hex characters as 8-4-4-4-12) and carry no information. Many systems store UUIDs without hyphens to save 4 bytes per row, then reformat for display. Either form is valid as long as your application is consistent about which one it expects.",
  },
];

/** Real, actually-generated sample values for the worked example (D-09). */
export const sampleV4 = "335747ec-83ab-4c42-9155-2577a6ace749";
export const sampleV7 = "019f8fbb-af4a-71f7-aaea-c5e9b880982d";

/** One-line "when to use each" note for the worked example (D-09). */
export const whenToUseEachNote =
  "Use v4 when you want maximum unpredictability with no derivable metadata; use v7 when you want IDs that sort roughly by creation time and play nicely with database index locality.";
