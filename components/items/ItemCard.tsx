"use client";

import { motion } from "framer-motion";
import { memo, type ReactNode } from "react";
import type { InventoryItem, Skin } from "@/types";
import { getSkin } from "@/data/skins";
import { RARITY } from "@/lib/rarity";
import { SkinArt } from "@/components/art/SkinArt";
import { RarityBar, RarityTag } from "@/components/items/RarityTag";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ItemCardProps {
  /** Pass either an owned instance or a catalogue skin. */
  item?: InventoryItem;
  skin?: Skin;
  /** Overrides the price shown (e.g. the catalogue price). */
  price?: number;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  footer?: ReactNode;
  /** Extra line under the name, e.g. wear or drop chance. */
  meta?: ReactNode;
  className?: string;
  size?: "sm" | "md";
}

function ItemCardBase({
  item,
  skin: skinProp,
  price,
  selected,
  disabled,
  onClick,
  footer,
  meta,
  className,
  size = "md",
}: ItemCardProps) {
  const skin = skinProp ?? getSkin(item!.skinId);
  const rarity = RARITY[skin.rarity];
  const value = price ?? item?.price ?? skin.price;

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
        selected && "ring-2",
        className,
      )}
      style={{
        borderColor: selected ? rarity.color : undefined,
        boxShadow: selected
          ? `0 0 0 1px ${rarity.color}, 0 12px 40px -18px ${rarity.color}`
          : undefined,
        ["--tw-ring-color" as string]: rarity.color,
      }}
    >
      {/* rarity wash */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: rarity.gradient }}
      />

      <div
        className={cn(
          "relative flex items-center justify-center",
          size === "sm" ? "h-[86px] px-3 pt-3" : "h-[118px] px-4 pt-4",
        )}
      >
        <div className="h-full w-full transition-transform duration-500 ease-premium group-hover:scale-[1.06]">
          <SkinArt skin={skin} />
        </div>

        {item?.counter && (
          <span className="absolute left-3 top-3 rounded-md border border-gold-400/40 bg-gold-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-300">
            Counter
          </span>
        )}
        {item?.status === "withdrawing" && (
          <span className="absolute right-3 top-3 rounded-md border border-aqua-400/40 bg-aqua-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-aqua-300">
            Вывод
          </span>
        )}
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
          {skin.name}
        </p>

        {meta ?? (
          item && (
            <p className="truncate text-[11.5px] text-slate-500">
              {item.wear} · {item.float.toFixed(3)}
            </p>
          )
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <RarityTag rarity={skin.rarity} compact />
          <span className="text-[13px] font-bold tabular-nums text-white">
            {formatMoney(value)}
          </span>
        </div>

        {footer && <div className="pt-2.5">{footer}</div>}
      </div>

      <RarityBar rarity={skin.rarity} />
    </motion.div>
  );
}

export const ItemCard = memo(ItemCardBase);
