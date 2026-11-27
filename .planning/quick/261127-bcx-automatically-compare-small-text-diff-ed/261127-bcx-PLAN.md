# Automatically compare small Text Diff edits

Schedule a comparison 350 ms after the last Modified edit, with two nonblank snippets under 10,000 UTF-16 code units and at most 100 lines each. Cancel the timer on edits, manual submit, reset and unmount. Verify the timer and size boundaries in Vitest and the real automatic worker in Playwright.
