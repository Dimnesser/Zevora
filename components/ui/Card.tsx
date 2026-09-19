"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a hover lift + border highlight. */
  interactive?: boolean;
  /** Stronger, more opaque glass — used for primary panels. */
  strong?: boolean;
  /** Accent colour for the top hairline and hover glow. */
  accent?: string;
}

export function Card({
  className,
  interactive,
  strong,
  accent,
  children,
  style,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        strong ? "glass-strong" : "glass",
        "overflow-hidden",
        interactive &&
          "group cursor-pointer transition-all duration-300 ease-premium hover:-translate-y-1 hover:border-white/15",
        className,
      )}
      style={
        accent
          ? ({ ...style, ["--accent" as string]: accent } as React.CSSProperties)
          : style
      }
      {...props}
    >
      {accent && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          }}
        />
      )}
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="truncate text-[15px] font-semibold text-white">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 truncate text-[13px] text-slate-400">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
