"use client";

import { cn } from "@/lib/utils";

/** Brand spinner — a rotating hexagonal vault ring. */
export function Loader({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block animate-spin-slow", className)}
      style={{ width: size, height: size, animationDuration: "1.6s" }}
      role="status"
      aria-label="Загрузка"
    >
      <svg viewBox="0 0 48 48" width={size} height={size}>
        <defs>
          <linearGradient id="zl" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6E71FF" />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <path
          d="M24 3 L42 13.5 V34.5 L24 45 L6 34.5 V13.5 Z"
          fill="none"
          stroke="url(#zl)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function PageLoader({ label = "Загрузка" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <Loader size={44} />
      <p className="text-sm text-slate-500">{label}…</p>
    </div>
  );
}
