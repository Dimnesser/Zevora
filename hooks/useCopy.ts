"use client";

import { useCallback, useState } from "react";

/** Copies text into the clipboard using the legacy path when the async API is blocked. */
function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function useCopy(resetAfter = 1800) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      let ok = false;

      // The async API needs a secure context and clipboard permission; when
      // either is missing it throws, so the legacy path has to catch it.
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          ok = true;
        } catch {
          ok = legacyCopy(text);
        }
      } else {
        ok = legacyCopy(text);
      }

      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), resetAfter);
      }
      return ok;
    },
    [resetAfter],
  );

  return { copied, copy };
}
