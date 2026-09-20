"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, Medal, Trophy } from "lucide-react";
import { api } from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { Avatar } from "@/components/art/Avatar";
import { PartnerBadge } from "@/components/partners/PartnerBadge";
import { TIERS } from "@/data/partners";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMinor, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type Period = "today" | "week" | "month" | "all";

const PODIUM = [
  { color: "#F5B841", icon: Crown, label: "1 место" },
  { color: "#C9D2E3", icon: Trophy, label: "2 место" },
  { color: "#CD7F42", icon: Medal, label: "3 место" },
];

/** Ranking computed from real openings, not a seeded table. */
export function LeaderboardTable() {
  const [period, setPeriod] = useState<Period>("week");
  const { data, loading } = useResource(() => api.leaderboard(period), [period]);
  const rows = data?.rows ?? [];

  return (
    <>
      <Tabs
        items={[
          { id: "today", label: "Сегодня" },
          { id: "week", label: "За неделю" },
          { id: "month", label: "За месяц" },
          { id: "all", label: "За всё время" },
        ]}
        value={period}
        onChange={setPeriod}
        className="mb-6 w-fit"
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[196px]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Trophy size={22} />}
          title="Рейтинг пока пуст"
          description="Как только кто-нибудь откроет кейс за выбранный период, он появится здесь."
        />
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {rows.slice(0, 3).map((row, i) => {
              const meta = PODIUM[i];
              const Icon = meta.icon;
              const tierColor = row.partner_tier
                ? TIERS[row.partner_tier as keyof typeof TIERS].colors[0]
                : null;
              return (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  className={cn(
                    "glass-strong relative overflow-hidden p-5 text-center",
                    i === 0 && "sm:order-2",
                    i === 1 && "sm:order-1",
                    i === 2 && "sm:order-3",
                  )}
                  style={{ borderColor: `${meta.color}3A` }}
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full opacity-25 blur-[50px]"
                    style={{ background: meta.color }}
                  />
                  <span
                    className="relative mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{ background: `${meta.color}1F`, color: meta.color }}
                  >
                    <Icon size={17} />
                  </span>
                  <Avatar
                    seed={row.avatar_seed}
                    size={56}
                    ring={tierColor ?? meta.color}
                    className="relative"
                  />
                  <div className="relative mt-3 flex items-center justify-center gap-2">
                    <p className="truncate text-[15px] font-bold text-white">{row.username}</p>
                    {row.partner_tier && (
                      <PartnerBadge
                        tier={row.partner_tier as keyof typeof TIERS}
                        size="xs"
                        iconOnly
                      />
                    )}
                  </div>
                  <p className="relative mt-1 text-[12px] text-slate-500">{meta.label}</p>
                  <p
                    className="relative mt-3 text-xl font-bold tabular-nums"
                    style={{ color: meta.color }}
                  >
                    {formatMinor(row.won_minor)}
                  </p>
                  <p className="relative text-[11.5px] text-slate-500">выиграно</p>
                </motion.div>
              );
            })}
          </div>

          <div className="glass overflow-hidden">
            <div className="hidden grid-cols-[56px_minmax(0,1fr)_120px_120px_100px] gap-4 border-b border-white/[0.07] px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:grid">
              <span>#</span>
              <span>Игрок</span>
              <span className="text-right">Потрачено</span>
              <span className="text-right">Выиграно</span>
              <span className="text-right">Открытий</span>
            </div>

            <ul className="divide-y divide-white/[0.04]">
              {rows.map((row, i) => {
                const tierColor = row.partner_tier
                  ? TIERS[row.partner_tier as keyof typeof TIERS].colors[0]
                  : null;
                return (
                  <motion.li
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: Math.min(i, 12) * 0.025 }}
                    className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03] sm:grid-cols-[56px_minmax(0,1fr)_120px_120px_100px] sm:gap-4 sm:px-5"
                    style={
                      tierColor
                        ? { background: `linear-gradient(90deg, ${tierColor}0E, transparent 40%)` }
                        : undefined
                    }
                  >
                    <span
                      className="text-[13px] font-bold tabular-nums"
                      style={{ color: PODIUM[i]?.color ?? "#5A6480" }}
                    >
                      {row.rank}
                    </span>

                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar seed={row.avatar_seed} size={34} ring={tierColor ?? undefined} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className="truncate text-[13.5px] font-semibold"
                            style={{ color: tierColor ?? "#fff" }}
                          >
                            {row.username}
                          </p>
                          {row.partner_tier && (
                            <PartnerBadge
                              tier={row.partner_tier as keyof typeof TIERS}
                              size="xs"
                              className="hidden sm:inline-flex"
                            />
                          )}
                        </div>
                        <p className="text-[11.5px] text-slate-500 sm:hidden">
                          {formatMinor(row.won_minor)} · {row.opens} откр.
                        </p>
                      </div>
                    </div>

                    <span className="hidden text-right text-[13px] tabular-nums text-slate-400 sm:block">
                      {formatMinor(row.spent_minor)}
                    </span>
                    <span className="hidden text-right text-[13px] font-semibold tabular-nums text-white sm:block">
                      {formatMinor(row.won_minor)}
                    </span>
                    <span className="text-right text-[13px] tabular-nums text-slate-400">
                      <span className="sm:hidden">#{row.rank}</span>
                      <span className="hidden sm:inline">{formatNumber(row.opens)}</span>
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </>
  );
}
