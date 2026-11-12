import { EFF_HYPHENATED_WORDS } from "../../../lib/password";

/**
 * A run of adjacent EFF Large words that never occurs in application code, so a
 * JS chunk body containing it is the word list itself.
 */
export const EFF_MARKER = "abacus abdomen abdominal";

const placeholder = (i: number) => `\u0000${i}\u0000`;

/**
 * Splits a passphrase on its separator while protecting the four EFF words that
 * contain a hyphen (RESEARCH Pitfall 5): each is swapped for a placeholder, the
 * string is split, and the placeholders are restored.
 */
export function splitPassphrase(value: string, separator: string): string[] {
  let protectedValue = value;
  EFF_HYPHENATED_WORDS.forEach((w, i) => {
    protectedValue = protectedValue.split(w).join(placeholder(i));
  });
  return protectedValue
    .split(separator)
    .map((token) =>
      EFF_HYPHENATED_WORDS.reduce(
        (acc, w, i) => acc.split(placeholder(i)).join(w),
        token,
      ),
    );
}
