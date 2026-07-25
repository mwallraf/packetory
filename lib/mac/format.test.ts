import { describe, expect, it } from "vitest";
import { formatMac } from "./format";

const BYTES = [0x3c, 0x22, 0xfb, 0x00, 0x00, 0x00];

describe("formatMac", () => {
  it("produces the colon variant (MAC-02, D-05)", () => {
    expect(formatMac(BYTES).colon).toBe("3C:22:FB:00:00:00");
  });

  it("produces the dash variant", () => {
    expect(formatMac(BYTES).dash).toBe("3C-22-FB-00-00-00");
  });

  it("produces the Cisco dot variant (4-hex-digit groups, Pitfall 1)", () => {
    expect(formatMac(BYTES).dot).toBe("3C22.FB00.0000");
  });

  it("produces the no-separator variant", () => {
    expect(formatMac(BYTES).none).toBe("3C22FB000000");
  });

  it("uppercases and zero-pads every byte, including single-digit hex values", () => {
    const bytes = [0x00, 0x05, 0x0a, 0xff, 0x10, 0x01];
    const formats = formatMac(bytes);
    expect(formats.colon).toBe("00:05:0A:FF:10:01");
    expect(formats.dash).toBe("00-05-0A-FF-10-01");
    expect(formats.dot).toBe("0005.0AFF.1001");
    expect(formats.none).toBe("00050AFF1001");
  });
});
