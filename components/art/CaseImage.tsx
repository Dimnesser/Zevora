"use client";

import { memo, useState } from "react";
import { CaseArt, type CaseArtSpec } from "@/components/art/CaseArt";
import { cn } from "@/lib/utils";

/** Case artwork: uploaded image when set, generated crate otherwise. */
function CaseImageBase({
  imageUrl,
  art,
  label,
  className,
  tilt = true,
}: {
  imageUrl?: string | null;
  art: CaseArtSpec;
  label?: string;
  className?: string;
  tilt?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return <CaseArt art={art} label={label} className={className} tilt={tilt} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={label ?? "Кейс"}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("h-full w-full object-contain", className)}
      style={{ filter: `drop-shadow(0 16px 28px ${art.color_a}40)` }}
    />
  );
}

export const CaseImage = memo(CaseImageBase);
