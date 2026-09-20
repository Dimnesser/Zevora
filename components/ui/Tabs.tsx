"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/utils";

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  /** Optional dot colour, used by rarity filters. */
  color?: string;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  size?: "sm" | "md";
}

/** Pill tabs with a shared sliding indicator. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
  size = "md",
}: TabsProps<T>) {
  const layoutId = useId();

  return (
    <div
      className={cn(
        "no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-white/[0.07] bg-white/[0.03] p-1",
        className,
      )}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              "relative shrink-0 whitespace-nowrap rounded-xl font-medium transition-colors duration-200",
              size === "sm" ? "px-3 py-1.5 text-[12.5px]" : "px-4 py-2 text-[13.5px]",
              active ? "text-white" : "text-slate-400 hover:text-slate-200",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-xl border border-white/10 bg-white/[0.09]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {item.color && (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: item.color }}
                />
              )}
              {item.label}
              {item.count !== undefined && (
                <span
                  className={cn(
                    "rounded-md px-1.5 py-px text-[10.5px] font-semibold tabular-nums",
                    active
                      ? "bg-white/15 text-white"
                      : "bg-white/[0.06] text-slate-500",
                  )}
                >
                  {item.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
