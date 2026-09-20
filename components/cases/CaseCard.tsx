"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { memo, useRef, useState } from "react";
import { Lock } from "lucide-react";
import type { CaseSummary } from "@/lib/client/api";
import { CaseImage } from "@/components/art/CaseImage";
import { formatMinor } from "@/lib/format";
import { cn } from "@/lib/utils";

const TAG_LABEL: Record<string, string> = {
  popular: "Популярный",
  new: "Новый",
  cheap: "Дешёвый",
  premium: "Премиум",
  rare: "Редкий",
  partner: "Партнёрский",
};

interface CaseCardProps {
  kase: CaseSummary;
  /** Shows a lock and blocks the link — partner cases for regular users. */
  locked?: boolean;
  /** Staggers the entrance so a grid resolves in a wave, not all at once. */
  index?: number;
  className?: string;
}

/**
 * A case, presented as a physical object rather than a list row.
 *
 * Three things do the work. The tile tilts toward the pointer and its
 * contents sit on separate Z planes, so moving the mouse parallaxes the
 * case against its own light. A pool of the case's own colour tracks the
 * cursor, so the object looks lit from wherever you are looking. And the
 * top drops rise from under the case on hover — the information you
 * actually want before opening, without crowding the resting state.
 */
function CaseCardBase({ kase, locked = false, index = 0, className }: CaseCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [pointer, setPointer] = useState({ x: 50, y: 40 });
  const accent = kase.art.color_a;
  const preview = kase.top_skins ?? [];
  const free = kase.price_minor === 0;

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setTilt({ x: -(py - 0.5) * 8, y: (px - 0.5) * 11 });
    setPointer({ x: px * 100, y: py * 100 });
  };

  const rest = () => {
    setTilt({ x: 0, y: 0 });
    setPointer({ x: 50, y: 40 });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={rest}
      className={cn("perspective group relative", className)}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.5,
        delay: Math.min(index, 11) * 0.035,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div
        className={cn(
          "preserve-3d relative flex h-full flex-col overflow-hidden rounded-lg",
          "border border-line bg-slab/70 backdrop-blur-sm shadow-lip",
          "transition-[transform,border-color,box-shadow] duration-300 ease-premium",
          "group-hover:border-white/15",
        )}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          boxShadow:
            tilt.x || tilt.y
              ? `inset 0 1px 0 0 rgba(255,255,255,.07), 0 26px 56px -32px ${accent}, 0 18px 40px -26px rgba(0,0,0,.9)`
              : undefined,
        }}
      >
        {/* ── stage: the case, lit from wherever the pointer is ── */}
        <div className="relative h-[168px] overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 transition-[background] duration-200"
            style={{
              background: `radial-gradient(400px circle at ${pointer.x}% ${pointer.y}%, ${accent}24, transparent 62%), linear-gradient(180deg,#11141d 0%,#0b0e15 100%)`,
            }}
          />
          <div aria-hidden className="bg-tech-grid absolute inset-0 opacity-60" />
          {/* floor line, so the case reads as standing on something */}
          <div
            aria-hidden
            className="absolute inset-x-8 bottom-7 h-px opacity-70"
            style={{ background: `linear-gradient(90deg,transparent,${accent}66,transparent)` }}
          />

          <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-1">
            {kase.tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className="meta rounded-xs border border-white/[0.08] bg-black/55 px-1.5 py-[3px] text-slate-400 backdrop-blur-sm"
              >
                {TAG_LABEL[t] ?? t}
              </span>
            ))}
            {!kase.is_active && (
              <span className="meta rounded-xs border border-danger/40 bg-danger/15 px-1.5 py-[3px] text-danger">
                Выключен
              </span>
            )}
          </div>

          {locked && (
            <div className="absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded border border-gold-400/35 bg-gold-400/[0.12] text-gold-300">
              <Lock size={12} />
            </div>
          )}

          {/* the case itself, pushed forward so the tilt parallaxes it */}
          <div
            className="absolute inset-0 flex items-center justify-center px-7 pb-5 pt-5 transition-transform duration-500 ease-premium group-hover:scale-[1.05]"
            style={{ transform: "translateZ(34px)" }}
          >
            <CaseImage imageUrl={kase.image_url} art={kase.art} label={kase.name} />
          </div>

          {/* ── top drops: parked below the fold, rise in on hover ── */}
          {preview.length > 0 && (
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-center gap-0.5 px-3 pb-1.5",
                "translate-y-7 opacity-0 transition-[transform,opacity] duration-400 ease-premium",
                "group-hover:translate-y-0 group-hover:opacity-100",
              )}
              style={{ transform: "translateZ(18px)" }}
            >
              {preview.slice(0, 3).map((skin) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={skin.image_url}
                  src={skin.image_url}
                  alt={skin.market_name}
                  loading="lazy"
                  decoding="async"
                  className="h-11 w-[31%] object-contain"
                  style={{ filter: `drop-shadow(0 4px 12px ${accent}66)` }}
                />
              ))}
            </div>
          )}

          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slab/90 to-transparent"
          />
        </div>

        {/* ── data ── */}
        <div className="relative flex flex-1 flex-col px-3.5 pb-3.5 pt-2.5">
          <h3 className="truncate font-display text-[15px] font-semibold text-white">
            {kase.name}
          </h3>

          {/* Tight tracking here so both labels stay on one line at 390px,
              where the card is barely 170px wide. */}
          <div className="mt-1.5 flex items-baseline justify-between gap-2 whitespace-nowrap">
            <span className="meta text-[9px] tracking-[0.07em]">
              {kase.item_count ?? 0} предм.
            </span>
            {kase.best_price_minor ? (
              <span
                className="meta tnum text-[9px] tracking-[0.07em]"
                style={{ color: accent }}
              >
                до {formatMinor(kase.best_price_minor)}
              </span>
            ) : null}
          </div>

          {/* The price rail is the affordance — the whole tile is the link,
              so a nested button would only be a second tab stop. */}
          <div
            className={cn(
              "mt-3 flex h-10 items-center justify-between gap-2 rounded-md border px-3 shadow-lip",
              "transition-colors duration-300 ease-premium",
              locked
                ? "border-line bg-white/[0.02] text-slate-500"
                : "border-line bg-white/[0.035] group-hover:border-white/20 group-hover:bg-white/[0.06]",
            )}
          >
            {locked ? (
              <span className="text-[13px]">Только для партнёров</span>
            ) : (
              <>
                <span className="meta text-slate-500">Открыть</span>
                <span
                  className={cn(
                    "font-display text-[15px] font-bold tnum",
                    free ? "text-ice-400" : "text-gold-300",
                  )}
                >
                  {free ? "Бесплатно" : formatMinor(kase.price_minor)}
                </span>
              </>
            )}
          </div>
        </div>

        {!locked && (
          <Link
            href={`/cases/${kase.slug}`}
            className="absolute inset-0 z-30 rounded-lg focus-visible:outline-none focus-visible:shadow-focus"
            aria-label={`Открыть кейс ${kase.name} за ${free ? "бесплатно" : formatMinor(kase.price_minor)}`}
          />
        )}
      </div>
    </motion.div>
  );
}

export const CaseCard = memo(CaseCardBase);
