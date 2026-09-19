"use client";

import { Star } from "lucide-react";
import type { PartnerTier } from "@/types";
import { TIERS } from "@/data/partners";
import { cn } from "@/lib/utils";

interface PartnerBadgeProps {
  tier: PartnerTier;
  className?: string;
  size?: "xs" | "sm" | "md";
  /** Shows only the star mark — used in tight rows like the leaderboard. */
  iconOnly?: boolean;
}

/**
 * The ★ ZEVORA PARTNER mark. Colours come from the tier, so an Ambassador
 * never looks like a base Partner.
 */
export function PartnerBadge({
  tier,
  className,
  size = "sm",
  iconOnly = false,
}: PartnerBadgeProps) {
  const meta = TIERS[tier];
  const [c1, c2] = meta.colors;

  const dims =
    size === "xs"
      ? "h-5 px-1.5 text-[9px] gap-1"
      : size === "sm"
        ? "h-6 px-2 text-[10px] gap-1.5"
        : "h-7 px-2.5 text-[11px] gap-1.5";

  return (
    <span
      className={cn(
        "relative inline-flex items-center rounded-md font-bold uppercase tracking-wider",
        iconOnly && "px-0 w-6 justify-center",
        dims,
        className,
      )}
      style={{
        color: "#0B0D18",
        background: `linear-gradient(115deg, ${c1}, ${c2})`,
        boxShadow: `0 0 18px -6px ${c1}, inset 0 1px 0 rgba(255,255,255,.4)`,
      }}
      title={`${meta.name} — ${meta.tagline}`}
    >
      <Star size={size === "xs" ? 9 : 11} fill="currentColor" strokeWidth={0} />
      {!iconOnly && <span>{meta.name}</span>}
    </span>
  );
}

/** Large ceremonial badge for the partner profile section. */
export function PartnerCrest({ tier }: { tier: PartnerTier }) {
  const meta = TIERS[tier];
  const [c1, c2] = meta.colors;
  return (
    <div
      className="relative inline-flex items-center gap-3 rounded-2xl border px-4 py-2.5"
      style={{
        borderColor: `${c1}55`,
        background: `linear-gradient(120deg, ${c1}1F, ${c2}12)`,
        boxShadow: `0 0 40px -18px ${c1}`,
      }}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: `linear-gradient(120deg, ${c1}, ${c2})` }}
      >
        <Star size={16} className="text-void" fill="currentColor" strokeWidth={0} />
      </span>
      <div className="leading-tight">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Zevora Partner
        </p>
        <p
          className="font-display text-[15px] font-bold"
          style={{ color: c1 }}
        >
          {meta.name}
        </p>
      </div>
    </div>
  );
}
