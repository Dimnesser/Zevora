"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import type { CaseDefinition } from "@/types";
import { getSkin } from "@/data/skins";
import { RARITY } from "@/lib/rarity";
import { SkinArt } from "@/components/art/SkinArt";
import { mulberry32 } from "@/lib/rng";
import { rollCase } from "@/lib/roll";
import { hashString } from "@/lib/utils";

export const ITEM_W = 128;
export const ITEM_GAP = 10;
const STEP = ITEM_W + ITEM_GAP;
/** Strip length and where the winning item sits inside it. */
const STRIP_LEN = 64;
const WINNER_INDEX = 56;

interface RouletteProps {
  def: CaseDefinition;
  /** The predetermined winner. Null keeps the strip idle. */
  winnerSkinId: string | null;
  spinning: boolean;
  durationMs: number;
  onFinished: () => void;
  /** Index in a multi-open, used to desync parallel strips slightly. */
  lane?: number;
}

/**
 * Horizontal roulette. The winner is decided before the animation starts —
 * the strip is then built so that item lands under the marker, which is how
 * a server-authoritative roll will behave once the backend exists.
 */
export function Roulette({
  def,
  winnerSkinId,
  spinning,
  durationMs,
  onFinished,
  lane = 0,
}: RouletteProps) {
  const controls = useAnimationControls();
  const containerRef = useRef<HTMLDivElement>(null);
  const [strip, setStrip] = useState<string[]>(() => idleStrip(def, lane));
  const [settled, setSettled] = useState(false);

  // Rebuild the idle strip whenever the case changes.
  useEffect(() => {
    if (!spinning) {
      setStrip(idleStrip(def, lane));
      setSettled(false);
      controls.set({ x: 0 });
    }
  }, [def, lane, spinning, controls]);

  useEffect(() => {
    if (!spinning || !winnerSkinId) return;

    const next = buildStrip(def, winnerSkinId);
    setStrip(next);
    setSettled(false);

    const width = containerRef.current?.offsetWidth ?? 900;
    // Land the marker anywhere in the middle 64% of the winning tile, so
    // two opens never look pixel-identical.
    const jitter = (Math.random() - 0.5) * ITEM_W * 0.64;
    const offset = WINNER_INDEX * STEP + ITEM_W / 2 - width / 2 + jitter;

    controls.set({ x: 0 });
    const run = controls.start({
      x: -offset,
      transition: {
        duration: durationMs / 1000,
        // Long, decelerating glide — fast out of the gate, slow at the end.
        ease: [0.08, 0.72, 0.12, 1],
      },
    });

    let cancelled = false;
    void run.then(() => {
      if (cancelled) return;
      setSettled(true);
      onFinished();
    });
    return () => {
      cancelled = true;
    };
    // onFinished is stable in practice; re-running on identity change would
    // restart the spin mid-flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, winnerSkinId, def, durationMs, controls]);

  const markerColor = winnerSkinId
    ? RARITY[getSkin(winnerSkinId).rarity].color
    : "#6E71FF";

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-abyss/70 py-4"
    >
      {/* edge fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-20 w-20 bg-gradient-to-r from-abyss to-transparent sm:w-28"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-20 w-20 bg-gradient-to-l from-abyss to-transparent sm:w-28"
      />

      {/* marker */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 z-30 w-px -translate-x-1/2"
        style={{
          background: `linear-gradient(180deg, transparent, ${markerColor}, transparent)`,
          boxShadow: `0 0 18px 2px ${markerColor}`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: "7px solid transparent",
          borderRight: "7px solid transparent",
          borderTop: `9px solid ${markerColor}`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 z-30 -translate-x-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: "7px solid transparent",
          borderRight: "7px solid transparent",
          borderBottom: `9px solid ${markerColor}`,
        }}
      />

      <motion.div
        className="flex will-change-transform"
        style={{ gap: ITEM_GAP }}
        animate={controls}
        initial={{ x: 0 }}
      >
        {strip.map((skinId, i) => {
          const skin = getSkin(skinId);
          const rarity = RARITY[skin.rarity];
          const isWinner = settled && i === WINNER_INDEX;
          return (
            <div
              key={`${skinId}-${i}`}
              className="relative shrink-0 overflow-hidden rounded-xl border transition-all duration-300"
              style={{
                width: ITEM_W,
                borderColor: isWinner ? rarity.color : "rgba(255,255,255,.07)",
                background: isWinner
                  ? `linear-gradient(180deg, ${rarity.color}33, transparent 70%)`
                  : rarity.gradient,
                boxShadow: isWinner ? `0 0 32px -6px ${rarity.color}` : undefined,
              }}
            >
              <div className="h-[62px] px-2 pt-2">
                <SkinArt skin={skin} glow={false} />
              </div>
              <p className="truncate px-2 pb-1 text-center text-[10px] font-medium text-slate-400">
                {skin.weapon}
              </p>
              <p
                className="truncate px-2 pb-2 text-center text-[10.5px] font-semibold"
                style={{ color: rarity.color }}
              >
                {skin.name}
              </p>
              <span
                className="absolute inset-x-0 bottom-0 h-0.5"
                style={{ background: rarity.color }}
              />
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

/** Deterministic strip for the pre-spin state (SSR-safe). */
function idleStrip(def: CaseDefinition, lane: number): string[] {
  const rnd = mulberry32(hashString(def.id + lane));
  return Array.from({ length: STRIP_LEN }, () => rollCase(def, rnd));
}

/** Random strip with the winner placed at the landing index. */
function buildStrip(def: CaseDefinition, winnerSkinId: string): string[] {
  const items = Array.from({ length: STRIP_LEN }, () => rollCase(def));
  items[WINNER_INDEX] = winnerSkinId;
  return items;
}

/** Keeps the roulette honest about what a case can contain. */
export function useStripPreview(def: CaseDefinition) {
  return useMemo(() => idleStrip(def, 0).slice(0, 12), [def]);
}
