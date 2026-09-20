"use client";

import { memo, useState } from "react";
import type { ArtSpec } from "@/lib/client/api";
import { SkinArt } from "@/components/art/SkinArt";
import { cn } from "@/lib/utils";

interface SkinImageProps {
  /** Steam CDN URL, when the catalogue has one for this skin. */
  imageUrl?: string | null;
  art: ArtSpec;
  label?: string;
  className?: string;
  glow?: boolean;
}

/**
 * Renders a skin.
 *
 * Real Steam artwork is used whenever the skin has an image row. Until
 * `npm run skins:images` has filled those in — or if a URL 404s — the
 * procedural SVG renderer takes over, so a skin is never a blank box.
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
