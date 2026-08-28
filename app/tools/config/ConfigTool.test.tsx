import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigTool } from "./ConfigTool";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ConfigTool", () => {
  it("starts empty with copy actions disabled", () => {
    render(<ConfigTool />);

    expect(screen.getByTestId("config-input")).toHaveProperty("value", "");
    expect(screen.getByTestId("config-copy-rich")).toHaveProperty(
      "disabled",
      true
    );
    expect(screen.getByTestId("config-copy-plain")).toHaveProperty(
      "disabled",
      true
    );
  });

  it("updates the highlighted preview live", () => {
    render(<ConfigTool />);
    fireEvent.change(screen.getByTestId("config-input"), {
      target: { value: "interface GigabitEthernet0/1\n ip address 192.0.2.1 255.255.255.0" },
    });

    const preview = screen.getByTestId("config-preview");
    expect(preview.textContent).toContain("GigabitEthernet0/1");
    expect(preview.querySelector('[data-token="interface"]')?.textContent).toBe(
      "GigabitEthernet0/1"
    );
    expect(preview.querySelectorAll('[data-token="address"]')).toHaveLength(2);
  });

  it("copies the original configuration as plain text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ConfigTool />);
    const config = "! comment\nrouter ospf 10";
    fireEvent.change(screen.getByTestId("config-input"), {
      target: { value: config },
    });

    fireEvent.click(screen.getByTestId("config-copy-plain"));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(config));
    expect(screen.getByTestId("config-copy-plain").textContent).toContain(
      "Copied!"
    );
  });
});
