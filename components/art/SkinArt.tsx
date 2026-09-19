"use client";

import { useId, memo } from "react";
import type { FinishPattern, Skin } from "@/types";
import { WEAPON_SHAPES, WEAPON_TILT } from "@/components/art/weaponPaths";
import { cn } from "@/lib/utils";

interface SkinArtProps {
  skin: Skin;
  className?: string;
  /** Adds a soft drop shadow in the skin's primary colour. */
  glow?: boolean;
}

/**
 * Renders a weapon entirely in SVG: the silhouette comes from
 * weaponPaths.ts, the finish is generated from the skin's palette and
 * pattern. No bitmap assets, so every skin is unique and scales cleanly.
 */
function SkinArtBase({ skin, className, glow = true }: SkinArtProps) {
  const uid = useId().replace(/:/g, "");
  const [c1, c2] = skin.palette;
  const shapes = WEAPON_SHAPES[skin.kind];
  const tilt = WEAPON_TILT[skin.kind] ?? 0;

  const finishId = `finish-${uid}`;
  const hardwareId = `hw-${uid}`;
  const clipId = `clip-${uid}`;
  const sheenId = `sheen-${uid}`;
  const roughId = `rough-${uid}`;

  return (
    <svg
      viewBox="0 0 400 180"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={`${skin.weapon} | ${skin.name}`}
      style={
        glow
          ? { filter: `drop-shadow(0 10px 22px ${c1}45)` }
          : undefined
      }
    >
      <defs>
        <FinishDef id={finishId} pattern={skin.pattern} c1={c1} c2={c2} />

        {/* Hardware: neutral dark metal, tinted slightly by the finish */}
        <linearGradient id={hardwareId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2A2F42" />
          <stop offset="100%" stopColor="#14161F" />
        </linearGradient>

        {/* Top-down sheen laid over everything */}
        <linearGradient id={sheenId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="42%" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="58%" stopColor="#000000" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.34" />
        </linearGradient>

        <filter id={roughId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="3"
            result="noise"
          />
          <feColorMatrix type="saturate" values="0" in="noise" result="mono" />
          <feComposite operator="in" in="mono" in2="SourceGraphic" />
        </filter>

        <clipPath id={clipId}>
          {shapes
            .filter((s) => !s.hardware)
            .map((s, i) => (
              <path key={i} d={s.d} />
            ))}
        </clipPath>
      </defs>

      <g transform={`rotate(${tilt} 200 90)`}>
        {/* Painted body */}
        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width="400" height="180" fill={`url(#${finishId})`} />
          <rect
            x="0"
            y="0"
            width="400"
            height="180"
            fill={`url(#${sheenId})`}
          />
          {/* micro grain */}
          <rect
            x="0"
            y="0"
            width="400"
            height="180"
            filter={`url(#${roughId})`}
            opacity="0.1"
          />
        </g>

        {/* Hardware on top */}
        {shapes
          .filter((s) => s.hardware)
          .map((s, i) => (
            <path
              key={`hw-${i}`}
              d={s.d}
              fill={`url(#${hardwareId})`}
              opacity="0.92"
            />
          ))}

        {/* Edge light */}
        {shapes
          .filter((s) => !s.hardware)
          .map((s, i) => (
            <path
              key={`edge-${i}`}
              d={s.d}
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.16"
              strokeWidth="1.2"
            />
          ))}
      </g>
    </svg>
  );
}

export const SkinArt = memo(SkinArtBase);

/* ────────────────────────── finishes ────────────────────────── */

function FinishDef({
  id,
  pattern,
  c1,
  c2,
}: {
  id: string;
  pattern: FinishPattern;
  c1: string;
  c2: string;
}) {
  switch (pattern) {
    case "fade":
      return (
        <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor={c2} />
          <stop offset="45%" stopColor={mix(c1, c2)} />
          <stop offset="100%" stopColor={c1} />
        </linearGradient>
      );

    case "doppler":
      return (
        <radialGradient id={id} cx="0.35" cy="0.4" r="0.9">
          <stop offset="0%" stopColor={c1} />
          <stop offset="35%" stopColor={mix(c1, c2, 0.5)} />
          <stop offset="70%" stopColor={c2} />
          <stop offset="100%" stopColor={shade(c2, -0.35)} />
        </radialGradient>
      );

    case "marble":
      return (
        <pattern
          id={id}
          width="400"
          height="180"
          patternUnits="userSpaceOnUse"
        >
          <rect width="400" height="180" fill={c2} />
          <g opacity="0.95">
            <path
              d="M-20 120 C60 40 140 160 230 70 C300 0 360 90 420 40 L420 180 L-20 180 Z"
              fill={c1}
              opacity="0.85"
            />
            <path
              d="M-20 150 C70 90 130 180 220 120 C300 70 350 140 420 100 L420 180 L-20 180 Z"
              fill={shade(c1, 0.25)}
              opacity="0.6"
            />
            <path
              d="M-20 60 C80 10 150 90 240 30 C310 -10 370 50 420 20"
              stroke={shade(c1, 0.5)}
              strokeWidth="6"
              fill="none"
              opacity="0.5"
            />
          </g>
        </pattern>
      );

    case "hydro":
      return (
        <pattern id={id} width="120" height="90" patternUnits="userSpaceOnUse">
          <rect width="120" height="90" fill={c2} />
          <path
            d="M-10 20 C20 4 40 36 70 20 C100 4 118 34 140 20"
            stroke={c1}
            strokeWidth="10"
            fill="none"
            opacity="0.85"
          />
          <path
            d="M-10 52 C24 34 44 68 74 52 C104 36 120 66 140 52"
            stroke={shade(c1, 0.3)}
            strokeWidth="6"
            fill="none"
            opacity="0.7"
          />
          <path
            d="M-10 80 C18 64 42 94 68 80 C96 64 118 92 140 80"
            stroke={shade(c1, -0.2)}
            strokeWidth="8"
            fill="none"
            opacity="0.6"
          />
        </pattern>
      );

    case "stripe":
      return (
        <pattern
          id={id}
          width="56"
          height="56"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(28)"
        >
          <rect width="56" height="56" fill={c2} />
          <rect width="22" height="56" fill={c1} />
          <rect x="30" width="6" height="56" fill={shade(c1, 0.45)} opacity="0.9" />
          <rect x="42" width="3" height="56" fill="#ffffff" opacity="0.25" />
        </pattern>
      );

    case "camo":
      return (
        <pattern id={id} width="110" height="110" patternUnits="userSpaceOnUse">
          <rect width="110" height="110" fill={c2} />
          <ellipse cx="26" cy="24" rx="26" ry="17" fill={c1} opacity="0.9" />
          <ellipse cx="82" cy="52" rx="24" ry="16" fill={c1} opacity="0.75" />
          <ellipse cx="44" cy="84" rx="28" ry="18" fill={shade(c1, 0.25)} opacity="0.8" />
          <ellipse cx="100" cy="98" rx="18" ry="12" fill={shade(c1, -0.25)} opacity="0.7" />
          <ellipse cx="8" cy="66" rx="16" ry="11" fill={shade(c1, 0.4)} opacity="0.6" />
        </pattern>
      );

    case "circuit":
      return (
        <pattern id={id} width="64" height="64" patternUnits="userSpaceOnUse">
          <rect width="64" height="64" fill={c2} />
          <g stroke={c1} strokeWidth="2.4" fill="none" opacity="0.95">
            <path d="M6 6 H34 V26 H58" />
            <path d="M6 34 H22 V58" />
            <path d="M38 38 H58" />
            <path d="M34 6 V-4" />
          </g>
          <g fill={shade(c1, 0.5)}>
            <circle cx="34" cy="26" r="3.4" />
            <circle cx="22" cy="34" r="3" />
            <circle cx="38" cy="38" r="2.6" />
            <circle cx="58" cy="26" r="2.6" />
          </g>
        </pattern>
      );

    case "carbon":
      // Fine weave — small tiles and low contrast so it reads as carbon
      // fibre rather than a checkerboard when scaled up.
      return (
        <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill={c2} />
          <path d="M0 0 H5 V5 H0 Z" fill={c1} opacity="0.34" />
          <path d="M5 5 H10 V10 H5 Z" fill={c1} opacity="0.34" />
          <path d="M0 5 H10 V5.6 H0 Z" fill={shade(c1, 0.5)} opacity="0.16" />
          <path d="M5 0 H5.6 V10 H5 Z" fill={shade(c1, -0.4)} opacity="0.3" />
        </pattern>
      );

    case "splatter":
      return (
        <pattern id={id} width="130" height="130" patternUnits="userSpaceOnUse">
          <rect width="130" height="130" fill={c2} />
          <g fill={c1}>
            <circle cx="30" cy="34" r="19" />
            <circle cx="56" cy="20" r="8" />
            <circle cx="14" cy="58" r="10" />
            <circle cx="92" cy="72" r="22" />
            <circle cx="118" cy="52" r="9" />
            <circle cx="70" cy="104" r="13" />
            <circle cx="40" cy="116" r="7" />
          </g>
          <g fill={shade(c1, 0.45)} opacity="0.85">
            <circle cx="96" cy="26" r="6" />
            <circle cx="24" cy="92" r="5" />
            <circle cx="112" cy="112" r="8" />
          </g>
        </pattern>
      );

    case "solid":
    default:
      return (
        <linearGradient id={id} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={shade(c1, 0.18)} />
          <stop offset="55%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      );
  }
}

/* ────────────────────────── colour helpers ────────────────────────── */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number) {
  const to = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Blend two hex colours. t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t = 0.5): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** Lighten (amount > 0) or darken (amount < 0) a hex colour. */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  if (amount >= 0) {
    return rgbToHex(
      r + (255 - r) * amount,
      g + (255 - g) * amount,
      b + (255 - b) * amount,
    );
  }
  const k = 1 + amount;
  return rgbToHex(r * k, g * k, b * k);
}
