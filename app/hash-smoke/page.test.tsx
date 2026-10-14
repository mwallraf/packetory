import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND_MOCK");
  }),
}));

vi.mock("next/navigation", () => ({ notFound }));

import HashSmokePage, { metadata } from "./page";
import { HashSmoke } from "./HashSmoke";

describe("/hash-smoke harness gate (HASH-04)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    notFound.mockClear();
  });

  it("calls notFound() when HASH_SMOKE is unset (HASH-04)", () => {
    const saved = process.env.HASH_SMOKE;
    delete process.env.HASH_SMOKE;
    try {
      expect(() => HashSmokePage()).toThrow("NEXT_NOT_FOUND_MOCK");
      expect(notFound).toHaveBeenCalledTimes(1);
    } finally {
      if (saved !== undefined) process.env.HASH_SMOKE = saved;
    }
  });

  it.each(["", "0", "true", " 1"])(
    "calls notFound() when HASH_SMOKE is %j (HASH-04)",
    (value) => {
      vi.stubEnv("HASH_SMOKE", value);
      expect(() => HashSmokePage()).toThrow("NEXT_NOT_FOUND_MOCK");
      expect(notFound).toHaveBeenCalledTimes(1);
    },
  );

  it("renders the HashSmoke island only when HASH_SMOKE is exactly '1' (HASH-04)", () => {
    vi.stubEnv("HASH_SMOKE", "1");
    const element = HashSmokePage();
    expect(element.type).toBe(HashSmoke);
    expect(notFound).not.toHaveBeenCalled();
  });

  it("is marked noindex/nofollow (HASH-04)", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it.each([
    "tools/registry.ts",
    "app/sitemap.ts",
    "components/SiteHeader.tsx",
    "components/MobileNav.tsx",
  ])("%s never references the harness route (HASH-04)", (relative) => {
    const source = readFileSync(path.join(__dirname, "../..", relative), "utf-8");
    expect(source).not.toContain("hash-smoke");
  });
});
