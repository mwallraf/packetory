const REDACTED = "<redacted>";

type Block = "line" | "peer-session" | "key-chain" | "radius" | "tacacs";
type Rule = {
  name: string;
  within?: Block;
  // Captures: text before the credential, credential, optional trailing text.
  pattern: RegExp;
};

const RULES: readonly Rule[] = [
  { name: "SNMP community", pattern: /^(\s*snmp-server\s+community\s+)("(?:[^"\\]|\\.)*"|\S+)(.*)$/i },
  { name: "SNMP host community", pattern: /^(\s*snmp-server\s+host\s+\S+(?:\s+vrf\s+\S+)?(?:\s+(?:traps|informs))?(?:\s+version\s+(?:1|2c))?\s+)(?!(?:version|vrf|traps|informs)(?:\s|$))("(?:[^"\\]|\\.)*"|\S+)(.*)$/i },
  { name: "Enable password or secret", pattern: /^(\s*enable\s+(?:password|secret)(?:\s+level\s+\d{1,2})?\s+(?:[05789]\s+)?)(\S.*)$/i },
  { name: "Username password or secret", pattern: /^(\s*username\s+\S+(?:\s+(?:privilege|view|access-class)\s+\S+|\s+(?:nopassword|nohangup))*\s+(?:password|secret)\s+(?:[05789]\s+)?)(\S.*)$/i },
  { name: "Line password", within: "line", pattern: /^(\s*password\s+(?:[07]\s+)?)(\S.*)$/i },
  { name: "BGP neighbor password", pattern: /^(\s*neighbor\s+\S+\s+password\s+(?:[07]\s+)?)(\S.*)$/i },
  { name: "BGP peer-session password", within: "peer-session", pattern: /^(\s*password\s+(?:[07]\s+)?)(\S.*)$/i },
  { name: "Key-chain key string", within: "key-chain", pattern: /^(\s*key-string\s+(?:[067]\s+)?)(\S.*)$/i },
  { name: "RADIUS shared key", within: "radius", pattern: /^(\s*key\s+(?:[067]\s+)?)(\S.*)$/i },
  { name: "TACACS shared key", within: "tacacs", pattern: /^(\s*key\s+(?:[067]\s+)?)(\S.*)$/i },
  { name: "Legacy server shared key", pattern: /^(\s*(?:radius-server|tacacs-server)\s+key\s+(?:[067]\s+)?)(\S.*)$/i },
  { name: "ISAKMP preshared key", pattern: /^(\s*crypto\s+isakmp\s+key\s+(?:[06]\s+)?)(\S+)(\s+(?:address|hostname)\s+.+)$/i },
  { name: "OSPF authentication key", pattern: /^(\s*ip\s+ospf\s+(?:authentication-key|message-digest-key\s+\d+\s+md5)\s+(?:[07]\s+)?)(\S.*)$/i },
];

function opensBlock(command: string): Block | undefined {
  if (/^line\s/i.test(command)) return "line";
  if (/^template\s+peer-session\s/i.test(command)) return "peer-session";
  if (/^key\s+chain\s/i.test(command)) return "key-chain";
  if (/^radius\s+server\s/i.test(command)) return "radius";
  if (/^tacacs\s+server\s/i.test(command)) return "tacacs";
}

export function redactConfig(config: string): { text: string; count: number } {
  const blocks: { kind: Block; indent: number }[] = [];
  let count = 0;
  let bannerDelimiter: string | undefined;
  const text = config.split(/(\r\n|\n|\r)/).map((line, index) => {
    if (index % 2 !== 0) return line;
    if (bannerDelimiter) {
      if (line.includes(bannerDelimiter)) bannerDelimiter = undefined;
      return line;
    }
    const command = line.trimStart();
    if (command === "") return line;
    const indent = line.length - command.length;
    while (blocks.length && blocks[blocks.length - 1].indent >= indent) blocks.pop();

    const banner = /^banner\s+\S+\s+(\^\S|\S)(.*)$/i.exec(command);
    if (banner) {
      if (!banner[2].includes(banner[1])) bannerDelimiter = banner[1];
      return line;
    }
    const block = opensBlock(command);
    if (block) blocks.push({ kind: block, indent });

    for (const { within, pattern } of RULES) {
      if (within && !blocks.some(({ kind }) => kind === within)) continue;
      const match = pattern.exec(line);
      if (!match) continue;
      if (match[2] === REDACTED) return line;
      count++;
      return match[1] + REDACTED + (match[3] ?? "");
    }
    return line;
  }).join("");
  return { text, count };
}
