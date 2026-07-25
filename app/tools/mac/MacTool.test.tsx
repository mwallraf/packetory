import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MacTool } from "./MacTool";
import { __resetVendorCacheForTests } from "@/lib/mac/vendor";

/** Advances vitest's fake timers AND flushes the resulting microtask/state-
 * update chain inside `act()` — `vi.advanceTimersByTimeAsync` alone drives
 * timers/microtasks but React state updates triggered by them still need to
 * be wrapped for React Testing Library not to warn. */
async function advanceTimersAndFlush(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const FOUND_APPLE = { status: "ok", found: true, company: "Apple, Inc." };
const NOT_FOUND = { status: "ok", found: false, company: null };
const UNAVAILABLE = { status: "unavailable" };

/** Waits until the vendor sub-field has settled out of its in-flight
 * "Looking up vendor…" state — the mount-on-load lookup (D-06, immediate,
 * no debounce) is otherwise still async and would leave a dangling
 * un-awaited state update at the end of a synchronous test (MAC-08: the
 * rest of the panel never waits on this, but tests still need to drain it
 * cleanly to avoid act() warnings). */
async function waitForVendorSettled() {
  await waitFor(() => {
    expect(screen.getByTestId("mac-vendor-value").textContent).not.toContain(
      "Looking up vendor"
    );
  });
}

describe("MacTool", () => {
  beforeEach(() => {
    __resetVendorCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it("renders the demo MAC normalized into all 4 formats on mount, no typing required (D-06, MAC-01, MAC-02)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, FOUND_APPLE)));
    render(<MacTool />);
    await waitForVendorSettled();

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

  it("updates all 4 variants live when retyping in a different separator style (MAC-01, MAC-02)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, FOUND_APPLE)));
    render(<MacTool />);
    await waitForVendorSettled();

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

  it("shows the D-07 neutral incomplete-input note and keeps the last valid result visible (dimmed, not blanked)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, FOUND_APPLE)));
    render(<MacTool />);
    await waitForVendorSettled();

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

  it("never auto-reformats the live input field as the user types (prohibition MAC-01)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, FOUND_APPLE)));
    render(<MacTool />);
    await waitForVendorSettled();

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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, FOUND_APPLE)));

    render(<MacTool />);
    await waitForVendorSettled();

    const copyButton = screen.getByTestId("mac-format-colon-copy");
    fireEvent.click(copyButton);

    await screen.findByText("Copied!");
    expect(copyButton.getAttribute("aria-label")).toBe("Copied!");
    expect(
      screen.getByTestId("mac-format-colon-status").textContent
    ).toBe("Copied!");
  });

  it("the Copy all button copies a combined block of all 4 formats plus OUI/vendor/U-L/I-G/randomization (MAC-09)", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, FOUND_APPLE)));

    render(<MacTool />);
    await waitForVendorSettled();

    fireEvent.click(screen.getByTestId("mac-copy-all"));

    await screen.findAllByText("Copied!");
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("3C:22:FB:AA:BB:CC")
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("3C22FBAABBCC")
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("OUI: 3C22FB")
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("Vendor: Apple, Inc.")
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("U/L: Universally Administered")
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("I/G: Unicast")
    );
  });

  it("renders the OUI prefix field for the demo MAC (MAC-04)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, FOUND_APPLE)));
    render(<MacTool />);
    await waitForVendorSettled();

    expect(screen.getByTestId("mac-oui-value").textContent).toBe("3C22FB");
  });

  it("renders the U/L and I/G badges with their explanation text for the universally-administered, unicast demo MAC (MAC-05, MAC-06, no randomization badge)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, FOUND_APPLE)));
    render(<MacTool />);
    await waitForVendorSettled();

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

  it("shows the exact D-09 randomization-hedge badge for a locally-administered input (MAC-07)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, FOUND_APPLE)));
    render(<MacTool />);
    await waitForVendorSettled();

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

  it("does NOT show the randomization badge for the 01:00:5E multicast case (I/G=1 but U/L=0) — proves the flag tracks U/L, not I/G (D-10)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, FOUND_APPLE)));
    render(<MacTool />);
    await waitForVendorSettled();

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

  it("uses the neutral/outline Badge variant for U/L, I/G, and randomization badges — never destructive/accent (Color section)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, FOUND_APPLE)));
    render(<MacTool />);
    await waitForVendorSettled();

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

  it("resolves the demo MAC's vendor to the company name once the mount-on-load lookup completes (MAC-03, D-06)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, FOUND_APPLE)));
    render(<MacTool />);
    await waitForVendorSettled();

    expect(screen.getByTestId("mac-vendor-value").textContent).toContain(
      "Apple, Inc."
    );
  });

  it("shows 'Not found in OUI registry.' for a genuine registry miss — distinct from lookup unavailable (05-RESEARCH.md Pitfall 3 / Open Question 1)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, NOT_FOUND)));
    render(<MacTool />);
    await waitForVendorSettled();

    expect(screen.getByTestId("mac-vendor-value").textContent).toBe(
      "Not found in OUI registry."
    );
  });

  it("shows 'Vendor: lookup unavailable.' when the vendor fetch fails, while formats/OUI/classification badges still render normally (MAC-08, D-11)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, UNAVAILABLE)));
    render(<MacTool />);
    await waitForVendorSettled();

    expect(screen.getByTestId("mac-vendor-value").textContent).toBe(
      "Vendor: lookup unavailable."
    );
    // The rest of the panel is fully rendered and unaffected (MAC-08).
    expect(screen.getByTestId("mac-format-colon-value").textContent).toBe(
      "3C:22:FB:AA:BB:CC"
    );
    expect(screen.getByTestId("mac-oui-value").textContent).toBe("3C22FB");
    expect(screen.getByTestId("mac-badge-ul").textContent).toContain(
      "Universally Administered"
    );
  });

  it("shows 'Vendor: not applicable (randomized address).' for a locally-administered MAC and makes NO vendor fetch call for it (D-12)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, FOUND_APPLE));
    vi.stubGlobal("fetch", fetchMock);

    render(<MacTool />);
    await waitForVendorSettled();
    fetchMock.mockClear(); // discard the demo-mount call

    const input = screen.getByTestId("mac-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "02:00:00:00:00:00" } });

    expect(screen.getByTestId("mac-vendor-value").textContent).toBe(
      "Vendor: not applicable (randomized address)."
    );
    // D-12: no fetch at all is attempted for a randomized address, even
    // after waiting past the debounce window.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the in-flight 'Looking up vendor…' state while a debounced lookup is pending, without affecting formats/OUI/classification badges (MAC-08 isolation)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, FOUND_APPLE)) // demo mount lookup
      .mockImplementationOnce(() => new Promise<Response>(() => {})); // never resolves
    vi.stubGlobal("fetch", fetchMock);

    render(<MacTool />);
    await waitForVendorSettled();

    const input = screen.getByTestId("mac-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "00:1A:2B:3C:4D:5E" } });

    await waitFor(
      () => {
        expect(screen.getByTestId("mac-vendor-value").textContent).toContain(
          "Looking up vendor…"
        );
      },
      { timeout: 2000 }
    );

    // Formats/OUI/classification badges still render fully, unaffected.
    expect(screen.getByTestId("mac-format-colon-value").textContent).toBe(
      "00:1A:2B:3C:4D:5E"
    );
    expect(screen.getByTestId("mac-oui-value").textContent).toBe("001A2B");
    expect(screen.getByTestId("mac-badge-ul")).toBeTruthy();
  });

  it("does not re-fetch for an OUI already looked up this session, even after editing the host portion (D-03 session cache)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, FOUND_APPLE));
    vi.stubGlobal("fetch", fetchMock);

    render(<MacTool />);
    await waitForVendorSettled();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const input = screen.getByTestId("mac-input") as HTMLInputElement;
    // Same OUI (3C22FB) as the demo MAC, different host bytes.
    fireEvent.change(input, { target: { value: "3C:22:FB:00:00:00" } });

    await waitFor(
      () => {
        expect(screen.getByTestId("mac-vendor-value").textContent).toContain(
          "Apple, Inc."
        );
      },
      { timeout: 2000 }
    );
    // The debounce window has to elapse for the new lookup to even be
    // attempted — give it time, then confirm the cache served the answer
    // with no second network call.
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends only the ouiHex (6 hex chars) in the vendor request, never the full MAC (MAC-10 by construction)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, FOUND_APPLE));
    vi.stubGlobal("fetch", fetchMock);

    render(<MacTool />);
    await waitForVendorSettled();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/mac-vendor?oui=3C22FB",
      expect.anything()
    );
    for (const call of fetchMock.mock.calls) {
      expect(String(call[0])).not.toContain("AABBCC");
    }
  });

  it("cancels the in-flight/scheduled vendor lookup when the input becomes incomplete mid-edit, and does not leave the panel stuck pending (CR-01 audit-ALL-paths)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, FOUND_APPLE));
    vi.stubGlobal("fetch", fetchMock);

    render(<MacTool />);
    await waitForVendorSettled();
    fetchMock.mockClear();

    const input = screen.getByTestId("mac-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "00:1A" } }); // incomplete

    expect(screen.getByTestId("mac-state-incomplete")).toBeTruthy();

    // No new fetch is ever dispatched for an incomplete edit, even after
    // the debounce window would have elapsed.
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a superseding valid edit's slower earlier vendor response can never overwrite a newer result (CR-01 race safety)", async () => {
    vi.useFakeTimers();
    try {
      let resolveFirst: (value: Response) => void = () => {};
      const firstPending = new Promise<Response>((resolve) => {
        resolveFirst = resolve;
      });

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, FOUND_APPLE)) // demo mount lookup
        .mockImplementationOnce(() => firstPending) // first typed OUI — deliberately slow
        .mockResolvedValueOnce(
          jsonResponse(200, {
            status: "ok",
            found: true,
            company: "Second Vendor",
          })
        ); // second, superseding typed OUI — resolves fast
      vi.stubGlobal("fetch", fetchMock);

      render(<MacTool />);
      await advanceTimersAndFlush(0); // flush the mount's immediate lookup

      const input = screen.getByTestId("mac-input") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "00:1A:2B:3C:4D:5E" } });
      await advanceTimersAndFlush(600); // elapse debounce -> dispatch the slow fetch

      fireEvent.change(input, { target: { value: "00:1A:2C:3C:4D:5E" } });
      await advanceTimersAndFlush(600); // elapse debounce -> dispatch the fast fetch
      // Extra microtask flush(es) for the fetch/json() resolution chain to
      // land in state.
      await advanceTimersAndFlush(0);
      await advanceTimersAndFlush(0);

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(screen.getByTestId("mac-vendor-value").textContent).toContain(
        "Second Vendor"
      );

      // The slow first request finally resolves — it must be discarded, not
      // overwrite the already-settled newer result.
      resolveFirst(
        jsonResponse(200, {
          status: "ok",
          found: true,
          company: "Stale Vendor",
        })
      );
      await advanceTimersAndFlush(0);

      expect(screen.getByTestId("mac-vendor-value").textContent).toContain(
        "Second Vendor"
      );
      expect(screen.getByTestId("mac-vendor-value").textContent).not.toContain(
        "Stale Vendor"
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
