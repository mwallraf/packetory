export const MAX_INPUT_LENGTH = 200_000; // UTF-16 code units per source

export function exceedsInputLength(original: string, modified: string): boolean {
  return original.length > MAX_INPUT_LENGTH || modified.length > MAX_INPUT_LENGTH;
}
