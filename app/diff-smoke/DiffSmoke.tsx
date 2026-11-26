"use client";

import { useEffect } from "react";
import { createTextDiffClient } from "@/lib/text-diff/client";

declare global {
  interface Window {
    __diffSmoke?: ReturnType<typeof createTextDiffClient>;
  }
}

export function DiffSmoke() {
  useEffect(() => {
    const client = createTextDiffClient();
    window.__diffSmoke = client;
    return () => {
      client.cancel();
      delete window.__diffSmoke;
    };
  }, []);

  return <main>Text diff worker smoke harness</main>;
}
