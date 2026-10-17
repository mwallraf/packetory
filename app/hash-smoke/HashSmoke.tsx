"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createHashClient, type HashClient } from "@/lib/hash/client";

declare global {
  interface Window {
    __hashSmoke?: HashClient;
  }
}

// Tiny external store so "ready" tracks `window.__hashSmoke` exactly: the
// indicator flips only after the client is actually exposed to e2e.
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const notify = () => listeners.forEach((cb) => cb());
const getSnapshot = () => window.__hashSmoke !== undefined;
const getServerSnapshot = () => false;

/**
 * Client island for the test-only hash harness: creates the real hash client
 * (and so the real production Worker) on mount and exposes it as
 * `window.__hashSmoke` for Playwright. No UI beyond a ready indicator.
 */
export function HashSmoke() {
  const ready = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const client = createHashClient();
    window.__hashSmoke = client;
    notify();
    return () => {
      client.dispose();
      delete window.__hashSmoke;
      notify();
    };
  }, []);

  return (
    <main>
      <p data-testid="hash-smoke-ready">{ready ? "ready" : "loading"}</p>
    </main>
  );
}
