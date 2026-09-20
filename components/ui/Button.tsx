"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Buttons.
 *
 * `primary` is a flat accent surface, not a gradient. A catalogue renders
 * two dozen of these at once, and gradient fills at that density read as
 * a wall of colour rather than a call to action. Weight comes from a lit
 * top edge, a tight accent ring and a glow that only appears on hover —
 * so the button is calm at rest and obviously alive under the cursor.
 *
 * `accent` is the louder one, reserved for the single most important
 * action on a view (open the case, top up). Everything else should be
 * `secondary` or `ghost`.
 */

export type ButtonVariant =
  | "primary"
  | "accent"
  | "secondary"
  | "ghost"
  | "outline"
  | "danger"
  | "gold";
export type ButtonSize = "sm" | "md" | "lg" | "xl" | "icon" | "icon-sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: cn(
    "text-white bg-zev-500/[0.14] border border-zev-400/30",
    "shadow-lip hover:bg-zev-500/[0.22] hover:border-zev-400/55",
    "hover:shadow-[0_0_0_1px_rgba(112,117,255,.35),0_14px_34px_-16px_rgba(91,75,255,.9)]",
  ),
  accent: cn(
    "text-white bg-zev-500 border border-zev-400/60",
    "shadow-[inset_0_1px_0_0_rgba(255,255,255,.22),0_10px_26px_-14px_rgba(91,75,255,.95)]",
    "hover:bg-zev-400 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,.28),0_16px_40px_-14px_rgba(91,75,255,1)]",
  ),
  secondary: cn(
    "text-slate-100 bg-white/[0.055] border border-line",
    "shadow-lip hover:bg-white/[0.09] hover:border-white/15",
  ),
  ghost: "text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent",
  outline:
    "text-slate-200 border border-line bg-transparent hover:bg-white/[0.05] hover:border-white/20",
  danger: cn(
    "text-white bg-danger/[0.14] border border-danger/40",
    "shadow-lip hover:bg-danger/[0.22] hover:border-danger/70",
  ),
  gold: cn(
    "text-gold-300 bg-gold-400/[0.12] border border-gold-400/35",
    "shadow-lip hover:bg-gold-400/[0.2] hover:border-gold-400/60",
    "hover:shadow-[0_0_0_1px_rgba(245,184,65,.3),0_14px_34px_-18px_rgba(245,184,65,.8)]",
  ),
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[12.5px] rounded gap-1.5",
  md: "h-10 px-4 text-[13.5px] rounded-md gap-2",
  lg: "h-11 px-5 text-sm rounded-md gap-2",
  xl: "h-[52px] px-7 text-[15px] rounded-lg gap-2.5",
  icon: "h-10 w-10 rounded-md justify-center",
  "icon-sm": "h-8 w-8 rounded justify-center",
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
          "group/btn relative inline-flex select-none items-center justify-center overflow-hidden",
          "font-medium tracking-[-0.005em] whitespace-nowrap",
          "transition-[background-color,border-color,box-shadow,transform] duration-200 ease-premium",
          "focus-visible:outline-none focus-visible:shadow-focus",
          "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-40",
          VARIANTS[variant],
          SIZES[size],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {/* A light sweeping across the face on hover. Purely decorative, and
            skipped for ghost/outline where there is no face to catch it. */}
        {variant !== "ghost" && variant !== "outline" && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/btn:opacity-100"
          >
            <span className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/[0.14] to-transparent group-hover/btn:animate-sheen" />
          </span>
        )}

        <span className="relative inline-flex items-center gap-[inherit]">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {!loading && iconLeft}
          {children}
          {!loading && iconRight}
        </span>
      </button>
    );
  },
);
