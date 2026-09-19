"use client";

import { motion } from "framer-motion";
import { Backpack, Coins, RotateCw } from "lucide-react";
import type { InventoryItem } from "@/types";
import { getSkin } from "@/data/skins";
import { RARITY } from "@/lib/rarity";
import { SkinArt } from "@/components/art/SkinArt";
import { RarityTag } from "@/components/items/RarityTag";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/Button";

interface DropRevealProps {
  items: InventoryItem[];
  onKeep: () => void;
  onSell: () => void;
  onAgain: () => void;
  againLabel: string;
  canAfford: boolean;
}

/**
 * Win screen. A single drop gets the full hero treatment; a multi-open
 * switches to a compact grid so nothing overflows.
 */
export function DropReveal({
  items,
  onKeep,
  onSell,
  onAgain,
  againLabel,
  canAfford,
}: DropRevealProps) {
  const total = items.reduce((s, i) => s + i.price, 0);
  const best = items.reduce(
    (a, b) => (b.price > a.price ? b : a),
    items[0],
  );
  const bestRarity = RARITY[getSkin(best.skinId).rarity];
  const single = items.length === 1;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="relative"
    >
      {/* rarity burst */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[86px] h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[70px]"
        style={{ background: bestRarity.color }}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 0.4, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />

      {/* rays */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[86px] h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 opacity-[0.1]"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, ${bestRarity.color} 8deg, transparent 16deg, transparent 45deg, ${bestRarity.color} 53deg, transparent 61deg, transparent 90deg, ${bestRarity.color} 98deg, transparent 106deg, transparent 135deg, ${bestRarity.color} 143deg, transparent 151deg, transparent 180deg, ${bestRarity.color} 188deg, transparent 196deg, transparent 225deg, ${bestRarity.color} 233deg, transparent 241deg, transparent 270deg, ${bestRarity.color} 278deg, transparent 286deg, transparent 315deg, ${bestRarity.color} 323deg, transparent 331deg)`,
          maskImage: "radial-gradient(circle, #000 20%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(circle, #000 20%, transparent 70%)",
        }}
        initial={{ rotate: 0, opacity: 0 }}
        animate={{ rotate: 45, opacity: 0.1 }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative">
        {single ? (
          <SingleDrop item={items[0]} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map((item, i) => {
              const skin = getSkin(item.skinId);
              const rarity = RARITY[skin.rarity];
              return (
                <motion.div
                  key={item.uid}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * i, duration: 0.4 }}
                  className="relative overflow-hidden rounded-2xl border p-3 text-center"
                  style={{
                    borderColor: `${rarity.color}55`,
                    background: rarity.gradient,
                  }}
                >
                  <div className="h-16">
                    <SkinArt skin={skin} />
                  </div>
                  <p className="mt-2 truncate text-[11px] text-slate-400">
                    {skin.weapon}
                  </p>
                  <p
                    className="truncate text-[13px] font-semibold"
                    style={{ color: rarity.color }}
                  >
                    {skin.name}
                  </p>
                  <p className="mt-1 text-[13px] font-bold tabular-nums text-white">
                    {formatMoney(item.price)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: single ? 0.35 : 0.45, duration: 0.4 }}
          className="mt-7"
        >
          {!single && (
            <p className="mb-4 text-center text-sm text-slate-400">
              Всего выпало на{" "}
              <span className="font-bold text-white">{formatMoney(total)}</span>
            </p>
          )}

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button
              size="lg"
              fullWidth
              onClick={onKeep}
              iconLeft={<Backpack size={16} />}
            >
              Забрать{single ? "" : ` (${items.length})`}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              fullWidth
              onClick={onSell}
              iconLeft={<Coins size={16} />}
            >
              Продать за {formatMoney(total)}
            </Button>
          </div>

          <Button
            size="lg"
            variant="ghost"
            fullWidth
            className="mt-2.5"
            onClick={onAgain}
            disabled={!canAfford}
            iconLeft={<RotateCw size={15} />}
          >
            {canAfford ? againLabel : "Недостаточно средств"}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}

function SingleDrop({ item }: { item: InventoryItem }) {
  const skin = getSkin(item.skinId);
  const rarity = RARITY[skin.rarity];

  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0, rotateY: -20 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="h-32 w-full max-w-sm sm:h-40"
      >
        <SkinArt skin={skin} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.4 }}
        className="mt-4 flex flex-col items-center gap-2.5"
      >
        <RarityTag rarity={skin.rarity} />
        <p className="text-[13px] uppercase tracking-wider text-slate-500">
          {skin.weapon}
        </p>
        <h3
          className="font-display text-2xl font-bold sm:text-3xl"
          style={{ color: rarity.color, textShadow: `0 0 34px ${rarity.glow}` }}
        >
          {skin.name}
        </h3>
        <p className="text-[13px] text-slate-500">
          {item.wear} · float {item.float.toFixed(4)}
          {item.counter && (
            <span className="ml-2 font-semibold text-gold-300">Counter</span>
          )}
        </p>
        <p className="mt-1 font-display text-2xl font-bold tabular-nums text-white">
          {formatMoney(item.price)}
        </p>
      </motion.div>
    </div>
  );
}
