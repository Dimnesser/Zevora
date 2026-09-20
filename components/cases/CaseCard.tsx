"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { memo, useRef, useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import type { CaseSummary } from "@/lib/client/api";
import { CaseImage } from "@/components/art/CaseImage";
import { formatMinor } from "@/lib/format";
import { Button } from "@/components/ui/Button";
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
  className?: string;
}

/** Case tile with a pointer-tracked 3D tilt, disabled on touch. */
function CaseCardBase({ kase, locked = false, className }: CaseCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const accent = kase.art.color_a;
  const preview = kase.top_skins ?? [];

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 7, y: px * 9 });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className={cn("perspective group relative", className)}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="glass preserve-3d relative flex h-full flex-col transition-[transform,border-color,box-shadow] duration-300 ease-premium group-hover:border-white/15"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          boxShadow:
            tilt.x || tilt.y
              ? `0 30px 70px -40px ${accent}, inset 0 1px 0 0 rgba(255,255,255,.07)`
              : undefined,
        }}
      >
        <div className="absolute left-3.5 top-3.5 z-20 flex flex-wrap gap-1.5">
          {kase.tags.slice(0, 2).map((t) => (
            <span
              key={t}
              className="rounded-md border border-white/10 bg-void/70 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-slate-300 backdrop-blur"
            >
              {TAG_LABEL[t] ?? t}
            </span>
          ))}
          {!kase.is_active && (
            <span className="rounded-md border border-danger/40 bg-danger/20 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-danger backdrop-blur">
              Выключен
            </span>
          )}
        </div>

        {locked && (
          <div className="absolute right-3.5 top-3.5 z-20 flex h-7 w-7 items-center justify-center rounded-lg border border-gold-400/40 bg-gold-400/15 text-gold-300">
            <Lock size={13} />
          </div>
        )}

        <div className="relative flex h-[178px] items-center justify-center overflow-hidden px-6 pt-6">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-6 top-2 h-32 rounded-full opacity-40 blur-3xl transition-opacity duration-500 group-hover:opacity-70"
            style={{ background: accent }}
          />
          <div className="relative h-full w-full transition-transform duration-500 ease-premium group-hover:-translate-y-1.5 group-hover:scale-[1.05]">
            <CaseImage
              imageUrl={kase.image_url}
              art={kase.art}
              label={kase.name}
            />
          </div>

          {/* The three priciest skins actually inside, fanned behind the
              case so the catalogue shows real items, not just a box. */}
          {preview.length > 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-1 z-10 flex items-end justify-center">
              {preview.map((skin, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={skin.image_url}
                  src={skin.image_url}
                  alt={skin.market_name}
                  loading="lazy"
                  decoding="async"
                  className="h-[62px] w-[82px] object-contain transition-transform duration-500 ease-premium group-hover:-translate-y-1"
                  style={{
                    transform: `rotate(${(i - 1) * 9}deg) translateY(${Math.abs(i - 1) * 5}px)`,
                    filter: `drop-shadow(0 6px 14px ${accent}55)`,
                    zIndex: 3 - Math.abs(i - 1),
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
          <h3 className="truncate text-[15px] font-bold text-white">{kase.name}</h3>
          <p className="mt-0.5 line-clamp-1 text-[12.5px] text-slate-400">
            {kase.description}
          </p>

          <div className="mt-3 flex items-center gap-1.5 text-[11.5px] text-slate-500">
            <Sparkles size={12} style={{ color: accent }} />
            <span className="truncate">
              {kase.item_count ?? 0} предм.
              {kase.best_price_minor ? (
                <>
                  {" · до "}
                  <span className="font-semibold" style={{ color: accent }}>
                    {formatMinor(kase.best_price_minor)}
                  </span>
                </>
              ) : null}
            </span>
          </div>

          <div className="mt-4">
            {locked ? (
              <Button variant="secondary" size="md" fullWidth disabled>
                Только для партнёров
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                fullWidth
                className="pointer-events-none"
                tabIndex={-1}
              >
                Открыть ·{" "}
                {kase.price_minor === 0 ? "Бесплатно" : formatMinor(kase.price_minor)}
              </Button>
            )}
          </div>
        </div>

        {!locked && (
          <Link
            href={`/cases/${kase.slug}`}
            className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zev-400"
            aria-label={`Открыть кейс ${kase.name}`}
          />
        )}
      </div>
    </motion.div>
  );
}

export const CaseCard = memo(CaseCardBase);
