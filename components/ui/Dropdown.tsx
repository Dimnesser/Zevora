"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
  /** Small right-hand annotation — a count, a hint. */
  note?: string;
}

interface DropdownProps<T extends string> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  /** Shown before the current label, e.g. an icon or a field name. */
  iconLeft?: ReactNode;
  label: string;
  className?: string;
  /** Panel side — 'end' hangs it off the right edge of the trigger. */
  align?: "start" | "end";
}

/**
 * Select, rebuilt.
 *
 * A native `<select>` renders its list with the operating system's own
 * chrome, which on a dark game UI arrives as a white rectangle from
 * another century. This is the same control with the site's surfaces —
 * and the same keyboard contract, because a select that cannot be driven
 * from the keyboard is a regression, not a restyle: arrows move the
 * highlight, Enter commits, Escape cancels, Tab and a click outside
 * close it.
 */
export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  iconLeft,
  label,
  className,
  align = "start",
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() =>
    Math.max(0, options.findIndex((o) => o.value === value)),
  );
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = options.find((o) => o.value === value) ?? options[0];

  // A click anywhere else closes the panel — including on another
  // dropdown, which is why this listens on the document rather than
  // relying on blur.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const commit = (v: T) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setCursor(Math.max(0, options.findIndex((o) => o.value === value)));
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (c + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c - 1 + options.length) % options.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setCursor(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setCursor(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commit(options[cursor].value);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-sm border border-line bg-white/[0.035] px-3",
          "text-[13px] text-slate-200 shadow-lip transition-colors duration-200",
          "hover:border-white/20 hover:text-white",
          "focus-visible:outline-none focus-visible:shadow-focus",
          open && "border-zev-400/50 text-white",
        )}
      >
        {iconLeft && <span className="shrink-0 text-slate-500">{iconLeft}</span>}
        <span className="min-w-0 flex-1 truncate text-left">{current?.label}</span>
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-slate-500 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            id={listId}
            role="listbox"
            aria-label={label}
            initial={{ opacity: 0, y: -6, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "surface-overlay absolute z-50 mt-1.5 min-w-full overflow-hidden rounded-sm p-1",
              align === "end" ? "right-0" : "left-0",
            )}
          >
            {options.map((o, i) => {
              const active = o.value === value;
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => commit(o.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xs px-2.5 py-2 text-left text-[13px]",
                      "transition-colors duration-150",
                      i === cursor ? "bg-white/[0.07] text-white" : "text-slate-300",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {o.note && <span className="meta shrink-0">{o.note}</span>}
                    {active && <Check size={13} className="shrink-0 text-zev-300" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
