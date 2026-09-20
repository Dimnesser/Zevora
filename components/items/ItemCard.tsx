"use client";

import { motion } from "framer-motion";
import { memo, type ReactNode } from "react";
import type { DisplaySkin } from "@/lib/client/display";
import { rarityGradient } from "@/lib/client/display";
import { SkinImage } from "@/components/art/SkinImage";
import { RarityBar, RarityTag } from "@/components/items/RarityTag";
import { formatMinor } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ItemCardProps {
  skin: DisplaySkin;
  /** Overrides the price shown on the card. */
  priceMinor?: number;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  footer?: ReactNode;
  /** Extra line under the name — wear, drop chance, acquisition date. */
  meta?: ReactNode;
  badge?: ReactNode;
  className?: string;
  size?: "sm" | "md";
}

function ItemCardBase({
  skin,
  priceMinor,
  selected,
  disabled,
  onClick,
  footer,
  meta,
  badge,
  className,
  size = "md",
}: ItemCardProps) {
  const color = skin.rarity.color;
  const value = priceMinor ?? skin.price_minor;

  return (
    <motion.div
      whileHover={onClick && !disabled ? { y: -4 } : undefined}
      whileTap={onClick && !disabled ? { scale: 0.985 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "glass group relative flex flex-col overflow-hidden",
        onClick && !disabled && "cursor-pointer",
        disabled && "opacity-40 saturate-50",
        className,
      )}
      style={{
        borderColor: selected ? color : undefined,
        boxShadow: selected
          ? `0 0 0 1px ${color}, 0 12px 40px -18px ${color}`
          : undefined,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: rarityGradient(color) }}
      />

      <div
        className={cn(
          "relative flex items-center justify-center",
          size === "sm" ? "h-[86px] px-3 pt-3" : "h-[118px] px-4 pt-4",
        )}
      >
        <div className="h-full w-full transition-transform duration-500 ease-premium group-hover:scale-[1.06]">
          <SkinImage
            imageUrl={skin.image_url}
            art={skin.art}
            label={skin.market_name}
          />
        </div>
        {badge && <div className="absolute left-3 top-3">{badge}</div>}
      </div>

      <div
        className={cn(
          "relative flex flex-1 flex-col",
          size === "sm" ? "gap-1 px-3 pb-3 pt-2" : "gap-1.5 px-4 pb-4 pt-2.5",
        )}
      >
        <p className="truncate text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {skin.weapon}
        </p>
        <p
          className={cn(
            "truncate font-semibold text-white",
            size === "sm" ? "text-[13px]" : "text-[14.5px]",
          )}
        >
          {skin.finish}
        </p>

        {meta}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <RarityTag rarity={skin.rarity} />
          <span className="shrink-0 text-[13px] font-bold tabular-nums text-white">
            {formatMinor(value)}
          </span>
        </div>

        {footer && <div className="pt-2.5">{footer}</div>}
      </div>

      <RarityBar color={color} />
    </motion.div>
  );
}

export const ItemCard = memo(ItemCardBase);
