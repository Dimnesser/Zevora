"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "danger"
  | "gold";
export type ButtonSize = "sm" | "md" | "lg" | "xl" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "text-white bg-[linear-gradient(120deg,#5B4BFF_0%,#7C5CFF_45%,#22D3EE_140%)] shadow-[0_10px_30px_-10px_rgba(91,75,255,.9)] hover:shadow-[0_14px_40px_-10px_rgba(91,75,255,1)] hover:brightness-110 active:brightness-95",
  secondary:
    "text-white bg-white/[0.07] hover:bg-white/[0.12] border border-white/10",
  ghost: "text-slate-300 hover:text-white hover:bg-white/[0.07]",
  outline:
    "text-white border border-zev-400/40 bg-zev-500/[0.07] hover:bg-zev-500/[0.16] hover:border-zev-400/70",
  danger:
    "text-white bg-danger/90 hover:bg-danger border border-danger/40 shadow-[0_10px_30px_-12px_rgba(255,77,94,.8)]",
  gold: "text-[#231803] bg-[linear-gradient(120deg,#FFD976_0%,#F5B841_50%,#DE9A18_100%)] shadow-[0_10px_30px_-10px_rgba(245,184,65,.8)] hover:brightness-110",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[13px] rounded-lg gap-1.5",
  md: "h-11 px-5 text-sm rounded-xl gap-2",
  lg: "h-12 px-6 text-[15px] rounded-xl gap-2",
  xl: "h-14 px-8 text-base rounded-2xl gap-2.5",
  icon: "h-10 w-10 rounded-xl justify-center",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      iconLeft,
      iconRight,
      fullWidth,
      children,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "relative inline-flex select-none items-center justify-center font-medium",
          "transition-all duration-200 ease-premium will-change-transform",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zev-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-void",
          "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
          VARIANTS[variant],
          SIZES[size],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && iconLeft}
        {children}
        {!loading && iconRight}
      </button>
    );
  },
);
