import type { FaqItem } from "@/lib/seo/jsonld";

export const faqItems: readonly FaqItem[] = [
  {
    question: "What can I compare with Text Diff?",
    answer: "Paste two snippets of plain text, such as code, configuration, or logs. Compare shows added and removed lines and highlights changes within related lines.",
  },
  {
    question: "Where does the comparison run?",
    answer: "Text Diff compares the snippets in your browser. You can clear both snippets and their results at any time with Clear all.",
  },
  {
    question: "Does Text Diff detect whitespace changes?",
    answer: "Changes to spaces, tabs, blank lines, or a final newline can appear in the results. Windows and Unix line endings compare the same.",
  },
  {
    question: "How do I compare again after editing?",
    answer: "Edit either snippet and select Compare again. You can also press Ctrl+Enter or Command+Enter with focus in the workspace.",
  },
];
