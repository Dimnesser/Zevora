"use client";

import { memo, useId } from "react";
import { cn, hashString } from "@/lib/utils";

const PALETTES: [string, string][] = [
  ["#6E71FF", "#22D3EE"],
  ["#A855F7", "#6E71FF"],
  ["#FF3B6B", "#F5B841"],
  ["#2FD98A", "#22D3EE"],
  ["#F5B841", "#FF7A18"],
  ["#22D3EE", "#5B4BFF"],
  ["#FF6BD6", "#A855F7"],
  ["#3E82F7", "#2FD98A"],
];

interface AvatarProps {
  seed: string;
  size?: number;
  className?: string;
  /** Ring colour — used for the partner glow. */
  ring?: string;
}

/**
 * Deterministic geometric identicon. Same seed always produces the same
 * avatar on server and client, so it is hydration-safe.
 */
function AvatarBase({ seed, size = 40, className, ring }: AvatarProps) {
  const raw = useId().replace(/:/g, "");
  const h = hashString(seed);
  const [c1, c2] = PALETTES[h % PALETTES.length];
  const variant = (h >> 3) % 4;
  const initials = seed.slice(0, 2).toUpperCase();
  const gid = `av-${raw}`;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        className,
      )}
      style={{
        width: size,
        height: size,
        boxShadow: ring
          ? `0 0 0 2px ${ring}, 0 0 16px -2px ${ring}`
          : "inset 0 0 0 1px rgba(255,255,255,0.12)",
      }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>
        <rect width="64" height="64" fill={`url(#${gid})`} />
        <g fill="#0B0D18" fillOpacity="0.22">
          {variant === 0 && <circle cx="44" cy="20" r="26" />}
          {variant === 1 && <path d="M0 64 L64 0 V64 Z" />}
          {variant === 2 && <rect x="0" y="34" width="64" height="30" />}
          {variant === 3 && <path d="M32 0 L64 32 L32 64 L0 32 Z" />}
        </g>
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-display font-bold text-white/90"
        style={{ fontSize: size * 0.36, textShadow: "0 1px 2px rgba(0,0,0,.45)" }}
      >
        {initials}
      </span>
    </span>
  );
}

export const Avatar = memo(AvatarBase);
