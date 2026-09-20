"use client";

import { useState } from "react";
import { BarChart3, Crown } from "lucide-react";
import { api } from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime, formatMinor, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type Period = "today" | "week" | "month" | "all";

/**
 * Per-case statistics.
 *
 * The expected and observed columns sit side by side: over enough
 * openings they converge, and a persistent gap means the weights and the
 * roll disagree.
 */
export function CaseStats({ caseId }: { caseId: number }) {
  const [period, setPeriod] = useState<Period>("all");
  const { data, loading } = useResource(
    () => api.admin.caseStats(caseId, period),
    [caseId, period],
  );

  const stats = data?.stats;

  return (
    <>
      <Tabs
        items={[
          { id: "today", label: "Сегодня" },
          { id: "week", label: "Неделя" },
          { id: "month", label: "Месяц" },
          { id: "all", label: "Всё время" },
        ]}
        value={period}
        onChange={setPeriod}
        className="mb-5 w-fit"
      />

      {loading || !stats ? (
        <Skeleton className="h-[320px] w-full" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Tile label="Открытий" value={stats.opens.toLocaleString("ru-RU")} />
            <Tile label="Выручка" value={formatMinor(stats.revenue_minor)} />
            <Tile label="Выплачено" value={formatMinor(stats.payout_minor)} />
            <Tile
              label="Маржа"
              value={stats.opens > 0 ? formatPercent(stats.margin, 1) : "—"}
              accent={stats.margin >= 0 ? "#2FD98A" : "#FF4D5E"}
            />
            <Tile label="Средний выигрыш" value={formatMinor(stats.avg_value_minor)} />
          </div>

          {stats.best && (
            <Card className="flex flex-wrap items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400/15 text-gold-300">
                <Crown size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] uppercase tracking-wider text-slate-500">
                  Самый дорогой выигрыш
                </p>
                <p className="truncate text-[14px] font-semibold text-white">
                  {stats.best.market_name}
                </p>
                <p className="text-[12px] text-slate-500">
                  {stats.best.username} · {formatDateTime(stats.best.created_at)}
                </p>
              </div>
              <span className="text-[17px] font-bold tabular-nums text-gold-300">
                {formatMinor(stats.best.value_minor)}
              </span>
            </Card>
          )}

          {stats.opens === 0 ? (
            <EmptyState
              icon={<BarChart3 size={22} />}
              title="Нет открытий за период"
              description="Статистика появится, как только кейс начнут открывать."
            />
          ) : (
            <Card className="overflow-hidden">
              <div className="hidden grid-cols-[minmax(0,2fr)_90px_110px_110px_110px] gap-4 border-b border-white/[0.07] px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 lg:grid">
                <span>Предмет</span>
                <span className="text-right">Выпало</span>
                <span className="text-right">Ожидание</span>
                <span className="text-right">Факт</span>
                <span className="text-right">Отклонение</span>
              </div>

              <ul className="divide-y divide-white/[0.04]">
                {stats.drops.map((d) => {
                  const delta = d.expected > 0 ? (d.actual - d.expected) / d.expected : 0;
                  return (
                    <li
                      key={d.skin_id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 lg:grid-cols-[minmax(0,2fr)_90px_110px_110px_110px] lg:gap-4 lg:px-5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: d.rarity_color }}
                        />
                        <span className="truncate text-[13px] text-white">
                          {d.market_name}
                        </span>
                      </div>
                      <span className="text-right text-[13px] tabular-nums text-white">
                        {d.count}
                      </span>
                      <span className="hidden text-right text-[13px] tabular-nums text-slate-400 lg:block">
                        {formatPercent(d.expected, 3)}
                      </span>
                      <span className="hidden text-right text-[13px] tabular-nums text-slate-300 lg:block">
                        {formatPercent(d.actual, 3)}
                      </span>
                      <span
                        className={cn(
                          "hidden text-right text-[12.5px] tabular-nums lg:block",
                          Math.abs(delta) > 0.5 ? "text-gold-300" : "text-slate-500",
                        )}
                      >
                        {d.count === 0 ? "—" : `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(0)}%`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <p className="text-[11.5px] leading-relaxed text-slate-600">
            «Ожидание» — вероятность из таблицы весов, «факт» — доля реальных
            выпадений. На малых выборках расхождение нормально и сокращается
            с ростом числа открытий.
          </p>
        </div>
      )}
    </>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Card className="px-4 py-3.5">
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className="mt-1 truncate text-[17px] font-bold tabular-nums"
        style={{ color: accent ?? "#fff" }}
      >
        {value}
      </p>
    </Card>
  );
}
