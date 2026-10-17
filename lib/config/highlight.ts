export type ConfigProfile = "cisco" | "plain";

export type ConfigTokenKind =
  | "plain"
  | "comment"
  | "command"
  | "keyword"
  | "interface"
  | "address"
  | "number"
  | "string";

export type ConfigToken = {
  kind: ConfigTokenKind;
  text: string;
};

const COMMANDS = new Set([
  "aaa",
  "access-list",
  "address-family",
  "banner",
  "class-map",
  "community-set",
  "crypto",
  "description",
  "hostname",
  "interface",
  "ip",
  "ipv6",
  "line",
  "logging",
  "neighbor",
  "network",
  "ntp",
  "policy-map",
  "prefix-set",
  "redistribute",
  "remark",
  "route-map",
  "route-policy",
  "router",
  "snmp-server",
  "spanning-tree",
  "switchport",
  "tacacs-server",
  "username",
  "vlan",
  "vrf",
]);

const KEYWORDS = new Set([
  "active",
  "any",
  "apply",
  "commit",
  "default",
  "deny",
  "disable",
  "done",
  "drop",
  "egress",
  "else",
  "enable",
  "end",
  "endif",
  "eq",
  "exit",
  "host",
  "if",
  "in",
  "ingress",
  "no",
  "out",
  "pass",
  "passive",
  "permit",
  "primary",
  "range",
  "secondary",
  "shutdown",
  "then",
]);

const INTERFACE_PATTERN =
  /^(?:Bundle-Ether|Port-channel|HundredGigE|TenGigE|GigabitEthernet|FastEthernet|Ethernet|Loopback|Vlan|Tunnel|Serial|Management|MgmtEth)\d+(?:[/.:-]\d+)*/i;

const IPV4_PATTERN =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\/(?:3[0-2]|[12]?\d))?/;

const INLINE_COLORS: Record<ConfigTokenKind, string> = {
  plain: "#0f172a",
  comment: "#64748b",
  command: "#1d4ed8",
  keyword: "#7c3aed",
  interface: "#b45309",
  address: "#047857",
  number: "#be123c",
  string: "#a21caf",
};

const INLINE_EMPHASIS: Partial<Record<ConfigTokenKind, string>> = {
  comment: "font-style:italic;",
  command: "font-weight:600;",
  keyword: "font-weight:600;",
};

function appendToken(
  tokens: ConfigToken[],
  kind: ConfigTokenKind,
  text: string
) {
  if (!text) return;
  const previous = tokens.at(-1);
  if (previous?.kind === kind) {
    previous.text += text;
  } else {
    tokens.push({ kind, text });
  }
}

function isIpv6(value: string): boolean {
  const [address, prefix, extra] = value.split("/");
  if (extra !== undefined) return false;
  if (prefix !== undefined) {
    const prefixLength = Number(prefix);
    if (!/^\d{1,3}$/.test(prefix) || prefixLength > 128) return false;
  }

  if (!address.includes(":")) return false;
  if ((address.match(/::/g) ?? []).length > 1) return false;

  const parts = address.split(":");
  const hasCompression = address.includes("::");
  const nonEmptyParts = parts.filter(Boolean);
  if (!nonEmptyParts.every((part) => /^[0-9a-f]{1,4}$/i.test(part))) {
    return false;
  }

  return hasCompression ? nonEmptyParts.length < 8 : parts.length === 8;
}

function tokenizeCiscoLine(line: string): ConfigToken[] {
  const leadingWhitespace = line.match(/^\s*/)?.[0] ?? "";
  const content = line.slice(leadingWhitespace.length);

  if (content.startsWith("!") || content.startsWith("#")) {
    return [
      ...(leadingWhitespace
        ? [{ kind: "plain" as const, text: leadingWhitespace }]
        : []),
      { kind: "comment", text: content },
    ];
  }

  const description = content.match(/^(description|remark)(\s+)(.*)$/i);
  if (description) {
    return [
      ...(leadingWhitespace
        ? [{ kind: "plain" as const, text: leadingWhitespace }]
        : []),
      { kind: "command", text: description[1] },
      { kind: "plain", text: description[2] },
      { kind: "string", text: description[3] },
    ];
  }

  const tokens: ConfigToken[] = [];
  let index = 0;
  let statementStart = true;

  while (index < line.length) {
    const remaining = line.slice(index);

    const whitespace = remaining.match(/^\s+/)?.[0];
    if (whitespace) {
      appendToken(tokens, "plain", whitespace);
      index += whitespace.length;
      continue;
    }

    const quoted = remaining.match(/^(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/)?.[0];
    if (quoted) {
      appendToken(tokens, "string", quoted);
      index += quoted.length;
      statementStart = false;
      continue;
    }

    const ipv4 = remaining.match(IPV4_PATTERN)?.[0];
    if (ipv4 && !/^[\w.]/.test(remaining.slice(ipv4.length))) {
      appendToken(tokens, "address", ipv4);
      index += ipv4.length;
      statementStart = false;
      continue;
    }

    const ipv6Candidate = remaining.match(/^[0-9a-f:]+(?:\/\d{1,3})?/i)?.[0];
    if (ipv6Candidate && isIpv6(ipv6Candidate)) {
      appendToken(tokens, "address", ipv6Candidate);
      index += ipv6Candidate.length;
      statementStart = false;
      continue;
    }

    const interfaceName = remaining.match(INTERFACE_PATTERN)?.[0];
    if (interfaceName) {
      appendToken(tokens, "interface", interfaceName);
      index += interfaceName.length;
      statementStart = false;
      continue;
    }

    const number = remaining.match(/^\d+(?:-\d+)?/)?.[0];
    if (number) {
      appendToken(tokens, "number", number);
      index += number.length;
      statementStart = false;
      continue;
    }

    const word = remaining.match(/^[a-z][\w.-]*/i)?.[0];
    if (word) {
      const normalized = word.toLowerCase();
      const kind = KEYWORDS.has(normalized)
        ? "keyword"
        : statementStart || COMMANDS.has(normalized)
          ? "command"
          : "plain";
      appendToken(tokens, kind, word);
      index += word.length;
      statementStart = false;
      continue;
    }

    appendToken(tokens, "plain", remaining[0]);
    index += 1;
    statementStart = false;
  }

  return tokens;
}

export function highlightConfig(
  config: string,
  profile: ConfigProfile
): ConfigToken[][] {
  return config.split("\n").map((line) =>
    profile === "plain"
      ? [{ kind: "plain", text: line }]
      : tokenizeCiscoLine(line)
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeHtmlWithPreservedWhitespace(value: string): string {
  return escapeHtml(value)
    .replaceAll("\t", "&nbsp;&nbsp;&nbsp;&nbsp;")
    .replaceAll(" ", "&nbsp;");
}

function renderClipboardToken(
  token: ConfigToken,
  monochrome: boolean
): string {
  const content = escapeHtmlWithPreservedWhitespace(token.text);
  const style = `${monochrome ? "" : `color:${INLINE_COLORS[token.kind]};`}${INLINE_EMPHASIS[token.kind] ?? ""}`;

  return style ? `<span style="${style}">${content}</span>` : content;
}

type ConfigHtmlOptions = {
  monochrome?: boolean;
};

export function buildConfigHtml(
  config: string,
  profile: ConfigProfile,
  { monochrome = false }: ConfigHtmlOptions = {}
): string {
  const content = highlightConfig(config, profile)
    .map((line) =>
      line.map((token) => renderClipboardToken(token, monochrome)).join("")
    )
    .join("<br>");

  return `<span style="font-family:Consolas,Monaco,'Courier New',monospace;font-size:13px;line-height:1.5;">${content}</span>`;
}
