"use client";

import { useState } from "react";
import Link from "next/link";
import { History, LogIn, ShieldCheck } from "lucide-react";
import { api } from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { useSession } from "@/lib/client/session";
import { SkinImage } from "@/components/art/SkinImage";
import { Avatar } from "@/components/art/Avatar";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime, formatMinor } from "@/lib/format";
import { cn } from "@/lib/utils";

const PAGE = 50;

/**
 * Opening history.
 *
 * Owners can switch to the platform-wide view; the server rejects that
 * scope for everyone else, so the tab is only shown to them.
 */
export function OpeningsHistory() {
  const { user, ready } = useSession();
  const [scope, setScope] = useState<"me" | "all">("me");
  const [page, setPage] = useState(0);

  const { data, loading } = useResource(
    () =>
      user
        ? api.openings({ scope, limit: PAGE, offset: page * PAGE })
        : Promise.resolve(null),
    [user?.id, scope, page],
  );

  if (ready && !user) {
    return (
      <EmptyState
        icon={<LogIn size={22} />}
        title="Войдите в аккаунт"
        description="История открытий привязана к аккаунту."
        action={
          <Link href="/login">
            <Button>Войти</Button>
          </Link>
        }
      />
    );
  }

  const rows = data?.openings ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / PAGE);

  return (
    <>
      {user?.role === "owner" && (
        <Tabs
          items={[
            { id: "me", label: "Мои открытия" },
            { id: "all", label: "Все открытия" },
          ]}
          value={scope}
          onChange={(s) => {
            setScope(s);
            setPage(0);
          }}
          className="mb-6 w-fit"
        />
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<History size={22} />}
          title="Пока пусто"
          description="Откройте первый кейс, чтобы история начала заполняться."
          action={
            <Link href="/cases">
              <Button>Открыть кейсы</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="glass overflow-hidden">
            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_110px_120px_170px] gap-4 border-b border-white/[0.07] px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 lg:grid">
              <span>Предмет</span>
              <span>Кейс</span>
              <span className="text-right">Цена</span>
              <span className="text-right">Выигрыш</span>
              <span className="text-right">Дата</span>
            </div>

            <ul className="divide-y divide-white/[0.04]">
              {rows.map((row) => {
                const profit = row.value_minor - row.price_paid_minor;
                return (
                  <li
                    key={row.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03] lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_110px_120px_170px] lg:gap-4 lg:px-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="h-9 w-[64px] shrink-0 rounded-lg"
                        style={{ background: `${row.rarity.color}14` }}
                      >
                        <SkinImage
                          imageUrl={row.image_url}
                          art={row.art}
                          label={row.market_name}
                          glow={false}
                        />
                      </span>
                      <div className="min-w-0">
                        <p
                          className="truncate text-[13.5px] font-semibold"
                          style={{ color: row.rarity.color }}
                        >
                          {row.market_name}
                        </p>
                        <p className="truncate text-[11.5px] text-slate-500">
                          {row.rarity.name}
                          {scope === "all" && ` · ${row.username}`}
                        </p>
                      </div>
                    </div>

                    <div className="hidden min-w-0 items-center gap-2 lg:flex">
                      {scope === "all" && (
                        <Avatar seed={row.avatar_seed} size={24} />
                      )}
                      <Link
                        href={`/cases/${row.case.slug}`}
                        className="truncate text-[13px] text-slate-300 transition hover:text-white"
                      >
                        {row.case.name}
                      </Link>
                    </div>

                    <span className="hidden text-right text-[13px] tabular-nums text-slate-400 lg:block">
                      {formatMinor(row.price_paid_minor)}
                    </span>

                    <div className="text-right">
                      <span className="block text-[13px] font-bold tabular-nums text-white">
                        {formatMinor(row.value_minor)}
                      </span>
                      <span
                        className={cn(
                          "block text-[11px] tabular-nums",
                          profit >= 0 ? "text-success" : "text-slate-600",
                        )}
                      >
                        {profit >= 0 ? "+" : "−"}
                        {formatMinor(Math.abs(profit))}
                      </span>
                    </div>

                    <div className="hidden text-right lg:block">
                      <span className="block text-[12.5px] text-slate-400">
                        {formatDateTime(row.created_at)}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-600"
                        title="Выигрышный билет и общий вес кейса"
                      >
                        <ShieldCheck size={9} />
                        {row.audit.roll.toLocaleString("ru-RU")}/
                        {row.audit.total_weight.toLocaleString("ru-RU")}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {pages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Назад
              </Button>
              <span className="text-[12.5px] tabular-nums text-slate-500">
                {page + 1} / {pages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page + 1 >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Вперёд
              </Button>
            </div>
          )}

          <p className="mt-4 text-center text-[12px] text-slate-600">
            Всего открытий: {total.toLocaleString("ru-RU")}
          </p>
        </>
      )}
    </>
  );
}
