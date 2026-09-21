"use client";

import { motion } from "framer-motion";
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
  const spinning = state === "spinning";
  // Idle parks the needle at twelve o'clock; every other state holds the
  // angle the outcome landed on.
  const angle = state === "idle" ? 0 : rotation;

  const arc = CIRC * Math.max(0, Math.min(1, chance));
  const accent =
    state === "win" ? "#2FD98A" : state === "lose" ? "#FF4D5E" : "#6E71FF";

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
          opacity: spinning ? [0.25, 0.5, 0.25] : state === "idle" ? 0.2 : 0.55,
        }}
        transition={{
          duration: spinning ? 1.4 : 0.5,
          repeat: spinning ? Infinity : 0,
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

      </svg>

      {/*
        The needle rotates as an HTML layer rather than as an SVG group.
        Framer Motion animates `rotate` on a <g> without ever committing a
        transform — the value ran, the completion callback fired on time,
        and the needle never moved, which is exactly what "анимация не
        работает" looked like. A div covering the dial has its origin at
        its own centre by definition, so the same geometry rotates
        correctly with nothing to configure.
      */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        animate={{ rotate: angle }}
        transition={
          spinning
            ? { duration: durationMs / 1000, ease: [0.16, 0.86, 0.19, 1] }
            : { duration: 0 }
        }
        onAnimationComplete={() => {
          // The instant reset back to idle completes too; only a spin counts.
          if (spinning) onSettled();
        }}
      >
        <svg viewBox="0 0 240 240" className="h-full w-full">
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
        </svg>
      </motion.div>

      {/* The hub caps the needle's base, so it is drawn over it. */}
      <svg
        aria-hidden
        viewBox="0 0 240 240"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
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
