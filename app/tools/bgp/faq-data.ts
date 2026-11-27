export const examplePrefix = "140.78.0.0/16";

export const faqItems = [
  { question: "What does the BGP Looking Glass show?", answer: "It shows origin ASNs and paths that RIPE RIS collectors observed for a public IP address or prefix." },
  { question: "How do IP and CIDR lookups differ?", answer: "A public IP address can match a covering prefix. A CIDR query looks for an exact network prefix and prefix length." },
  { question: "What does no route observed mean?", answer: "RIPE RIS returned no matching observation. Visibility depends on its collectors and peers." },
  { question: "Where is my lookup sent?", answer: "Your browser sends the submitted address or prefix directly to RIPEstat. Packetory keeps recent results in tab memory for reuse." },
];
