"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Radio } from "lucide-react";
import Link from "next/link";
import { api, type Opening } from "@/lib/client/api";
import { SkinImage } from "@/components/art/SkinImage";
import { formatMinor, timeAgo } from "@/lib/format";

const POLL_MS = 8000;

/**
 * Live feed of real openings.
 *
 * Every entry comes from case_openings — there is no synthetic drop
 * generator, so an empty rail means nobody has opened anything yet.
 */
export function LiveDrops() {
  const [drops, setDrops] = useState<Opening[]>([]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const { drops: fresh } = await api.live(16);
        if (alive) setDrops(fresh);
      } catch {
        /* the rail is decorative; a failed poll just keeps the last list */
      }
    };

    void load();
    // Polling stands in for a socket; swapping in a WebSocket only
    // changes this effect.
    const timer = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  if (drops.length === 0) return null;

  return (
    <section className="relative border-y border-white/[0.06] bg-abyss/50">
      <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="hidden shrink-0 items-center gap-2 pr-4 sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Live
          </span>
        </div>

        <div className="mask-fade-x no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto">
          <AnimatePresence initial={false} mode="popLayout">
            {drops.map((drop) => (
              <motion.div
                key={drop.id}
                layout
                initial={{ opacity: 0, x: -30, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 340, damping: 30 }}
                className="shrink-0"
              >
                <Link
                  href={`/cases/${drop.case.slug}`}
                  className="group flex w-[218px] items-center gap-2.5 rounded-xl border bg-white/[0.03] px-2.5 py-2 transition hover:bg-white/[0.07]"
                  style={{ borderColor: `${drop.rarity.color}33` }}
                  title={`${drop.username} · ${drop.case.name} · ${timeAgo(drop.created_at)}`}
                >
                  <span
                    className="h-8 w-[72px] shrink-0 rounded-lg"
                    style={{ background: `${drop.rarity.color}14` }}
                  >
                    <SkinImage
                      imageUrl={drop.image_url}
                      art={drop.art}
                      label={drop.market_name}
                      glow={false}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-[11.5px] font-semibold"
                      style={{ color: drop.rarity.color }}
                    >
                      {drop.finish}
                    </span>
                    <span className="block truncate text-[10.5px] text-slate-500">
                      {drop.username} · {formatMinor(drop.value_minor)}
                    </span>
                  </span>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <Link
          href="/history"
          className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-slate-400 transition hover:text-white lg:flex"
        >
          <Radio size={12} />
          Все дропы
        </Link>
      </div>
    </section>
  );
}
