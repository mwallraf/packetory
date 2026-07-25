import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MacTool } from "./MacTool";

describe("MacTool", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the demo MAC normalized into all 4 formats on mount, no typing required (D-06, MAC-01, MAC-02)", () => {
    render(<MacTool />);

    expect(screen.getByTestId("mac-format-colon-value").textContent).toBe(
      "3C:22:FB:AA:BB:CC"
    );
    expect(screen.getByTestId("mac-format-dash-value").textContent).toBe(
      "3C-22-FB-AA-BB-CC"
    );
    expect(screen.getByTestId("mac-format-dot-value").textContent).toBe(
      "3C22.FBAA.BBCC"
    );
    expect(screen.getByTestId("mac-format-none-value").textContent).toBe(
      "3C22FBAABBCC"
    );
  });

  it("updates all 4 variants live when retyping in a different separator style (MAC-01, MAC-02)", () => {
    render(<MacTool />);

    const input = screen.getByTestId("mac-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "00-1A-2B-3C-4D-5E" } });

    expect(screen.getByTestId("mac-format-colon-value").textContent).toBe(
      "00:1A:2B:3C:4D:5E"
    );
    expect(screen.getByTestId("mac-format-dash-value").textContent).toBe(
      "00-1A-2B-3C-4D-5E"
    );
    expect(screen.getByTestId("mac-format-dot-value").textContent).toBe(
      "001A.2B3C.4D5E"
    );
    expect(screen.getByTestId("mac-format-none-value").textContent).toBe(
      "001A2B3C4D5E"
    );
  });

  it("shows the D-07 neutral incomplete-input note and keeps the last valid result visible (dimmed, not blanked)", () => {
    render(<MacTool />);

    const input = screen.getByTestId("mac-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "00:1A" } });

    expect(screen.getByTestId("mac-state-incomplete").textContent).toContain(
      "Keep typing — enter all 12 hex digits (e.g. 00:1A:2B:3C:4D:5E)."
    );
    // The last valid result (the demo MAC) stays fully rendered underneath —
    // never blanked (D-07).
    expect(screen.getByTestId("mac-format-colon-value").textContent).toBe(
      "3C:22:FB:AA:BB:CC"
    );
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("never auto-reformats the live input field as the user types (prohibition MAC-01)", () => {
    render(<MacTool />);

    const input = screen.getByTestId("mac-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "001a2b3c4d5e" } });

    // The raw controlled value is echoed back byte-for-byte — no inserted
    // separators, no case change, no cursor-hijacking reformat.
    expect(input.value).toBe("001a2b3c4d5e");
  });

  it("a per-format copy button reaches the 'Copied!' state with an accessible announcement (MAC-09)", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(<MacTool />);

    const copyButton = screen.getByTestId("mac-format-colon-copy");
    fireEvent.click(copyButton);

    await screen.findByText("Copied!");
    expect(copyButton.getAttribute("aria-label")).toBe("Copied!");
    expect(
      screen.getByTestId("mac-format-colon-status").textContent
    ).toBe("Copied!");
  });

  it("the Copy all button copies a combined block of all 4 formats (MAC-09)", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<MacTool />);

    fireEvent.click(screen.getByTestId("mac-copy-all"));

    await screen.findAllByText("Copied!");
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("3C:22:FB:AA:BB:CC")
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("3C22FBAABBCC")
    );
  });

  it("renders the OUI prefix field for the demo MAC (MAC-04)", () => {
    render(<MacTool />);

    expect(screen.getByTestId("mac-oui-value").textContent).toBe("3C22FB");
  });

  it("renders the U/L and I/G badges with their explanation text for the universally-administered, unicast demo MAC (MAC-05, MAC-06, no randomization badge)", () => {
    render(<MacTool />);

    const ulBadge = screen.getByTestId("mac-badge-ul");
    expect(ulBadge.textContent).toContain("Universally Administered");
    expect(ulBadge.textContent).toContain(
      "Assigned by the IEEE to a specific vendor."
    );

    const igBadge = screen.getByTestId("mac-badge-ig");
    expect(igBadge.textContent).toContain("Unicast");
    expect(igBadge.textContent).toContain("Addressed to a single device.");

    expect(screen.queryByTestId("mac-badge-randomization")).toBeNull();
  });

  it("shows the exact D-09 randomization-hedge badge for a locally-administered input (MAC-07)", () => {
    render(<MacTool />);

    const input = screen.getByTestId("mac-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "02:00:00:00:00:00" } });

    expect(screen.getByTestId("mac-badge-ul").textContent).toContain(
      "Locally Administered"
    );

    const randomizationBadge = screen.getByTestId("mac-badge-randomization");
    expect(randomizationBadge.textContent).toContain(
      "Likely randomized (privacy MAC)."
    );
    expect(randomizationBadge.textContent).toContain(
      "This address has the locally-administered bit set, a pattern used by iOS/Android/Windows MAC randomization — it may not reflect the device's real hardware vendor."
    );
  });

  it("does NOT show the randomization badge for the 01:00:5E multicast case (I/G=1 but U/L=0) — proves the flag tracks U/L, not I/G (D-10)", () => {
    render(<MacTool />);

    const input = screen.getByTestId("mac-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "01:00:5E:00:00:00" } });

    expect(screen.getByTestId("mac-badge-ig").textContent).toContain(
      "Multicast"
    );
    expect(screen.getByTestId("mac-badge-ul").textContent).toContain(
      "Universally Administered"
    );
    expect(screen.queryByTestId("mac-badge-randomization")).toBeNull();
  });

  it("uses the neutral/outline Badge variant for U/L, I/G, and randomization badges — never destructive/accent (Color section)", () => {
    render(<MacTool />);

    const input = screen.getByTestId("mac-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "02:00:00:00:00:00" } });

    expect(
      screen.getByTestId("mac-badge-ul-pill").getAttribute("data-variant")
    ).toBe("outline");
    expect(
      screen.getByTestId("mac-badge-ig-pill").getAttribute("data-variant")
    ).toBe("outline");
    expect(
      screen
        .getByTestId("mac-badge-randomization-pill")
        .getAttribute("data-variant")
    ).toBe("outline");
  });
});
