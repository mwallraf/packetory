import {
  APPEND_NUMBER_BITS,
  BITS_PER_WORD,
  DEFAULT_POOL_SIZE,
  DEFAULT_SYMBOLS_SIZE,
  DIGITS_SIZE,
  EFF_HYPHENATED_WORD_COUNT,
  EFF_WORD_COUNT,
  LENGTH_DEFAULT,
  LOWERCASE_SIZE,
  UPPERCASE_SIZE,
  WORDS_DEFAULT,
  formatBits,
} from "@/lib/password";
import { EFF_LICENCE_URL, EFF_WORDLIST_URL } from "./eff-links";
import { aboutTime, defaultFigures as f } from "./faq-data";

const LABEL_CLASS = "text-[14px] leading-[1.4] font-semibold text-foreground";
const PROSE_CLASS =
  "text-[16px] leading-[1.5] font-normal text-muted-foreground";
const LINK_CLASS =
  "text-foreground underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-sm";

/**
 * Server-rendered worked example for the Password page (PREG-02, PHR-04, D-13).
 * It walks through the math with figures taken from the `lib/password`
 * constants and functions, and shows the passphrase as a structural placeholder.
 * No generator is called and no sample password or passphrase string appears, so
 * the production HTML holds nothing anyone could copy or reuse (T-14-05).
 */
export function PasswordExample() {
  const shape = Array(WORDS_DEFAULT).fill("word").join("-");
  const wordCount = EFF_WORD_COUNT.toLocaleString("en-US");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className={LABEL_CLASS}>
          Default password: {LENGTH_DEFAULT} characters
        </p>
        <p className={PROSE_CLASS}>
          {`Every character comes from a pool of ${DEFAULT_POOL_SIZE}: ${UPPERCASE_SIZE} uppercase letters, ${LOWERCASE_SIZE} lowercase letters, ${DIGITS_SIZE} digits and ${DEFAULT_SYMBOLS_SIZE} symbols. Requiring at least one character from each set trims the count slightly, which leaves about ${formatBits(f.passwordBits)}: ${f.passwordLabel}. Average time to crack: ${f.passwordFast} with a fast hash, and ${f.passwordSlow} with a slow hash.`}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <p className={LABEL_CLASS}>Default passphrase: {WORDS_DEFAULT} words</p>
        <pre
          data-testid="password-worked-example-shape"
          className="max-w-full whitespace-pre-wrap break-words rounded-md border border-border bg-secondary p-4 font-mono text-[14px] leading-[1.4] text-foreground"
        >
          {shape}
        </pre>
        <p className={PROSE_CLASS}>
          {`Each word is one of ${wordCount}, worth about ${BITS_PER_WORD.toFixed(1)} bits, so ${WORDS_DEFAULT} words give about ${formatBits(f.passphraseBits)}: ${f.passphraseLabel}. Average time to crack: ${aboutTime(f.passphraseFast)} with a fast hash, and ${aboutTime(f.passphraseSlow)} with a slow hash. Appending a random digit adds about ${APPEND_NUMBER_BITS.toFixed(1)} bits, for ${formatBits(f.passphraseWithNumberBits)}.`}
        </p>
      </div>
      <div className="flex flex-col gap-2" data-testid="password-attribution">
        <p className={LABEL_CLASS}>Word list</p>
        <p className={PROSE_CLASS}>
          Passphrases use the{" "}
          <a href={EFF_WORDLIST_URL} rel="noreferrer" className={LINK_CLASS}>
            EFF Large Wordlist for Passphrases
          </a>{" "}
          (2016) by the Electronic Frontier Foundation (EFF), licensed under{" "}
          <a href={EFF_LICENCE_URL} rel="noreferrer" className={LINK_CLASS}>
            Creative Commons Attribution (CC BY)
          </a>
          . It is used unmodified: all {wordCount} words in their original
          order, including its {EFF_HYPHENATED_WORD_COUNT} hyphenated words.
        </p>
      </div>
    </div>
  );
}
