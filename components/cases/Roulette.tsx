"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import type { CaseItem, OpenResult } from "@/lib/client/api";
import type { DisplaySkin } from "@/lib/client/display";
import { SkinImage } from "@/components/art/SkinImage";
import { rarityGradient } from "@/lib/client/display";
import { playTick } from "@/lib/client/sound";
import { mulberry32 } from "@/lib/rng";

export const ITEM_W = 128;
export const ITEM_GAP = 10;
const STEP = ITEM_W + ITEM_GAP;

/** Strip length and the slot the winner occupies. */
const STRIP_LEN = 64;
const WINNER_INDEX = 56;

interface RouletteProps {
  /** The case's drop table, used to populate the filler cards. */
  items: CaseItem[];
  /**
   * The item the server already awarded. The animation only walks to it —
   * it never decides anything.
   */
  result: OpenResult["item"] | null;
  spinning: boolean;
  durationMs: number;
  onFinished: () => void;
  /** Lane index in a multi-open; desyncs parallel reels slightly. */
  lane?: number;
}

/**
 * Horizontal reel.
 *
 * Performance notes: the strip is a fixed 64 cards animated with a single
 * GPU-composited transform. Nothing is added or removed mid-flight and no
 * per-frame React state updates occur, so the cost is constant regardless
 * of spin length.
 */
export function Roulette({
  items,
  result,
  spinning,
  durationMs,
  onFinished,
  lane = 0,
}: RouletteProps) {
  const controls = useAnimationControls();
  const containerRef = useRef<HTMLDivElement>(null);
  const tickTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [settled, setSettled] = useState(false);

  // Idle strip is seeded so it stays stable across renders.
  const idleStrip = useMemo(
    () => buildStrip(items, null, lane),
    [items, lane],
  );
  const [strip, setStrip] = useState<DisplaySkin[]>(idleStrip);

  useEffect(() => {
    if (!spinning) {
      setStrip(idleStrip);
      setSettled(false);
      controls.set({ x: 0 });
    }
  }, [spinning, idleStrip, controls]);

  useEffect(() => {
    if (!spinning || !result) return;

    const winner: DisplaySkin = {
      market_name: result.market_name,
      weapon: result.weapon,
      finish: result.finish,
      price_minor: result.price_minor,
      image_url: result.image_url,
      rarity: result.rarity,
      art: result.art,
    };

    setStrip(buildStrip(items, winner, lane));
    setSettled(false);

    const width = containerRef.current?.offsetWidth ?? 900;
    // Land anywhere within the middle 64% of the winning card so two
    // opens never look pixel-identical.
    const jitter = (Math.random() - 0.5) * ITEM_W * 0.64;
    const offset = WINNER_INDEX * STEP + ITEM_W / 2 - width / 2 + jitter;
    const seconds = durationMs / 1000;

    controls.set({ x: 0 });
    const run = controls.start({
      x: -offset,
      transition: { duration: seconds, ease: [0.08, 0.72, 0.12, 1] },
    });

    // Ticks are scheduled up front along the same easing curve the reel
    // follows, so the sound tracks the visible deceleration.
    tickTimers.current.forEach(clearTimeout);
    tickTimers.current = [];
    const cardsPassed = Math.floor(offset / STEP);
    for (let i = 1; i <= cardsPassed; i++) {
      const progress = i / cardsPassed;
      const t = inverseEase(progress) * durationMs;
      if (t > 40) {
        tickTimers.current.push(setTimeout(playTick, t));
      }
    }

    let cancelled = false;
    void run.then(() => {
      if (cancelled) return;
      setSettled(true);
      onFinished();
    });

    return () => {
      cancelled = true;
      tickTimers.current.forEach(clearTimeout);
      tickTimers.current = [];
    };
    // onFinished is stable; re-running on identity change would restart
    // the spin mid-flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, result, items, durationMs, controls, lane]);

  const markerColor = result?.rarity.color ?? "#6E71FF";

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-abyss/70 py-4"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-20 w-20 bg-gradient-to-r from-abyss to-transparent sm:w-28"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-20 w-20 bg-gradient-to-l from-abyss to-transparent sm:w-28"
      />

      {/* centre marker */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 z-30 w-px -translate-x-1/2"
        style={{
          background: `linear-gradient(180deg, transparent, ${markerColor}, transparent)`,
          boxShadow: `0 0 18px 2px ${markerColor}`,
        }}
      />
      <Pointer color={markerColor} position="top" />
      <Pointer color={markerColor} position="bottom" />

      <motion.div
        className="flex will-change-transform"
        style={{ gap: ITEM_GAP }}
        animate={controls}
        initial={{ x: 0 }}
      >
        {strip.map((skin, i) => {
          const isWinner = settled && i === WINNER_INDEX;
          const color = skin.rarity.color;
          return (
            <div
              key={i}
              className="relative shrink-0 overflow-hidden rounded-xl border transition-all duration-300"
              style={{
                width: ITEM_W,
                borderColor: isWinner ? color : "rgba(255,255,255,.07)",
                background: isWinner
                  ? `linear-gradient(180deg, ${color}33, transparent 70%)`
                  : rarityGradient(color),
                boxShadow: isWinner ? `0 0 32px -6px ${color}` : undefined,
              }}
            >
              <div className="h-[62px] px-2 pt-2">
                <SkinImage
                  imageUrl={skin.image_url}
                  art={skin.art}
                  label={skin.market_name}
                  glow={false}
                />
              </div>
              <p className="truncate px-2 pb-1 text-center text-[10px] font-medium text-slate-400">
                {skin.weapon}
              </p>
              <p
                className="truncate px-2 pb-2 text-center text-[10.5px] font-semibold"
                style={{ color }}
              >
                {skin.finish}
              </p>
              <span
                className="absolute inset-x-0 bottom-0 h-0.5"
                style={{ background: color }}
              />
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

function Pointer({
  color,
  position,
}: {
  color: string;
  position: "top" | "bottom";
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 ${
        position === "top" ? "top-0" : "bottom-0"
      }`}
      style={{
        width: 0,
        height: 0,
        borderLeft: "7px solid transparent",
        borderRight: "7px solid transparent",
        ...(position === "top"
          ? { borderTop: `9px solid ${color}` }
          : { borderBottom: `9px solid ${color}` }),
      }}
    />
  );
}

/**
 * Builds the reel.
 *
 * Filler cards are sampled from the case's own drop table, weighted, so
 * the strip looks like the case it belongs to. The winner — when the
 * server has named one — is placed at the landing slot.
 */
function buildStrip(
  items: CaseItem[],
  winner: DisplaySkin | null,
  seed: number,
): DisplaySkin[] {
  if (items.length === 0) return [];

  const pool = items.map((i) => ({
    weight: i.weight,
    skin: {
      market_name: i.market_name,
      weapon: i.weapon,
      finish: i.finish,
      price_minor: i.price_minor,
      image_url: i.image_url,
      rarity: i.rarity,
      art: i.art,
    } as DisplaySkin,
  }));

  const total = pool.reduce((s, p) => s + p.weight, 0);
  // A seeded generator for the idle strip keeps server and client markup
  // identical; the spinning strip uses Math.random for variety.
  const rnd = winner ? Math.random : mulberry32(seed * 7919 + items.length);

  const pick = (): DisplaySkin => {
    let ticket = rnd() * total;
    for (const entry of pool) {
      ticket -= entry.weight;
      if (ticket <= 0) return entry.skin;
    }
    return pool[pool.length - 1].skin;
  };

  const strip = Array.from({ length: STRIP_LEN }, pick);
  if (winner) strip[WINNER_INDEX] = winner;
  return strip;
}

/**
 * Inverts the reel's easing curve.
 *
 * Given how far along the strip we are, returns the fraction of the
 * animation's duration at which that point is reached — which is what
 * lets the ticks slow down with the reel.
 */
function inverseEase(distanceFraction: number): number {
  // cubic-bezier(.08,.72,.12,1) solved by bisection; 18 steps is well
  // under a millisecond of error at these durations.
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (bezier(mid) < distanceFraction) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function bezier(t: number): number {
  const p1 = 0.72;
  const p2 = 1;
  const u = 1 - t;
  return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
}
