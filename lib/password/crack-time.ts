import { SECONDS_PER_YEAR } from "./constants";

/**
 * Average-case crack time in log space (D-17), so a 128-character password
 * never overflows a double. Pure: the FAQ and the UI share it.
 */

/** Average case: half the keyspace, at `guessesPerSecond`. */
export function crackTimeLog10Seconds(
  bits: number,
  guessesPerSecond: number,
): number {
  return (bits - 1) * Math.log10(2) - Math.log10(guessesPerSecond);
}

/**
 * Rounds to 12 significant digits so exact bucket boundaries survive float
 * error (10 ** Math.log10(86400) is 86399.99999999997).
 */
function roundSig12(x: number): number {
  return Number(x.toPrecision(12));
}

function unit(count: number, singular: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${singular}s`;
}

const CAP = "more than a trillion years";
const CAP_LOG10_SECONDS = 13 + Math.log10(SECONDS_PER_YEAR);

export function formatCrackTime(log10Seconds: number): string {
  if (Number.isNaN(log10Seconds) || log10Seconds < 0) {
    return "less than a second";
  }
  if (log10Seconds >= CAP_LOG10_SECONDS) {
    return CAP;
  }
  const s = roundSig12(10 ** log10Seconds);
  if (s < 60) return unit(Math.floor(s), "second");
  if (s < 3600) return unit(Math.floor(s / 60), "minute");
  if (s < 86400) return unit(Math.floor(s / 3600), "hour");
  if (s < SECONDS_PER_YEAR) return unit(Math.floor(s / 86400), "day");
  const y = roundSig12(s / SECONDS_PER_YEAR);
  if (y >= 1e12) return CAP;
  if (y >= 1e9) return `${Math.floor(y / 1e9)} billion years`;
  if (y >= 1e6) return `${Math.floor(y / 1e6)} million years`;
  if (y >= 1e3) return `${Math.floor(y / 1e3)} thousand years`;
  return unit(Math.floor(y), "year");
}
