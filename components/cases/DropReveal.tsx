"use client";

import { motion } from "framer-motion";
import { Backpack, Coins, RotateCw, ShieldCheck } from "lucide-react";
import type { OpenResult } from "@/lib/client/api";
import { SkinImage } from "@/components/art/SkinImage";
import { RarityTag } from "@/components/items/RarityTag";
import { formatMinor } from "@/lib/format";
import { Button } from "@/components/ui/Button";

interface DropRevealProps {
  results: OpenResult[];
  onKeep: () => void;
  onSell: () => void;
  onAgain: () => void;
  againLabel: string;
  canAfford: boolean;
  selling?: boolean;
}

/**
 * Win screen. A single drop gets the hero treatment; a multi-open falls
 * back to a compact grid so nothing overflows.
 */
export function DropReveal({
  results,
  onKeep,
  onSell,
  onAgain,
  againLabel,
  canAfford,
  selling,
}: DropRevealProps) {
  const total = results.reduce((s, r) => s + r.item.price_minor, 0);
  const best = results.reduce(
    (a, b) => (b.item.price_minor > a.item.price_minor ? b : a),
    results[0],
  );
  const color = best.item.rarity.color;
  const single = results.length === 1;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="relative"
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[86px] h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[70px]"
        style={{ background: color }}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 0.4, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />

      <div className="relative">
        <p className="mb-4 text-center font-display text-lg font-bold text-white">
          🎉 Вы выиграли!
        </p>

        {single ? (
          <SingleDrop result={results[0]} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {results.map((r, i) => (
              <motion.div
                key={r.opening_id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i, duration: 0.4 }}
                className="relative overflow-hidden rounded-2xl border p-3 text-center"
                style={{
                  borderColor: `${r.item.rarity.color}55`,
                  background: `linear-gradient(180deg, ${r.item.rarity.color}2E, transparent 70%)`,
                }}
              >
                <div className="h-16">
                  <SkinImage
                    imageUrl={r.item.image_url}
                    art={r.item.art}
                    label={r.item.market_name}
                  />
                </div>
                <p className="mt-2 truncate text-[11px] text-slate-400">
                  {r.item.weapon}
                </p>
                <p
                  className="truncate text-[13px] font-semibold"
                  style={{ color: r.item.rarity.color }}
                >
                  {r.item.finish}
                </p>
                <p className="mt-1 text-[13px] font-bold tabular-nums text-white">
                  {formatMinor(r.item.price_minor)}
                </p>
              </motion.div>
            ))}
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
              <span className="font-bold text-white">{formatMinor(total)}</span>
            </p>
          )}

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button
              size="lg"
              fullWidth
              onClick={onKeep}
              iconLeft={<Backpack size={16} />}
            >
              Забрать{single ? "" : ` (${results.length})`}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              fullWidth
              loading={selling}
              onClick={onSell}
              iconLeft={<Coins size={16} />}
            >
              Продать за {formatMinor(total)}
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

function SingleDrop({ result }: { result: OpenResult }) {
  const { item, audit } = result;
  const color = item.rarity.color;

  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0, rotateY: -20 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="h-32 w-full max-w-sm sm:h-40"
      >
        <SkinImage
          imageUrl={item.image_url}
          art={item.art}
          label={item.market_name}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.4 }}
        className="mt-4 flex flex-col items-center gap-2.5"
      >
        <RarityTag rarity={item.rarity} />
        <p className="text-[13px] uppercase tracking-wider text-slate-500">
          {item.weapon}
        </p>
        <h3
          className="font-display text-2xl font-bold sm:text-3xl"
          style={{ color, textShadow: `0 0 34px ${color}8C` }}
        >
          {item.finish}
        </h3>
        <p className="text-[13px] text-slate-500">
          {item.wear} · float {item.float_value.toFixed(4)}
          {item.stattrak && (
            <span className="ml-2 font-semibold text-gold-300">StatTrak™</span>
          )}
        </p>
        <p className="mt-1 font-display text-2xl font-bold tabular-nums text-white">
          {formatMinor(item.price_minor)}
        </p>

        {/* Audit trail: the ticket drawn and the pool it came from. */}
        <p
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] px-2.5 py-1 font-mono text-[10.5px] text-slate-600"
          title="Выигрышный билет и общий вес кейса — по ним можно перепроверить розыгрыш"
        >
          <ShieldCheck size={11} />
          roll {audit.roll.toLocaleString("ru-RU")} /{" "}
          {audit.total_weight.toLocaleString("ru-RU")}
        </p>
      </motion.div>
    </div>
  );
}
