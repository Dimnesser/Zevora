"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Hides the wordmark — used by the mobile header. */
  markOnly?: boolean;
}

/**
 * ZEVORA identity: a geometric "Z" cut from a hexagonal vault plate,
 * paired with a wide-tracked wordmark.
 */
export function ZevoraLogo({ className, markOnly = false }: LogoProps) {
  const raw = useId().replace(/:/g, "");
  const g1 = `lg-${raw}`;
  const g2 = `lg2-${raw}`;

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 48 48"
        className="h-8 w-8 shrink-0"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={g1} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6E71FF" />
            <stop offset="55%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
          <linearGradient id={g2} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        {/* vault plate */}
        <path
          d="M24 2 L44 13 V35 L24 46 L4 35 V13 Z"
          fill={`url(#${g1})`}
        />
        <path
          d="M24 2 L44 13 V35 L24 46 L4 35 V13 Z"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.35"
          strokeWidth="1.2"
        />
        {/* Z cut */}
        <path
          d="M15 15 H33 L21 27 H33 L33 33 H15 L27 21 H15 Z"
          fill={`url(#${g2})`}
        />
      </svg>

      {!markOnly && (
        <span className="font-display text-[19px] font-bold uppercase leading-none tracking-[0.22em] text-white">
          Zevora
        </span>
      )}
    </span>
  );
}
