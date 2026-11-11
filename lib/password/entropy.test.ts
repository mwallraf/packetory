import { describe, expect, it } from "vitest";
import { crackTimeLog10Seconds, formatCrackTime } from "./crack-time";
import { DEFAULT_OPTIONS, GUESS_RATES } from "./constants";
import { formatBits, passwordEntropyBits, strengthLevel } from "./entropy";

describe("strength from settings (SC-4 tracer)", () => {
  it("default password: 128.0598 bits, '128 bits', veryStrong, and more than a trillion years on the fast hash", () => {
    const bits = passwordEntropyBits(DEFAULT_OPTIONS);
    expect(bits).toBeCloseTo(128.0598, 4);
    expect(formatBits(bits)).toBe("128 bits");
    expect(strengthLevel(bits)).toBe("veryStrong");
    expect(formatCrackTime(crackTimeLog10Seconds(bits, GUESS_RATES.fast))).toBe(
      "more than a trillion years",
    );
  });
});
