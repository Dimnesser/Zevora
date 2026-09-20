"use client";

import { useState } from "react";
import { api } from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatMinor, formatNumber, formatPercent } from "@/lib/format";

type Period = "today" | "week" | "month" | "all";

export function PlatformStats() {
  const [period, setPeriod] = useState<Period>("all");
  const { data, loading } = useResource(() => api.admin.stats(period), [period]);
  const s = data?.stats;

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

      {loading || !s ? (
        <Skeleton className="h-[140px]" />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Tile label="Открытий" value={formatNumber(s.opens)} />
          <Tile label="Выручка" value={formatMinor(s.revenue_minor)} />
          <Tile label="Выплачено" value={formatMinor(s.payout_minor)} />
          <Tile
            label="Маржа"
            value={s.opens > 0 ? formatPercent(s.margin, 1) : "—"}
            accent={s.margin >= 0 ? "#2FD98A" : "#FF4D5E"}
          />
          <Tile label="Пользователей" value={formatNumber(s.users)} />
          <Tile label="Активных за период" value={formatNumber(s.active_users)} />
        </div>
      )}
    </>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Card className="px-4 py-4">
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className="mt-1 truncate text-[20px] font-bold tabular-nums"
        style={{ color: accent ?? "#fff" }}
      >
        {value}
      </p>
    </Card>
  );
}
