import { describe, expect, it } from "vitest";
import { redactConfig } from "./redact";

describe("Cisco credential redaction", () => {
  it.each([
    ["snmp-server community \"synthetic community\" RO 10", "snmp-server community <redacted> RO 10"],
    ["snmp-server host 192.0.2.20 traps version 2c synthetic traps", "snmp-server host 192.0.2.20 traps version 2c <redacted> traps"],
    ["enable secret 9 synthetic", "enable secret 9 <redacted>"],
    ["username demo privilege 15 secret 8 synthetic", "username demo privilege 15 secret 8 <redacted>"],
    ["line vty 0 4\n password 7 synthetic\n login", "line vty 0 4\n password 7 <redacted>\n login"],
    [" neighbor 2001:db8::1 password 7 synthetic", " neighbor 2001:db8::1 password 7 <redacted>"],
    [" neighbor EDGE password synthetic with spaces", " neighbor EDGE password <redacted>"],
    ["router bgp 64512\n template peer-session EDGE\n  password 0 synthetic", "router bgp 64512\n template peer-session EDGE\n  password 0 <redacted>"],
    ["key chain EDGE tcp\r\n key 1\r\n  key-string synthetic\r\nrouter bgp 64512\r\n neighbor EDGE ao EDGE\r\n", "key chain EDGE tcp\r\n key 1\r\n  key-string <redacted>\r\nrouter bgp 64512\r\n neighbor EDGE ao EDGE\r\n"],
    ["radius server AUTH\n key 7 synthetic", "radius server AUTH\n key 7 <redacted>"],
    ["tacacs server AUTH\n key 6 synthetic", "tacacs server AUTH\n key 6 <redacted>"],
    ["radius-server key 7 synthetic", "radius-server key 7 <redacted>"],
    ["crypto isakmp key 0 synthetic address 192.0.2.1", "crypto isakmp key 0 <redacted> address 192.0.2.1"],
    [" ip ospf message-digest-key 1 md5 7 synthetic", " ip ospf message-digest-key 1 md5 7 <redacted>"],
  ])("redacts only the credential in %j", (source, text) => {
    expect(redactConfig(source)).toEqual({ text, count: 1 });
    expect(redactConfig(text)).toEqual({ text, count: 0 });
  });

  it("preserves routing communities, SNMPv3 usernames, descriptions and banners", () => {
    const source = "set community 64512:1\nsnmp-server host 192.0.2.1 traps version 3 priv operator\n description neighbor EDGE password label\nbanner motd ^C\nneighbor EDGE password example text\n^C\nno neighbor EDGE password\n";
    expect(redactConfig(source)).toEqual({ text: source, count: 0 });
  });
});
