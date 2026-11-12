import type { ConfigTokenKind } from "@/lib/config/highlight";

/**
 * Token class maps shared by the client ConfigTool preview and the server
 * ConfigExample, so the worked example cannot drift from the tool (Phase 10,
 * D-11). Plain module on purpose: no client directive, so a Server Component
 * can import the values.
 */
export const TOKEN_CLASSES: Record<ConfigTokenKind, string> = {
  plain: "text-foreground",
  comment: "text-slate-500 italic dark:text-slate-400",
  command: "font-semibold text-blue-700 dark:text-blue-300",
  keyword: "font-semibold text-violet-700 dark:text-violet-300",
  interface: "text-amber-700 dark:text-amber-300",
  address: "text-emerald-700 dark:text-emerald-300",
  number: "text-rose-700 dark:text-rose-300",
  string: "text-fuchsia-700 dark:text-fuchsia-300",
};

export const MONOCHROME_TOKEN_CLASSES: Record<ConfigTokenKind, string> = {
  plain: "text-foreground",
  comment: "text-foreground italic",
  command: "font-semibold text-foreground",
  keyword: "font-semibold text-foreground",
  interface: "text-foreground",
  address: "text-foreground",
  number: "text-foreground",
  string: "text-foreground",
};
