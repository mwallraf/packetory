import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // HASH-04: only lib/hash/engine.ts may import @noble/hashes, which keeps the
  // hashing library out of the initial page JS (it loads only in the worker).
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["lib/hash/engine.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@noble/hashes", "@noble/hashes/*"],
              message: "Import @noble/hashes only from lib/hash/engine.ts",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
