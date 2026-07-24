import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SubnetTool } from "./SubnetTool";

const DEFAULT_NETWORK = "192.168.1.0";

const IPV4_FIELD_KEYS = [
  "network",
  "broadcast",
  "first-host",
  "last-host",
  "host-count",
  "mask",
  "wildcard",
  "binary",
];

/** Resets the URL to a bare path (no ?cidr= override) before each test so
 * SubnetTool always mounts against the D-02 default unless a test opts in
 * to a specific ?cidr= value first. */
function setUrl(search = "") {
  window.history.replaceState(null, "", `/tools/subnet${search}`);
}

describe("SubnetTool", () => {
  beforeEach(() => {
    setUrl();
  });

  afterEach(() => {
    cleanup();
  });

  it("computes and renders the D-02 default on mount with zero required input (SUBNET-02)", () => {
    render(<SubnetTool />);
    const networkValue = screen.getByTestId("subnet-field-network-value");
    expect(networkValue.textContent).toBe(DEFAULT_NETWORK);
  });

  it("shows the inline validation message and keeps the last valid grid visible on invalid typed input (SUBNET-03)", () => {
    render(<SubnetTool />);
    const input = screen.getByTestId("subnet-cidr-input") as HTMLInputElement;
    const lastValidNetwork = screen.getByTestId(
      "subnet-field-network-value"
    ).textContent;

    fireEvent.change(input, { target: { value: "not-a-cidr" } });

    expect(screen.getByTestId("subnet-validation-note")).toBeTruthy();
    expect(screen.getByTestId("subnet-field-network-value").textContent).toBe(
      lastValidNetwork
    );
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("exposes an independent copy button and status region for every IPv4 field (SUBNET-06)", () => {
    render(<SubnetTool />);
    for (const key of IPV4_FIELD_KEYS) {
      expect(screen.getByTestId(`subnet-field-${key}`)).toBeTruthy();
      expect(screen.getByTestId(`subnet-field-${key}-value`)).toBeTruthy();
      expect(screen.getByTestId(`subnet-copy-${key}`)).toBeTruthy();
      expect(screen.getByTestId(`subnet-copy-${key}-status`)).toBeTruthy();
    }
  });

  it("calls window.history.replaceState with an encoded ?cidr= URL on a valid edit (SUBNET-07 write)", () => {
    render(<SubnetTool />);
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");
    const input = screen.getByTestId("subnet-cidr-input") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "10.20.0.0/20" } });

    expect(replaceStateSpy).toHaveBeenCalled();
    const lastCall = replaceStateSpy.mock.calls.at(-1);
    expect(String(lastCall?.[2])).toContain("cidr=10.20.0.0%2F20");

    replaceStateSpy.mockRestore();
  });

  it("reads a valid ?cidr= URL param on mount and computes from it (SUBNET-07 read)", () => {
    setUrl("?cidr=10.20.0.0%2F20");
    render(<SubnetTool />);
    expect(screen.getByTestId("subnet-field-network-value").textContent).toBe(
      "10.20.0.0"
    );
  });

  it("falls back to the D-02 default and shows the shared-link-invalid note for a malformed ?cidr= URL param (SUBNET-07 malformed edge)", () => {
    setUrl("?cidr=not-a-cidr");
    render(<SubnetTool />);
    expect(screen.getByTestId("subnet-field-network-value").textContent).toBe(
      DEFAULT_NETWORK
    );
    expect(screen.getByTestId("subnet-validation-note")).toBeTruthy();
  });

  it("takes the first cidr occurrence when the URL param appears more than once (SUBNET-07 malformed edge)", () => {
    setUrl("?cidr=10.20.0.0%2F20&cidr=172.16.0.0%2F16");
    render(<SubnetTool />);
    expect(screen.getByTestId("subnet-field-network-value").textContent).toBe(
      "10.20.0.0"
    );
  });
});
