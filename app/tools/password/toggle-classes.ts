/**
 * Item classes shared by the Mode, Separator and Attack scenario toggle groups
 * (UI-SPEC "Component Inventory"). The default item height (`h-8`) is below the
 * 44px target, so it is overridden. The selected text is cyan-700 because the
 * site's `text-primary` on `primary/10` fails AA at 14px in light mode.
 */
export const TOGGLE_ITEM_CLASS =
  "h-11 min-w-11 px-4 text-[14px] leading-[1.4] font-semibold text-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-cyan-700 dark:data-[state=on]:text-primary";
