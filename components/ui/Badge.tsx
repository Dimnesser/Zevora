"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: ReactNode;
  className?: string;
  /** Explicit colour — renders as a tinted chip. */
  color?: string;
  size?: "xs" | "sm";
}

export function Badge({ children, className, color, size = "sm" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wider",
        size === "xs" ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]",
        color
          ? "border-transparent"
          : "border-white/10 bg-white/[0.06] text-slate-300",
        className,
      )}
      style={
        color
          ? {
              color,
              backgroundColor: `${color}1F`,
              borderColor: `${color}55`,
            }
          : undefined
      }
    >
      {children}
    </span>
  );
}
