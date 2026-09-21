"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Route progress bar.
 *
 * The App Router gives no navigation-start event, so the bar listens for a
 * click on an internal link and starts there; the pathname changing is what
 * finishes it. That covers the honest case — a person tapping through the
 * site — and the back button, via `popstate`.
 *
 * The fill creeps toward 90% and never reaches it on its own: a bar that
 * completes before the page does is a lie, and a bar that sits at zero
 * while a server component streams reads as a frozen site.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [value, setValue] = useState(0);
  const [busy, setBusy] = useState(false);
  const creep = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const start = () => {
      clearTimeout(settle.current);
      setBusy(true);
      setValue(12);
      clearInterval(creep.current);
      creep.current = setInterval(() => {
        // Decelerating creep: each tick covers a tenth of what is left.
        setValue((v) => (v >= 90 ? v : v + (90 - v) * 0.12));
      }, 180);
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || a.target === "_blank" || a.hasAttribute("download")) return;
      // Internal, and actually going somewhere else.
      if (!href.startsWith("/") || href.startsWith("//")) return;
      if (href.split("?")[0].split("#")[0] === pathname) return;
      start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", start);
    };
  }, [pathname]);

  // The new route has painted — run the bar out and fade it.
  useEffect(() => {
    clearInterval(creep.current);
    setValue(100);
    settle.current = setTimeout(() => {
      setBusy(false);
      setValue(0);
    }, 340);
    return () => clearTimeout(settle.current);
  }, [pathname]);

  useEffect(
    () => () => {
      clearInterval(creep.current);
      clearTimeout(settle.current);
    },
    [],
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[2px]"
      style={{ opacity: busy ? 1 : 0, transition: "opacity .3s ease" }}
    >
      <div
        className="h-full bg-gradient-to-r from-zev-500 via-zev-400 to-ice-400"
        style={{
          width: `${value}%`,
          transition: "width .28s cubic-bezier(.22,1,.36,1)",
          boxShadow: "0 0 12px rgba(110,113,255,.75), 0 0 3px rgba(34,211,238,.9)",
        }}
      />
    </div>
  );
}
