import { describe, expect, it } from "vitest";
import { buildConfigHtml, highlightConfig } from "./highlight";

function tokensFor(config: string) {
  return highlightConfig(config, "cisco").flat();
}

describe("config highlighting", () => {
  it("highlights IOS comments, commands, interfaces, IPv4 addresses, and descriptions", () => {
    const tokens = tokensFor(`! uplink\ninterface GigabitEthernet0/1\n description Core <uplink>\n ip address 192.0.2.1 255.255.255.0\n no shutdown`);

    expect(tokens).toContainEqual({ kind: "comment", text: "! uplink" });
    expect(tokens).toContainEqual({ kind: "command", text: "interface" });
    expect(tokens).toContainEqual({
      kind: "interface",
      text: "GigabitEthernet0/1",
    });
    expect(tokens).toContainEqual({ kind: "string", text: "Core <uplink>" });
    expect(tokens).toContainEqual({ kind: "address", text: "192.0.2.1" });
    expect(tokens).toContainEqual({ kind: "address", text: "255.255.255.0" });
    expect(tokens).toContainEqual({ kind: "keyword", text: "no" });
    expect(tokens).toContainEqual({ kind: "keyword", text: "shutdown" });
  });

  it("recognizes common IOS-XR interface names and compressed IPv6 prefixes", () => {
    const tokens = tokensFor(`interface Bundle-Ether10.120\n ipv6 address 2001:db8:120::1/64\n route-policy ACCEPT-V6\n  pass\n end-policy`);

    expect(tokens).toContainEqual({
      kind: "interface",
      text: "Bundle-Ether10.120",
    });
    expect(tokens).toContainEqual({
      kind: "address",
      text: "2001:db8:120::1/64",
    });
    expect(tokens).toContainEqual({ kind: "keyword", text: "pass" });
  });

  it("leaves plain text unclassified", () => {
    expect(highlightConfig("interface Gi0/1", "plain")).toEqual([
      [{ kind: "plain", text: "interface Gi0/1" }],
    ]);
  });

  it("produces self-contained, escaped clipboard HTML with inline styles", () => {
    const html = buildConfigHtml(
      `description Core <uplink> & "edge"`,
      "cisco"
    );

    expect(html).toContain("<pre style=");
    expect(html).toContain("font-family:Consolas");
    expect(html).toContain("Core &lt;uplink&gt; &amp; &quot;edge&quot;");
    expect(html).not.toContain("class=");
    expect(html).not.toContain("Core <uplink>");
  });
});
