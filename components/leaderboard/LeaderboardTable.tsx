"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Medal, Trophy } from "lucide-react";
import type { LeaderboardEntry } from "@/types";
import { api } from "@/services/api";
import { useStore } from "@/lib/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { Avatar } from "@/components/art/Avatar";
import { PartnerBadge } from "@/components/partners/PartnerBadge";
import { TIERS } from "@/data/partners";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type Period = "week" | "month" | "all";

const PODIUM = [
  { color: "#F5B841", icon: Crown, label: "1 место" },
  { color: "#C9D2E3", icon: Trophy, label: "2 место" },
  { color: "#CD7F42", icon: Medal, label: "3 место" },
];

export function LeaderboardTable() {
  const [period, setPeriod] = useState<Period>("week");
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null);
  const hydrated = useHydrated();
  const managed = useStore((s) => s.managedUsers);

  useEffect(() => {
    let alive = true;
    setRows(null);
    api.getLeaderboard(20).then((r) => {
      if (!alive) return;
      // The period scales the mock numbers; a real API returns true ranges.
      const factor = period === "week" ? 1 : period === "month" ? 3.4 : 11.2;
      setRows(
        r.map((row) => ({
          ...row,
          spent: Math.round(row.spent * factor),
          won: Math.round(row.won * factor),
          upgrades: Math.round(row.upgrades * factor),
        })),
      );
    });
    return () => {
      alive = false;
    };
  }, [period]);

  /**
   * Overlay the live partner roster: granting or revoking a status in the
   * admin panel is reflected in the rating immediately.
   */
  const display = useMemo(() => {
    if (!rows) return null;
    if (!hydrated) return rows;
    const tiers = new Map(managed.map((m) => [m.username, m.partner?.tier ?? null]));
    return rows.map((r) =>
      tiers.has(r.username)
        ? { ...r, partnerTier: tiers.get(r.username) ?? null }
        : r,
    );
  }, [rows, managed, hydrated]);

  return (
    <>
      <Tabs
        items={[
          { id: "week", label: "За неделю" },
          { id: "month", label: "За месяц" },
          { id: "all", label: "За всё время" },
        ]}
        value={period}
        onChange={setPeriod}
        className="mb-6 w-fit"
      />

      {/* podium */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {(display ?? [null, null, null]).slice(0, 3).map((row, i) => {
          const meta = PODIUM[i];
          const Icon = meta.icon;
          if (!row) return <Skeleton key={i} className="h-[196px]" />;
          return (
            <motion.div
              key={row.username}
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
                seed={row.avatarSeed}
                size={56}
                ring={row.partnerTier ? TIERS[row.partnerTier].colors[0] : meta.color}
                className="relative"
              />
              <div className="relative mt-3 flex items-center justify-center gap-2">
                <p className="truncate text-[15px] font-bold text-white">
                  {row.username}
                </p>
                {row.partnerTier && (
                  <PartnerBadge tier={row.partnerTier} size="xs" iconOnly />
                )}
              </div>
              <p className="relative mt-1 text-[12px] text-slate-500">
                {meta.label}
              </p>
              <p
                className="relative mt-3 text-xl font-bold tabular-nums"
                style={{ color: meta.color }}
              >
                {formatMoney(row.won)}
              </p>
              <p className="relative text-[11.5px] text-slate-500">выиграно</p>
            </motion.div>
          );
        })}
      </div>

      {/* table */}
      <div className="glass overflow-hidden">
        <div className="hidden grid-cols-[56px_minmax(0,1fr)_120px_120px_100px] gap-4 border-b border-white/[0.07] px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:grid">
          <span>#</span>
          <span>Игрок</span>
          <span className="text-right">Потрачено</span>
          <span className="text-right">Выиграно</span>
          <span className="text-right">Апгрейды</span>
        </div>

        <ul className="divide-y divide-white/[0.04]">
          {display
            ? display.map((row, i) => {
                const tierColor = row.partnerTier
                  ? TIERS[row.partnerTier].colors[0]
                  : null;
                return (
                  <motion.li
                    key={row.username}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: Math.min(i, 12) * 0.025 }}
                    className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03] sm:grid-cols-[56px_minmax(0,1fr)_120px_120px_100px] sm:gap-4 sm:px-5"
                    style={
                      tierColor
                        ? {
                            background: `linear-gradient(90deg, ${tierColor}0E, transparent 40%)`,
                          }
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
                      <Avatar
                        seed={row.avatarSeed}
                        size={34}
                        ring={tierColor ?? undefined}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className="truncate text-[13.5px] font-semibold"
                            style={{ color: tierColor ?? "#fff" }}
                          >
                            {row.username}
                          </p>
                          {row.partnerTier && (
                            <PartnerBadge
                              tier={row.partnerTier}
                              size="xs"
                              className="hidden sm:inline-flex"
                            />
                          )}
                        </div>
                        <p className="text-[11.5px] text-slate-500 sm:hidden">
                          {formatMoney(row.won)} · {row.upgrades} апгр.
                        </p>
                      </div>
                    </div>

                    <span className="hidden text-right text-[13px] tabular-nums text-slate-400 sm:block">
                      {formatMoney(row.spent)}
                    </span>
                    <span className="hidden text-right text-[13px] font-semibold tabular-nums text-white sm:block">
                      {formatMoney(row.won)}
                    </span>
                    <span className="text-right text-[13px] tabular-nums text-slate-400">
                      <span className="sm:hidden">#{row.rank}</span>
                      <span className="hidden sm:inline">
                        {formatNumber(row.upgrades)}
                      </span>
                    </span>
                  </motion.li>
                );
              })
            : Array.from({ length: 10 }).map((_, i) => (
                <li key={i} className="px-5 py-3.5">
                  <Skeleton className="h-9 w-full" />
                </li>
              ))}
        </ul>
      </div>
    </>
  );
}
