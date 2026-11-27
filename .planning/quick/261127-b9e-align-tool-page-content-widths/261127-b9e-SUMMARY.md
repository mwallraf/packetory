---
status: complete
---

All eight tool pages use the same 1,152px maximum outer content width. Subnet now uses the same sizing rule below 1,024px as the other tools. Each tool keeps its own internal layout.

Chromium measured matching outer widths and no horizontal page overflow on all eight tool routes at 320px, 900px, and 1,440px. All 521 tool tests passed. Implementation commit: c35c202.
