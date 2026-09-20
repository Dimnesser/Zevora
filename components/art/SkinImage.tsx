"use client";

import { memo, useState } from "react";
import type { ArtSpec } from "@/lib/client/api";
import { SkinArt } from "@/components/art/SkinArt";
import { cn } from "@/lib/utils";

interface SkinImageProps {
  /** `skins.image_url`: the Valve render, or a local cache path. */
  imageUrl?: string | null;
  art: ArtSpec;
  label?: string;
  className?: string;
  glow?: boolean;
}

/**
 * Renders a skin.
 *
 * The real Valve render is what ships: every catalogue row carries an
 * `image_url`, filled by the seed snapshot and refreshed by
 * `npm run import:skins`. The procedural SVG renderer is a safety net
 * only — it appears if a row somehow has no URL, or if the browser
 * fails to load one — so a skin is never a blank box.
 */
function SkinImageBase({
  imageUrl,
  art,
  label,
  className,
  glow = true,
}: SkinImageProps) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return <SkinArt art={art} label={label} className={className} glow={glow} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={label ?? "Скин CS2"}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("h-full w-full object-contain", className)}
      style={
        glow ? { filter: `drop-shadow(0 10px 22px ${art.color_a}45)` } : undefined
      }
    />
  );
}

export const SkinImage = memo(SkinImageBase);
