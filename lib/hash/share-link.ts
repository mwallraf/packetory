/**
 * Share-link builder (TEXT-04, D-20/D-21). Pure: the only place a shareable
 * URL containing the typed text is built, and it is never called
 * automatically - only the explicit "Copy link" button copies its result.
 */

/** Inclusive cap on the encodeURIComponent output of the text (not the URL). */
export const SHARE_TEXT_MAX_ENCODED = 2000;

export type ShareLink =
  | { ok: true; url: string }
  | { ok: false; reason: "empty" | "too-long" | "unencodable" };

/**
 * Builds `${origin}/tools/hash?text=<encoded text>`. Total: never throws.
 * Empty text is not linkable (an empty `?text=` loads the sample, so the link
 * would not reproduce the state); a lone surrogate cannot be encoded.
 */
export function buildShareLink(origin: string, text: string): ShareLink {
  if (text === "") return { ok: false, reason: "empty" };
  let encoded: string;
  try {
    encoded = encodeURIComponent(text);
  } catch {
    return { ok: false, reason: "unencodable" };
  }
  if (encoded.length > SHARE_TEXT_MAX_ENCODED) {
    return { ok: false, reason: "too-long" };
  }
  return { ok: true, url: origin + "/tools/hash?text=" + encoded };
}
