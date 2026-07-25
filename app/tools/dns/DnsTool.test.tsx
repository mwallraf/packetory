import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DnsTool } from "./DnsTool";

/** Resets the URL to a bare path (no ?name=&type= override) before each test
 * so DnsTool always mounts against the D-10/D-11 default (cloudflare.com,
 * type A) unless a test opts in to a specific value first — mirrors
 * SubnetTool.test.tsx's `setUrl` precedent. */
function setUrl(search = "") {
  window.history.replaceState(null, "", `/tools/dns${search}`);
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const A_SUCCESS_BODY = {
  Status: 0,
  Question: [{ name: "cloudflare.com", type: 1 }],
  Answer: [{ name: "cloudflare.com", type: 1, TTL: 300, data: "104.16.132.229" }],
};

describe("DnsTool", () => {
  beforeEach(() => {
    setUrl();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it("renders the first-load skeleton before any result exists (D-08)", async () => {
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchMock);

    render(<DnsTool />);

    await waitFor(() => {
      expect(screen.getByTestId("dns-tool-skeleton")).toBeTruthy();
    });
  });

  it("renders NXDOMAIN as its own distinct state, never conflated with empty-NOERROR (DNS-08, D-05)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { Status: 3, Answer: undefined }));
    vi.stubGlobal("fetch", fetchMock);

    render(<DnsTool />);

    await waitFor(() => {
      expect(screen.getByTestId("dns-state-nxdomain")).toBeTruthy();
    });
    const card = screen.getByTestId("dns-state-nxdomain");
    expect(card.textContent).toContain("No such domain.");
    expect(card.textContent).toContain("cloudflare.com doesn't exist.");
    expect(screen.queryByTestId("dns-state-empty-noerror")).toBeNull();
  });

  it("renders empty-NOERROR as its own distinct state, never conflated with NXDOMAIN (DNS-08, D-05)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { Status: 0, Answer: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<DnsTool />);

    await waitFor(() => {
      expect(screen.getByTestId("dns-state-empty-noerror")).toBeTruthy();
    });
    const card = screen.getByTestId("dns-state-empty-noerror");
    expect(card.textContent).toContain("No A records.");
    expect(card.textContent).toContain(
      "cloudflare.com exists but has none of this type."
    );
    expect(screen.queryByTestId("dns-state-nxdomain")).toBeNull();
  });

  it("renders rate-limited (both resolvers 429) with its own Try-again button that re-runs the lookup (D-06)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, {}))
      .mockResolvedValueOnce(jsonResponse(429, {}));
    vi.stubGlobal("fetch", fetchMock);

    render(<DnsTool />);

    await waitFor(() => {
      expect(screen.getByTestId("dns-state-rate-limited")).toBeTruthy();
    });
    const card = screen.getByTestId("dns-state-rate-limited");
    expect(card.textContent).toContain("Too many lookups.");
    expect(card.textContent).toContain("Please wait a moment and try again.");

    const tryAgainButtons = screen.getAllByTestId("dns-try-again");
    expect(tryAgainButtons).toHaveLength(1);

    fetchMock.mockResolvedValueOnce(jsonResponse(200, A_SUCCESS_BODY));
    fireEvent.click(tryAgainButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId("dns-record-list")).toBeTruthy();
    });
  });

  it("renders resolver-unavailable (both resolvers fail) with its own Try-again button (D-06)", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network error"))
      .mockRejectedValueOnce(new TypeError("network error"));
    vi.stubGlobal("fetch", fetchMock);

    render(<DnsTool />);

    await waitFor(() => {
      expect(screen.getByTestId("dns-state-resolver-unavailable")).toBeTruthy();
    });
    const card = screen.getByTestId("dns-state-resolver-unavailable");
    expect(card.textContent).toContain("Resolvers unreachable.");
    expect(card.textContent).toContain(
      "DNS resolvers are unreachable right now"
    );

    const tryAgainButtons = screen.getAllByTestId("dns-try-again");
    expect(tryAgainButtons).toHaveLength(1);
  });

  it("shows invalid-input inline near the domain input and keeps the last valid result visible (D-04/D-07)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, A_SUCCESS_BODY));
    vi.stubGlobal("fetch", fetchMock);

    render(<DnsTool />);

    await waitFor(() => {
      expect(screen.getByTestId("dns-record-list")).toBeTruthy();
    });

    const input = screen.getByTestId("dns-domain-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "not a domain!!" } });

    expect(screen.getByTestId("dns-state-invalid")).toBeTruthy();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("dns-validation-note");
    // Last valid result stays visible — the whole result panel is untouched.
    expect(screen.getByTestId("dns-record-list")).toBeTruthy();
    expect(screen.getByTestId("dns-record-value").textContent).toBe(
      "104.16.132.229"
    );
  });

  it("keeps the last valid result visible at reduced opacity with a spinner while a new lookup is in flight (D-07)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, A_SUCCESS_BODY));
    vi.stubGlobal("fetch", fetchMock);

    render(<DnsTool />);

    await waitFor(() => {
      expect(screen.getByTestId("dns-record-list")).toBeTruthy();
    });

    // The Refresh-triggered lookup (an immediate-trigger path) never
    // resolves within this test, so the loading state is observable.
    fetchMock.mockImplementationOnce(() => new Promise(() => {}));
    fireEvent.click(screen.getByTestId("dns-refresh"));

    await waitFor(() => {
      expect(screen.getByTestId("dns-loading-spinner")).toBeTruthy();
    });
    expect(
      screen.getByTestId("dns-record-list").closest(".opacity-50")
    ).toBeTruthy();
    // The previous result is still rendered underneath, just dimmed.
    expect(screen.getByTestId("dns-record-value").textContent).toBe(
      "104.16.132.229"
    );
  });

  it("splits MX record values into labeled Priority/Exchange spans (DNS-06)", async () => {
    setUrl("?name=cloudflare.com&type=MX");
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        Status: 0,
        Answer: [
          {
            name: "cloudflare.com",
            type: 15,
            TTL: 300,
            data: "10 mxa.global.inbound.cf-emailsecurity.net.",
          },
        ],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<DnsTool />);

    await waitFor(() => {
      expect(screen.getByTestId("dns-mx-priority")).toBeTruthy();
    });
    expect(screen.getByTestId("dns-mx-priority").textContent).toContain("10");
    expect(screen.getByTestId("dns-mx-exchange").textContent).toContain(
      "mxa.global.inbound.cf-emailsecurity.net."
    );
  });
});
