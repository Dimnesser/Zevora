"use client";

import { memo, useId } from "react";
import type { CaseDefinition } from "@/types";
import { cn } from "@/lib/utils";
import { shade } from "@/components/art/SkinArt";

/** Emblem glyphs stamped on the case lid. */
const EMBLEMS: Record<CaseDefinition["emblem"], string> = {
  skull:
    "M32 8 C18 8 8 19 8 33 C8 42 13 48 18 52 L18 60 H46 L46 52 C51 48 56 42 56 33 C56 19 46 8 32 8 Z M22 32 a6 6 0 1 1 12 0 a6 6 0 1 1 -12 0 M38 32 a6 6 0 1 1 12 0 a6 6 0 1 1 -12 0 M27 50 h10 v8 h-10 Z",
  bolt: "M36 4 L12 36 H28 L24 60 L52 26 H34 Z",
  orbit:
    "M32 10 a22 22 0 1 0 0 44 a22 22 0 1 0 0 -44 M32 18 a14 14 0 1 1 0 28 a14 14 0 1 1 0 -28 M4 32 h10 M50 32 h10 M32 2 v8 M32 54 v8",
  crown: "M8 46 L14 16 L26 30 L32 10 L38 30 L50 16 L56 46 Z M8 50 H56 V58 H8 Z",
  prism: "M32 6 L58 52 H6 Z M32 6 V52 M32 26 L58 52 M32 26 L6 52",
  flame:
    "M32 4 C38 18 50 22 50 38 C50 50 42 60 32 60 C22 60 14 50 14 38 C14 28 22 26 24 16 C28 24 32 22 32 4 Z",
  eye: "M4 32 C14 16 50 16 60 32 C50 48 14 48 4 32 Z M32 22 a10 10 0 1 1 0 20 a10 10 0 1 1 0 -20",
  hex: "M32 4 L56 18 V46 L32 60 L8 46 V18 Z M32 18 L44 25 V39 L32 46 L20 39 V25 Z",
};

interface CaseArtProps {
  def: CaseDefinition;
  className?: string;
  /** Slight 3D lean; disable for flat contexts like the roulette. */
  tilt?: boolean;
}

/**
 * Case artwork: an isometric crate painted in the case palette with a
 * stamped emblem. Fully generated, so a new case needs no asset work.
 */
function CaseArtBase({ def, className, tilt = true }: CaseArtProps) {
  const raw = useId().replace(/:/g, "");
  const [c1, c2] = def.palette;

  const body = `body-${raw}`;
  const lid = `lid-${raw}`;
  const side = `side-${raw}`;
  const glow = `glow-${raw}`;
  const grid = `grid-${raw}`;

  return (
    <svg
      viewBox="0 0 200 180"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={def.name}
      style={{ filter: `drop-shadow(0 16px 28px ${c1}40)` }}
    >
      <defs>
        <linearGradient id={lid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={shade(c1, 0.35)} />
          <stop offset="100%" stopColor={c1} />
        </linearGradient>
        <linearGradient id={body} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shade(c2, 0.12)} />
          <stop offset="100%" stopColor={shade(c2, -0.45)} />
        </linearGradient>
        <linearGradient id={side} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={shade(c2, -0.3)} />
          <stop offset="100%" stopColor={shade(c2, -0.6)} />
        </linearGradient>
        <radialGradient id={glow} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={c1} stopOpacity="0.85" />
          <stop offset="100%" stopColor={c1} stopOpacity="0" />
        </radialGradient>
        <pattern id={grid} width="14" height="14" patternUnits="userSpaceOnUse">
          <path
            d="M14 0 H0 V14"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.08"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      <g transform={tilt ? "rotate(-4 100 96)" : undefined}>
        {/* ambient glow behind the crate */}
        <ellipse cx="100" cy="150" rx="74" ry="16" fill={`url(#${glow})`} opacity="0.55" />

        {/* front face */}
        <path d="M28 66 L100 92 L100 168 L28 138 Z" fill={`url(#${body})`} />
        <path d="M28 66 L100 92 L100 168 L28 138 Z" fill={`url(#${grid})`} />

        {/* right face */}
        <path d="M172 66 L100 92 L100 168 L172 138 Z" fill={`url(#${side})`} />
        <path d="M172 66 L100 92 L100 168 L172 138 Z" fill={`url(#${grid})`} />

        {/* lid */}
        <path d="M100 22 L172 60 L100 92 L28 60 Z" fill={`url(#${lid})`} />
        <path
          d="M100 22 L172 60 L100 92 L28 60 Z"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.28"
          strokeWidth="1.5"
        />

        {/* latch strip */}
        <path d="M28 96 L100 122 L100 136 L28 110 Z" fill={c1} opacity="0.55" />
        <path d="M172 96 L100 122 L100 136 L172 110 Z" fill={c1} opacity="0.3" />

        {/* emblem on the lid */}
        <g transform="translate(100 57) scale(0.62) translate(-32 -32)">
          <path
            d={EMBLEMS[def.emblem]}
            fill="#0B0D18"
            fillOpacity="0.55"
            stroke={shade(c1, 0.6)}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </g>

        {/* rim lights */}
        <path
          d="M28 66 L100 92 L172 66"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.35"
          strokeWidth="1.5"
        />
        <path
          d="M100 92 V168"
          stroke="#ffffff"
          strokeOpacity="0.14"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}

export const CaseArt = memo(CaseArtBase);
