"use client";

import type { Rarity } from "@/lib/client/api";
import { cn } from "@/lib/utils";

/**
 * Rarity chip. Colours come from the database, so a rarity the owner
 * added in the admin panel renders exactly like a built-in one.
 */
export function RarityTag({
  rarity,
  className,
}: {
  rarity: Rarity;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        className,
      )}
      style={{
        color: rarity.color,
        borderColor: `${rarity.color}40`,
        background: `${rarity.color}14`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: rarity.color, boxShadow: `0 0 6px ${rarity.color}` }}
      />
      {rarity.name}
    </span>
  );
}

/** Thin coloured bar at the bottom of an item card — the CS2 convention. */
export function RarityBar({ color }: { color: string }) {
  return (
    <span
      className="absolute inset-x-0 bottom-0 h-[3px]"
      style={{
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        boxShadow: `0 0 14px ${color}8C`,
      }}
    />
  );
}
