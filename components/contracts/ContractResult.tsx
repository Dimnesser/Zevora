"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { ContractResult as Result, InventoryItem } from "@/lib/client/api";
import { SkinImage } from "@/components/art/SkinImage";
import { Button } from "@/components/ui/Button";
import { formatMinor } from "@/lib/format";

/** How long the machine holds before it opens. */
const HOLD_MS = 1100;

/**
 * The reveal.
 *
 * The ten inputs collapse toward the middle, the machine holds for a beat,
 * and the result comes up out of the collapse. The hold matters: a result
 * that appears the instant you click reads as a number changing, not as
 * something you won.
 */
export function ContractReveal({
  result,
  inputs,
  won,
  color,
  onAgain,
  onSell,
  selling,
}: {
  result: Result;
  /** The consumed items, kept for the collapse animation. */
  inputs: InventoryItem[];
  /** The produced item, once the inventory refresh has found it. */
  won: InventoryItem | null;
  /** The output rarity's colour, which the board already knows. */
  color: string;
  onAgain: () => void;
  onSell: () => void;
  selling?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const profit = result.won.price_minor - result.stake_minor;

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), HOLD_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative flex min-h-[440px] flex-col items-center justify-center">
      {/* ── the inputs falling in ── */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {inputs.map((item, i) => {
          const angle = (i / Math.max(1, inputs.length)) * Math.PI * 2;
          return (
            <motion.div
              key={item.id}
              className="absolute h-14 w-14"
              initial={{
                x: Math.cos(angle) * 190,
                y: Math.sin(angle) * 120,
                opacity: 0.9,
              }}
              animate={{ x: 0, y: 0, opacity: 0, scale: 0.35 }}
              transition={{ duration: 1, delay: i * 0.04, ease: [0.5, 0, 0.75, 0] }}
            >
              <SkinImage imageUrl={item.image_url} art={item.art} label={item.market_name} />
            </motion.div>
          );
        })}
      </div>

      {!open ? (
        <div className="relative flex flex-col items-center gap-4">
          <motion.span
            className="h-20 w-20 rounded-full border"
            style={{ borderColor: `${color}80` }}
            animate={{ scale: [1, 0.82, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          />
          <p className="meta text-slate-400">Контракт исполняется</p>
        </div>
      ) : (
        <motion.div
          className="relative flex w-full flex-col items-center"
          initial={{ opacity: 0, scale: 0.9, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-10 h-52 w-52 -translate-x-1/2 rounded-full opacity-40 blur-[70px]"
            style={{ background: color }}
          />

          <span className="meta text-slate-500">Контракт #{result.contract_id}</span>

          {/* Fixed frame: the artwork arrives with the inventory refresh a
              moment later, and the layout must not jump when it does. */}
          <div className="relative mt-3 flex h-[150px] w-[260px] items-center justify-center">
            <span
              aria-hidden
              className="absolute inset-0"
              style={{ background: `radial-gradient(closest-side, ${color}24, transparent 72%)` }}
            />
            {won ? (
              <SkinImage imageUrl={won.image_url} art={won.art} label={won.market_name} />
            ) : (
              <span className="skeleton h-[70%] w-[80%] rounded-sm" />
            )}
          </div>

          <span
            aria-hidden
            className="h-px w-40"
            style={{ background: `linear-gradient(90deg,transparent,${color},transparent)` }}
          />

          <h3 className="mt-3 text-center font-display text-[24px] font-bold text-white">
            {result.won.market_name}
          </h3>
          <p className="meta mt-1.5 text-slate-500">
            {result.won.wear} · float {result.won.float_value.toFixed(4)}
            {result.won.stattrak && " · StatTrak™"}
          </p>

          <p className="mt-3 font-display text-[28px] font-bold tnum" style={{ color }}>
            {formatMinor(result.won.price_minor)}
          </p>
          <p className="meta mt-1" style={{ color: profit >= 0 ? "#2FD98A" : "#FF3B6B" }}>
            {profit >= 0 ? "+" : "−"}
            {formatMinor(Math.abs(profit))} к вложенному
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <Button variant="accent" onClick={onAgain}>
              Собрать ещё
            </Button>
            <Button variant="gold" loading={selling} onClick={onSell}>
              Продать за {formatMinor(result.won.price_minor)}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
