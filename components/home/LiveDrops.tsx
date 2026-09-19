"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Radio } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { getSkin } from "@/data/skins";
import { RARITY } from "@/lib/rarity";
import { SkinArt } from "@/components/art/SkinArt";
import { formatMoney } from "@/lib/format";
import { subscribeLiveDrops } from "@/services/api";
import { uid } from "@/lib/utils";

/**
 * Live drop rail. Fed by services/api.subscribeLiveDrops, which is a mock
 * interval today and a WebSocket subscription once the backend lands.
 */
export function LiveDrops() {
  const drops = useStore((s) => s.liveDrops);
  const push = useStore((s) => s.pushLiveDrop);
  const hydrated = useHydrated();

  useEffect(() => {
    const unsubscribe = subscribeLiveDrops((d) => {
      push({
        id: uid("live"),
        username: d.username,
        avatarSeed: d.username,
        skinId: d.skinId,
        caseSlug: d.caseSlug,
        at: Date.now(),
      });
    });
    return unsubscribe;
  }, [push]);

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
            {(hydrated ? drops : drops.slice(0, 8)).slice(0, 14).map((drop) => {
              const skin = getSkin(drop.skinId);
              const rarity = RARITY[skin.rarity];
              return (
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
                    href={`/cases/${drop.caseSlug}`}
                    className="group flex w-[210px] items-center gap-2.5 rounded-xl border bg-white/[0.03] px-2.5 py-2 transition hover:bg-white/[0.07]"
                    style={{ borderColor: `${rarity.color}33` }}
                  >
                    <span
                      className="h-8 w-[72px] shrink-0 rounded-lg"
                      style={{ background: `${rarity.color}14` }}
                    >
                      <SkinArt skin={skin} glow={false} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate text-[11.5px] font-semibold"
                        style={{ color: rarity.color }}
                      >
                        {skin.name}
                      </span>
                      <span className="block truncate text-[10.5px] text-slate-500">
                        {drop.username} · {formatMoney(skin.price)}
                      </span>
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <Link
          href="/leaderboard"
          className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-slate-400 transition hover:text-white lg:flex"
        >
          <Radio size={12} />
          Все дропы
        </Link>
      </div>
    </section>
  );
}
