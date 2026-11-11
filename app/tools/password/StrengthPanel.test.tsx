import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  DEFAULT_OPTIONS,
  GUESS_RATES,
  GUESS_RATE_LABELS,
  STRENGTH_LABELS,
  crackTimeLog10Seconds,
  formatBits,
  formatCrackTime,
  passphraseEntropyBits,
  passwordEntropyBits,
  resolveAlphabet,
  strengthLevel,
  type GuessRateKey,
  type ToolOptions,
} from "@/lib/password";
import {
  StrengthMeter,
  StrengthPanel,
  crackSentence,
  poolLine,
} from "./StrengthPanel";

afterEach(cleanup);

const PASSWORD: ToolOptions = { ...DEFAULT_OPTIONS, mode: "password" };
const PASSPHRASE: ToolOptions = { ...DEFAULT_OPTIONS, mode: "passphrase" };

function panel(
  options: ToolOptions,
  scenario: GuessRateKey = "fast",
  onScenarioChange: (next: GuessRateKey) => void = () => {},
) {
  return render(
    <StrengthPanel
      options={options}
      scenario={scenario}
      onScenarioChange={onScenarioChange}
    />,
  );
}

const text = (id: string) => screen.getByTestId(id).textContent;

describe("crackSentence (STR-03, D-08)", () => {
  it("prefixes About for a plain figure", () => {
    expect(crackSentence("350 thousand years")).toBe(
      "About 350 thousand years to crack, on average",
    );
  });

  it("drops About and capitalizes for less than and more than", () => {
    expect(crackSentence("less than a second")).toBe(
      "Less than a second to crack, on average",
    );
    expect(crackSentence("more than a trillion years")).toBe(
      "More than a trillion years to crack, on average",
    );
  });
});

describe("StrengthMeter thresholds (E4-meter)", () => {
  it.each([
    [39.99, "weak", 1],
    [40, "fair", 2],
    [74.99, "fair", 2],
    [75, "strong", 3],
    [99.99, "strong", 3],
    [100, "veryStrong", 4],
  ] as const)("at %s bits is %s with %s filled segments", (bits, level, n) => {
    render(<StrengthMeter bits={bits} />);
    const meter = screen.getByTestId("password-strength-meter");
    expect(meter.getAttribute("data-level")).toBe(level);
    expect(meter.getAttribute("aria-hidden")).toBe("true");
    const segments = [...meter.querySelectorAll("span")];
    expect(segments).toHaveLength(4);
    expect(segments.filter((s) => s.dataset.filled === "true")).toHaveLength(n);
    expect(strengthLevel(bits)).toBe(level);
  });
});

describe("default settings (STR-01, STR-02)", () => {
  it("shows the default password figures, equal to the library templates", () => {
    panel(PASSWORD);
    const bits = passwordEntropyBits(PASSWORD);
    expect(text("password-strength-label")).toBe("Very strong · 128 bits");
    expect(text("password-strength-label")).toBe(
      `${STRENGTH_LABELS[strengthLevel(bits)]} · ${formatBits(bits)}`,
    );
    expect(text("password-strength-pool")).toBe("85 chars · 128 bits");
    expect(text("password-strength-pool")).toBe(
      `${resolveAlphabet(PASSWORD).poolSize} chars · ${formatBits(bits)}`,
    );
    expect(text("password-crack-time")).toBe(
      "More than a trillion years to crack, on average",
    );
  });

  it("shows the default passphrase figures", () => {
    panel(PASSPHRASE);
    expect(text("password-strength-label")).toBe("Strong · 77 bits");
    expect(text("password-strength-pool")).toBe("7,776 words × 6 · 77 bits");
    expect(text("password-crack-time")).toBe(
      "About 350 thousand years to crack, on average",
    );
  });

  it("append a number adds one digit and floors to 80 bits", () => {
    const options = { ...PASSPHRASE, appendNumber: true };
    panel(options);
    expect(text("password-strength-pool")).toBe(
      "7,776 words × 6 + 1 digit · 80 bits",
    );
    expect(passphraseEntropyBits(options)).toBeGreaterThan(80.8);
  });
});

describe("edge cases (STR-01, STR-02, STR-03)", () => {
  it("a digits-only password has a 10 char pool", () => {
    const options = {
      ...PASSWORD,
      uppercase: false,
      lowercase: false,
      symbols: false,
    };
    panel(options);
    expect(text("password-strength-pool")).toBe(
      `10 chars · ${formatBits(passwordEntropyBits(options))}`,
    );
  });

  it("a passphrase without Append a number has no digit term", () => {
    panel(PASSPHRASE);
    expect(text("password-strength-pool")).not.toContain("+ 1 digit");
  });

  it("Avoid look-alikes shows the library pool size, not an output count", () => {
    const options = { ...PASSWORD, avoidLookalikes: true };
    panel(options);
    const size = resolveAlphabet(options).poolSize;
    expect(size).toBe(79);
    expect(text("password-strength-pool")).toBe(
      `${size} chars · ${formatBits(passwordEntropyBits(options))}`,
    );
  });

  it("capitalize and separator never change the passphrase figures", () => {
    const { unmount } = panel(PASSPHRASE);
    const ids = [
      "password-strength-label",
      "password-strength-pool",
      "password-crack-time",
      "password-crack-assumption",
    ];
    const base = ids.map(text);
    unmount();
    panel({ ...PASSPHRASE, capitalize: true, separator: "." });
    expect(ids.map(text)).toEqual(base);
  });

  it("poolLine is a function of options and bits only", () => {
    expect(poolLine(PASSPHRASE, 77.55)).toBe("7,776 words × 6 · 77 bits");
  });

  it("the level comes from raw bits and the figure is floored at 99.99", () => {
    // 99.99 bits cannot come from the settings, so use the helpers the panel
    // is built from: label template with the raw level and floored figure.
    const bits = 99.99;
    expect(`${STRENGTH_LABELS[strengthLevel(bits)]} · ${formatBits(bits)}`).toBe(
      "Strong · 99 bits",
    );
  });
});

describe("attack scenario (STR-04, D-09)", () => {
  it.each(["fast", "slow"] as const)(
    "the assumption equals GUESS_RATE_LABELS for %s and the sentence follows the rate",
    (scenario) => {
      panel(PASSPHRASE, scenario);
      expect(text("password-crack-assumption")).toBe(GUESS_RATE_LABELS[scenario]);
      const bits = passphraseEntropyBits(PASSPHRASE);
      expect(text("password-crack-time")).toBe(
        crackSentence(
          formatCrackTime(crackTimeLog10Seconds(bits, GUESS_RATES[scenario])),
        ),
      );
    },
  );

  it("the slow default passphrase reads 350 billion years", () => {
    panel(PASSPHRASE, "slow");
    expect(text("password-crack-time")).toBe(
      "About 350 billion years to crack, on average",
    );
  });

  it("clicking Slow hash reports slow, and an active click or empty value reports nothing", () => {
    const onChange = vi.fn();
    panel(PASSPHRASE, "fast", onChange);
    expect(
      screen.getByTestId("password-scenario-fast").getAttribute("aria-checked"),
    ).toBe("true");
    fireEvent.click(screen.getByTestId("password-scenario-fast"));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("password-scenario-slow"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("slow");
  });

  it("clicking the active Slow item (Radix deselect) never calls back", () => {
    const onChange = vi.fn();
    panel(PASSPHRASE, "slow", onChange);
    fireEvent.click(screen.getByTestId("password-scenario-slow"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("announcements (D-06)", () => {
  it("is not a live region and has no status or alert role", () => {
    panel(PASSWORD);
    const section = screen.getByTestId("password-strength");
    expect(section.hasAttribute("aria-live")).toBe(false);
    expect(section.querySelector("[aria-live]")).toBeNull();
    expect(section.querySelector('[role="status"], [role="alert"]')).toBeNull();
    expect(section.getAttribute("role")).toBeNull();
  });

  it("has an h2 named Strength", () => {
    panel(PASSWORD);
    expect(
      screen.getByRole("heading", { level: 2, name: "Strength" }),
    ).toBeTruthy();
  });
});
