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
        "inline-flex items-center gap-1.5 rounded-xs border font-mono font-medium uppercase",
        "tracking-[0.12em] leading-none",
        size === "xs" ? "px-1.5 py-[3px] text-[9px]" : "px-2 py-[5px] text-[10px]",
        color
          ? "border-transparent"
          : "border-line bg-white/[0.045] text-slate-400",
        className,
      )}
      style={
        color
          ? {
              color,
              backgroundColor: `${color}16`,
              borderColor: `${color}4D`,
            }
          : undefined
      }
    >
      {/* A rarity chip carries a filled dot, so the grade is legible even
          where the tint is too dark to read against the surface. */}
      {color && (
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: color, boxShadow: `0 0 6px ${color}` }}
        />
      )}
      {children}
    </span>
  );
}
