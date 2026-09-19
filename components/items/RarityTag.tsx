"use client";

import type { Rarity } from "@/types";
import { RARITY } from "@/lib/rarity";
import { cn } from "@/lib/utils";

export function RarityTag({
  rarity,
  className,
  compact = false,
}: {
  rarity: Rarity;
  className?: string;
  compact?: boolean;
}) {
  const meta = RARITY[rarity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        className,
      )}
      style={{
        color: meta.color,
        borderColor: `${meta.color}40`,
        background: `${meta.color}14`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }}
      />
      {compact ? meta.short : meta.label}
    </span>
  );
}

/** Thin coloured bar at the bottom of an item card — the CS2 convention. */
export function RarityBar({ rarity }: { rarity: Rarity }) {
  const meta = RARITY[rarity];
  return (
    <span
      className="absolute inset-x-0 bottom-0 h-[3px]"
      style={{
        background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)`,
        boxShadow: `0 0 14px ${meta.glow}`,
      }}
    />
  );
}
