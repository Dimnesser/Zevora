"use client";

import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useState } from "react";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export type DialState = "idle" | "spinning" | "win" | "lose";

interface UpgradeDialProps {
  /** 0..1 */
  chance: number;
  state: DialState;
  /** Final needle rotation in degrees, including full spins. */
  rotation: number;
  durationMs: number;
  onSettled: () => void;
  size?: number;
}

const R = 100;
const CIRC = 2 * Math.PI * R;

/**
 * The upgrade dial. The green arc is the real win probability, so the
 * needle landing inside it is exactly what determines the outcome.
 */
export function UpgradeDial({
  chance,
  state,
  rotation,
  durationMs,
  onSettled,
  size = 280,
}: UpgradeDialProps) {
  const controls = useAnimationControls();
  const [flash, setFlash] = useState<"none" | "win" | "lose">("none");

  useEffect(() => {
    if (state !== "spinning") return;
    setFlash("none");
    controls.set({ rotate: 0 });
    const run = controls.start({
      rotate: rotation,
      transition: { duration: durationMs / 1000, ease: [0.16, 0.86, 0.19, 1] },
    });
    let cancelled = false;
    void run.then(() => {
      if (!cancelled) onSettled();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, rotation, durationMs, controls]);

  useEffect(() => {
    if (state === "win") setFlash("win");
    else if (state === "lose") setFlash("lose");
    else if (state === "idle") {
      setFlash("none");
      controls.set({ rotate: 0 });
    }
  }, [state, controls]);

  const arc = CIRC * Math.max(0, Math.min(1, chance));
  const accent =
    flash === "win" ? "#2FD98A" : flash === "lose" ? "#FF4D5E" : "#6E71FF";

  return (
    <div
      className="relative mx-auto"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Шанс успеха ${formatPercent(chance)}`}
    >
      {/* ambient glow */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-4 rounded-full blur-[46px]"
        style={{ background: accent }}
        animate={{
          opacity:
            state === "spinning" ? [0.25, 0.5, 0.25] : flash !== "none" ? 0.55 : 0.2,
        }}
        transition={{
          duration: state === "spinning" ? 1.4 : 0.5,
          repeat: state === "spinning" ? Infinity : 0,
        }}
      />

      <svg viewBox="0 0 240 240" className="relative h-full w-full">
        <defs>
          <linearGradient id="dial-win" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2FD98A" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
          <linearGradient id="dial-lose" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#252B3F" />
            <stop offset="100%" stopColor="#151A2A" />
          </linearGradient>
        </defs>

        {/* track (the losing region) */}
        <circle
          cx="120"
          cy="120"
          r={R}
          fill="none"
          stroke="url(#dial-lose)"
          strokeWidth="16"
        />

        {/* win arc, starting at 12 o'clock */}
        <circle
          cx="120"
          cy="120"
          r={R}
          fill="none"
          stroke="url(#dial-win)"
          strokeWidth="16"
          // A rounded cap on a zero-length arc would still paint a dot.
          strokeLinecap={arc > 0.5 ? "round" : "butt"}
          strokeDasharray={`${arc} ${CIRC - arc}`}
          transform="rotate(-90 120 120)"
          style={{
            transition: "stroke-dasharray .45s cubic-bezier(.22,1,.36,1)",
            filter: "drop-shadow(0 0 10px rgba(47,217,138,.65))",
          }}
        />

        {/* tick marks */}
        {Array.from({ length: 60 }).map((_, i) => {
          const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
          const inner = i % 5 === 0 ? 80 : 85;
          return (
            <line
              key={i}
              x1={120 + Math.cos(a) * inner}
              y1={120 + Math.sin(a) * inner}
              x2={120 + Math.cos(a) * 88}
              y2={120 + Math.sin(a) * 88}
              stroke="#ffffff"
              strokeOpacity={i % 5 === 0 ? 0.22 : 0.09}
              strokeWidth={i % 5 === 0 ? 1.6 : 1}
            />
          );
        })}

        {/* needle */}
        <motion.g animate={controls} style={{ originX: "120px", originY: "120px" }}>
          <line
            x1="120"
            y1="120"
            x2="120"
            y2="34"
            stroke={accent}
            strokeWidth="3.5"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${accent})` }}
          />
          <polygon
            points="120,26 114,42 126,42"
            fill={accent}
            style={{ filter: `drop-shadow(0 0 8px ${accent})` }}
          />
        </motion.g>

        <circle cx="120" cy="120" r="9" fill="#0D1020" stroke={accent} strokeWidth="2" />
      </svg>

      {/* centre readout */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-[92px]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Шанс
        </span>
        <span
          className={cn(
            "font-display text-[34px] font-bold leading-none tabular-nums transition-colors",
          )}
          style={{ color: accent }}
        >
          {formatPercent(chance, 1)}
        </span>
      </div>
    </div>
  );
}
