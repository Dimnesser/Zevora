"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { memo, useRef, useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import type { CaseDefinition } from "@/types";
import { topDrop } from "@/lib/roll";
import { RARITY } from "@/lib/rarity";
import { CaseArt } from "@/components/art/CaseArt";
import { SkinArt } from "@/components/art/SkinArt";
import { formatMoney } from "@/lib/format";
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
  def: CaseDefinition;
  /** Blocks opening and shows a lock — partner cases for regular users. */
  locked?: boolean;
  className?: string;
}

/**
 * Case tile with a subtle pointer-tracked 3D tilt. The tilt is applied to a
 * CSS transform only, so it costs nothing on mobile where it is disabled.
 */
function CaseCardBase({ def, locked = false, className }: CaseCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const best = topDrop(def);
  const bestRarity = RARITY[best.rarity];
  const [c1] = def.palette;

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
              ? `0 30px 70px -40px ${c1}, inset 0 1px 0 0 rgba(255,255,255,.07)`
              : undefined,
        }}
      >
        {/* tag row */}
        <div className="absolute left-3.5 top-3.5 z-20 flex flex-wrap gap-1.5">
          {def.tags.slice(0, 2).map((t) => (
            <span
              key={t}
              className="rounded-md border border-white/10 bg-void/70 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-slate-300 backdrop-blur"
            >
              {TAG_LABEL[t] ?? t}
            </span>
          ))}
        </div>

        {locked && (
          <div className="absolute right-3.5 top-3.5 z-20 flex h-7 w-7 items-center justify-center rounded-lg border border-gold-400/40 bg-gold-400/15 text-gold-300">
            <Lock size={13} />
          </div>
        )}

        {/* artwork stage */}
        <div className="relative flex h-[178px] items-center justify-center overflow-hidden px-6 pt-6">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-6 top-2 h-32 rounded-full opacity-40 blur-3xl transition-opacity duration-500 group-hover:opacity-70"
            style={{ background: c1 }}
          />
          <div className="relative h-full w-full transition-transform duration-500 ease-premium group-hover:-translate-y-1.5 group-hover:scale-[1.05]">
            <CaseArt def={def} />
          </div>

          {/* best drop preview, slides in on hover */}
          <div className="pointer-events-none absolute bottom-0 right-3 w-[112px] translate-y-3 opacity-0 transition-all duration-400 ease-premium group-hover:translate-y-0 group-hover:opacity-100">
            <div
              className="rounded-xl border bg-void/80 p-1.5 backdrop-blur"
              style={{ borderColor: `${bestRarity.color}55` }}
            >
              <div className="h-9">
                <SkinArt skin={best} glow={false} />
              </div>
              <p
                className="mt-0.5 truncate text-center text-[9px] font-semibold uppercase tracking-wider"
                style={{ color: bestRarity.color }}
              >
                {best.name}
              </p>
            </div>
          </div>
        </div>

        {/* body */}
        <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
          <h3 className="truncate text-[15px] font-bold text-white">{def.name}</h3>
          <p className="mt-0.5 line-clamp-1 text-[12.5px] text-slate-400">
            {def.subtitle}
          </p>

          <div className="mt-3 flex items-center gap-1.5 text-[11.5px] text-slate-500">
            <Sparkles size={12} style={{ color: bestRarity.color }} />
            <span className="truncate">
              До{" "}
              <span className="font-semibold" style={{ color: bestRarity.color }}>
                {formatMoney(best.price)}
              </span>
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2.5">
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
                Открыть · {def.price === 0 ? "Бесплатно" : formatMoney(def.price)}
              </Button>
            )}
          </div>
        </div>

        {/* whole-card link overlay keeps the markup simple and accessible */}
        {!locked && (
          <Link
            href={`/cases/${def.slug}`}
            className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zev-400"
            aria-label={`Открыть кейс ${def.name}`}
          />
        )}
      </div>
    </motion.div>
  );
}

export const CaseCard = memo(CaseCardBase);
