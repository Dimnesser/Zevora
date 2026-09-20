"use client";

import Link from "next/link";
import {
  Backpack,
  Boxes,
  Check,
  Crown,
  Flame,
  Gem,
  LogIn,
  Package,
  TrendingUp,
  Zap,
} from "lucide-react";
import { api, type MyStats } from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { useSession } from "@/lib/client/session";
import { Avatar } from "@/components/art/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Skeleton } from "@/components/ui/Skeleton";
import { ItemCard } from "@/components/items/ItemCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { TransactionList } from "@/components/wallet/TransactionList";
import { PartnerCrest } from "@/components/partners/PartnerBadge";
import { PartnerSummary } from "@/components/profile/PartnerSummary";
import { TIERS } from "@/data/partners";
import { formatDate, formatMinor, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const LEVEL_STEP = 500;

const ICONS: Record<string, typeof Package> = {
  package: Package,
  boxes: Boxes,
  zap: Zap,
  "trending-up": TrendingUp,
  gem: Gem,
  crown: Crown,
  flame: Flame,
};

/** Achievement definitions, evaluated against the server's aggregates. */
const ACHIEVEMENTS: {
  id: string;
  name: string;
  description: string;
  icon: string;
  goal: number;
  read: (s: MyStats, streak: number) => number;
  format?: (n: number) => string;
}[] = [
  { id: "first", name: "Первое открытие", description: "Откройте свой первый кейс.", icon: "package", goal: 1, read: (s) => s.cases_opened },
  { id: "collector", name: "Коллекционер", description: "Откройте 25 кейсов.", icon: "boxes", goal: 25, read: (s) => s.cases_opened },
  { id: "machine", name: "Машина", description: "Откройте 100 кейсов.", icon: "zap", goal: 100, read: (s) => s.cases_opened },
  { id: "gambler", name: "Рисковый", description: "Сделайте 10 апгрейдов.", icon: "trending-up", goal: 10, read: (s) => s.upgrades },
  { id: "alchemist", name: "Алхимик", description: "Выиграйте 5 апгрейдов.", icon: "gem", goal: 5, read: (s) => s.upgrades_won },
  { id: "highroller", name: "Хайроллер", description: "Выбейте предмет дороже 25 000 ₽.", icon: "gem", goal: 2_500_000, read: (s) => s.best_minor, format: formatMinor },
  { id: "millionaire", name: "Миллионер", description: "Выиграйте предметов на 1 000 000 ₽.", icon: "crown", goal: 100_000_000, read: (s) => s.won_minor, format: formatMinor },
  { id: "streak", name: "Постоянство", description: "Соберите streak из 7 дней.", icon: "flame", goal: 7, read: (_s, streak) => streak },
];

export function ProfileView() {
  const { user, ready } = useSession();

  const { data: statsData } = useResource(
    () => (user ? api.stats() : Promise.resolve(null)),
    [user?.id, user?.balance_minor],
  );
  const { data: inv } = useResource(
    () => (user ? api.inventory({ sort: "price-desc" }) : Promise.resolve(null)),
    [user?.id, user?.balance_minor],
  );

  if (!ready) {
    return <Skeleton className="h-[320px] w-full rounded-xl" />;
  }

  if (!user) {
    return (
      <EmptyState
        icon={<LogIn size={22} />}
        title="Войдите в аккаунт"
        description="Профиль, статистика и достижения привязаны к аккаунту."
        action={
          <Link href="/login">
            <Button>Войти</Button>
          </Link>
        }
      />
    );
  }

  const stats = statsData?.stats;
  const tier = user.partner?.tier as keyof typeof TIERS | undefined;
  const tierColors = tier ? TIERS[tier].colors : null;
  const owned = (inv?.items ?? []).filter((i) => i.status === "owned");
  const xpInLevel = user.xp % LEVEL_STEP;
  const level = Math.floor(user.xp / LEVEL_STEP) + 1;
  const winRate = stats && stats.upgrades > 0 ? stats.upgrades_won / stats.upgrades : 0;

  const tiles = [
    { label: "Кейсов открыто", value: stats?.cases_opened ?? 0, icon: Package },
    { label: "Апгрейдов", value: stats?.upgrades ?? 0, icon: TrendingUp },
    { label: "Удачных апгрейдов", value: stats?.upgrades_won ?? 0, icon: Check },
    { label: "Предметов", value: stats?.inventory_items ?? 0, icon: Backpack },
  ];

  return (
    <div className="space-y-5">
      <Card
        strong
        className="relative overflow-hidden p-5 sm:p-7"
        style={
          tierColors
            ? {
                borderColor: `${tierColors[0]}44`,
                background: `linear-gradient(120deg, ${tierColors[0]}12, ${tierColors[1]}08), rgba(13,16,32,.72)`,
              }
            : undefined
        }
      >
        {tierColors && (
          <span
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full opacity-25 blur-[80px]"
            style={{ background: tierColors[0] }}
          />
        )}

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Avatar seed={user.avatar_seed} size={84} ring={tierColors?.[0]} />
            <div className="min-w-0 sm:hidden">
              <h1 className="truncate font-display text-2xl font-bold text-white">
                {user.username}
              </h1>
              <p className="text-[12.5px] text-slate-400">Уровень {level}</p>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="hidden truncate font-display text-[30px] font-bold text-white sm:block">
              {user.username}
            </h1>
            <p className="mt-1 text-[13px] text-slate-400">
              В Zevora с {formatDate(user.created_at)}
              {user.role === "owner" && " · владелец платформы"}
            </p>

            {tier && (
              <div className="mt-3">
                <PartnerCrest tier={tier} />
              </div>
            )}

            <div className="mt-4 max-w-sm">
              <div className="mb-1.5 flex items-center justify-between text-[12px]">
                <span className="text-slate-400">Уровень {level}</span>
                <span className="tabular-nums text-slate-500">
                  {xpInLevel} / {LEVEL_STEP} XP
                </span>
              </div>
              <Progress value={xpInLevel / LEVEL_STEP} color={tierColors?.[0] ?? "#6E71FF"} />
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-3 sm:w-[260px]">
            <MiniStat label="Баланс" value={formatMinor(user.balance_minor)} />
            <MiniStat
              label="Инвентарь"
              value={formatMinor(stats?.inventory_value_minor ?? 0)}
              accent="#2FD98A"
            />
            <Link href="/wallet" className="col-span-2">
              <Button fullWidth>Пополнить баланс</Button>
            </Link>
          </div>
        </div>
      </Card>

      {user.partner && <PartnerSummary partner={user.partner} username={user.username} />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-slate-300">
              <t.icon size={17} />
            </span>
            <div>
              <p className="text-[11.5px] uppercase tracking-wider text-slate-500">{t.label}</p>
              <p className="text-[19px] font-bold tabular-nums text-white">{t.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Card className="p-5">
          <h2 className="mb-4 text-[15px] font-semibold text-white">Достижения</h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {ACHIEVEMENTS.map((a) => {
              const current = stats ? a.read(stats, user.bonuses.daily_streak) : 0;
              const progress = Math.min(1, current / a.goal);
              const done = progress >= 1;
              const Icon = ICONS[a.icon] ?? Package;
              const fmt = a.format ?? ((n: number) => n.toLocaleString("ru-RU"));

              return (
                <div
                  key={a.id}
                  className={cn(
                    "rounded-lg border p-3.5 transition",
                    done
                      ? "border-gold-400/40 bg-gold-400/[0.08]"
                      : "border-white/[0.07] bg-white/[0.02]",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        done ? "bg-gold-400/20 text-gold-300" : "bg-white/[0.06] text-slate-500",
                      )}
                    >
                      {done ? <Check size={16} /> : <Icon size={15} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-[13.5px] font-semibold",
                          done ? "text-gold-200" : "text-white",
                        )}
                      >
                        {a.name}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-slate-500">
                        {a.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Progress value={progress} height={4} color={done ? "#F5B841" : "#6E71FF"} />
                    <p className="mt-1.5 text-right text-[10.5px] tabular-nums text-slate-500">
                      {fmt(Math.min(current, a.goal))} / {fmt(a.goal)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-4 text-[15px] font-semibold text-white">Статистика</h2>
            <div className="flex items-center gap-5">
              <div className="relative h-24 w-24 shrink-0">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="10" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="#2FD98A"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42 * winRate} ${2 * Math.PI * 42}`}
                    style={{ transition: "stroke-dasharray .6s ease" }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[15px] font-bold tabular-nums text-white">
                  {formatPercent(winRate, 0)}
                </span>
              </div>
              <dl className="flex-1 space-y-2.5">
                <StatRow label="Потрачено" value={formatMinor(stats?.spent_minor ?? 0)} />
                <StatRow label="Выиграно" value={formatMinor(stats?.won_minor ?? 0)} />
                <StatRow label="Лучший дроп" value={formatMinor(stats?.best_minor ?? 0)} />
                <StatRow
                  label="Апгрейды"
                  value={`${stats?.upgrades_won ?? 0} / ${stats?.upgrades ?? 0}`}
                />
              </dl>
            </div>
            {stats?.best_drop && (
              <p className="mt-4 border-t border-white/[0.06] pt-3 text-[12px] text-slate-500">
                Лучший предмет:{" "}
                <span className="font-semibold text-white">{stats.best_drop.market_name}</span>
              </p>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-white">История действий</h2>
              <Link href="/history" className="text-[12px] text-zev-300 transition hover:text-white">
                Все открытия
              </Link>
            </div>
            <TransactionList limit={8} />
          </Card>
        </div>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-white">Инвентарь</h2>
          <Link href="/inventory" className="text-[12px] text-zev-300 transition hover:text-white">
            Открыть полностью
          </Link>
        </div>
        {owned.length === 0 ? (
          <EmptyState
            title="Пока пусто"
            description="Откройте кейс, чтобы получить первый предмет."
            action={
              <Link href="/cases">
                <Button>Открыть кейсы</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {owned.slice(0, 6).map((item) => (
              <ItemCard key={item.id} skin={item} size="sm" />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10.5px] uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className="mt-0.5 truncate text-[15px] font-bold tabular-nums"
        style={{ color: accent ?? "#fff" }}
      >
        {value}
      </p>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[12.5px] text-slate-400">{label}</dt>
      <dd className="text-[13px] font-semibold tabular-nums text-white">{value}</dd>
    </div>
  );
}
