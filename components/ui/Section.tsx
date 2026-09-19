"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Section heading used across the marketing and dashboard pages. */
export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <span className="mb-2 inline-block text-[11px] font-semibold uppercase tracking-[0.2em] text-zev-300/80">
            {eyebrow}
          </span>
        )}
        <h2 className="text-2xl font-bold sm:text-[28px]">{title}</h2>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
