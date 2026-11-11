/**
 * The one shared FAQPage JSON-LD builder (INFO-05). Every tool page's
 * structured data is produced here, from the SAME `faqItems` array that
 * renders the visible FAQ, so the two cannot drift.
 *
 * Input is static, author-controlled build-time data. `serializeJsonLd`
 * still escapes every `<` so a `</script>` inside FAQ text can never end
 * the surrounding script element (T-10-01, carries T-02-04).
 */

export type FaqItem = { question: string; answer: string };

export function buildFaqJsonLd(items: readonly FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
