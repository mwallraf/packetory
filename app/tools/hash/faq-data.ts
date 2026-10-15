/**
 * Single source of truth for the Hash Generator tool page's FAQ content
 * (INTG-02, D-26). Both the visible FAQ prose and the FAQPage JSON-LD in
 * `page.tsx` map over `faqItems`, so structured data and on-screen content
 * cannot drift - mirrors `app/tools/mac/faq-data.ts`'s established pattern.
 *
 * Privacy copy note (D-27): the "Where does the hashing happen?" answer is
 * limited to the two approved statements ("Hashing runs in your browser" and
 * "the link contains your text") and is pinned by an exact-equality test in
 * `faq-data.test.ts`. Any further privacy or legal wording needs human
 * approval before it may be added here or anywhere else on the page.
 */

export type FaqItem = {
  question: string;
  answer: string;
};

export const faqItems: FaqItem[] = [
  {
    question: "What's the difference between SHA3-256 and Keccak-256?",
    answer:
      "SHA3-256 is the FIPS 202 standard. Keccak-256 (used by Ethereum) is the original Keccak submission with different padding, so the same input gives different digests. This tool computes FIPS 202 SHA3. For the empty input, SHA3-256 starts with a7ffc6f8 while Keccak-256 starts with c5d24601.",
  },
  {
    question: "Why doesn't my hash match echo 'text' | sha256sum?",
    answer:
      "echo appends a newline, so echo 'text' | sha256sum hashes one extra byte. Use printf '%s' 'text' or echo -n 'text' to match this tool. Text that comes from Windows may use CRLF line endings; pasting it into this textarea turns CRLF into LF. The byte count shows exactly what is hashed.",
  },
  {
    question: "Are MD5 and SHA-1 safe for security?",
    answer:
      "No. MD5 and SHA-1 have practical collision attacks, so they are not safe for security. They are fine for non-adversarial checksums such as spotting accidental corruption, and CRC32 only detects accidental errors. For integrity checks use SHA-256 or stronger (SHA-512, SHA3). Never use any of these plain hashes to store passwords; use a password hashing function such as bcrypt, scrypt or Argon2.",
  },
  {
    question: "Does a matching hash prove the text or file is authentic?",
    answer:
      "No. A match proves the bytes equal the bytes the checksum was made from, not who published them. If an attacker controls both the download and the published checksum, they still match. Authenticity needs a signature, or a checksum obtained from a channel you trust.",
  },
  {
    question: "Where does the hashing happen?",
    answer:
      "Hashing runs in your browser. If you use Copy link, the link contains your text.",
  },
];
