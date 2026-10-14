import { defineConfig, devices } from "@playwright/test";

/**
 * Production-build e2e config (Phase 8, HASH-04): builds and serves the app
 * with `HASH_SMOKE=1` so the worker is proven in a real production bundle,
 * not `next dev`. Port 3101 (3100 is taken by an ssh tunnel locally). Never
 * run concurrently with `next dev` in the same checkout (shared `.next`).
 */
export default defineConfig({
  testDir: "./tests/e2e-prod",
  fullyParallel: false,
  workers: 1, // timing assertions must not compete for CPU
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3101",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run start -- -p 3101",
    url: "http://localhost:3101",
    reuseExistingServer: false,
    timeout: 180_000,
    env: { HASH_SMOKE: "1" },
  },
});
