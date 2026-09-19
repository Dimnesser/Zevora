"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  iconLeft?: ReactNode;
  suffix?: ReactNode;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, iconLeft, suffix, invalid, ...props },
  ref,
) {
  return (
    <div className="relative flex w-full min-w-0 items-center">
      {iconLeft && (
        <span className="pointer-events-none absolute left-3.5 text-slate-500">
          {iconLeft}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          "h-11 w-full min-w-0 rounded-xl border bg-white/[0.04] text-sm text-white",
          "placeholder:text-slate-500",
          "transition-colors duration-200 focus:outline-none",
          invalid
            ? "border-danger/60 focus:border-danger"
            : "border-white/[0.09] focus:border-zev-400/70 focus:bg-white/[0.06]",
          iconLeft ? "pl-10" : "pl-4",
          suffix ? "pr-14" : "pr-4",
          className,
        )}
        {...props}
      />
      {suffix && (
        <span className="absolute right-3.5 text-[13px] font-medium text-slate-500">
          {suffix}
        </span>
      )}
    </div>
  );
});

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[12.5px] font-medium text-slate-400">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] text-slate-500">{hint}</span>}
    </label>
  );
}
