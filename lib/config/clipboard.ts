function copyWithSelectionFallback(value: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand?.("copy") ?? false;
  textarea.remove();
  return copied;
}

export async function copyPlainText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // A denied modern clipboard call may still allow the selection fallback.
    }
  }

  if (!copyWithSelectionFallback(value)) {
    throw new Error("Clipboard access is unavailable");
  }
}

export async function copyRichText(
  plainText: string,
  html: string
): Promise<"rich" | "plain"> {
  if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([plainText], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
      return "rich";
    } catch {
      // Fall through to a plain-text copy when rich clipboard access fails.
    }
  }

  await copyPlainText(plainText);
  return "plain";
}
