"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Backpack,
  Boxes,
  Check,
  Crown,
  Flame,
  Gem,
  Package,
  Pencil,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { Avatar } from "@/components/art/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Progress } from "@/components/ui/Progress";
import { Modal } from "@/components/ui/Modal";
import { ItemCard } from "@/components/items/ItemCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { TransactionList } from "@/components/wallet/TransactionList";
import { PartnerCrest } from "@/components/partners/PartnerBadge";
import { PartnerSummary } from "@/components/profile/PartnerSummary";
import { ACHIEVEMENTS } from "@/data/achievements";
import { TIERS } from "@/data/partners";
import { formatMoney, formatDate, formatPercent } from "@/lib/format";
import { toast } from "@/lib/store/useToast";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Package> = {
  package: Package,
  boxes: Boxes,
  zap: Zap,
  "trending-up": TrendingUp,
  flask: Gem,
  gem: Gem,
  crown: Crown,
  flame: Flame,
};

/** XP needed to reach the next level. */
const LEVEL_STEP = 500;

export function ProfileView() {
  const hydrated = useHydrated();
  const user = useStore((s) => s.user);
  const inventory = useStore((s) => s.inventory);
  const setUsername = useStore((s) => s.setUsername);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(user.username);

  const tier = hydrated ? user.partner?.tier : undefined;
  const tierColors = tier ? TIERS[tier].colors : null;

  const owned = hydrated ? inventory.filter((i) => i.status === "owned") : [];
  const inventoryValue = owned.reduce((s, i) => s + i.price, 0);
  const xpInLevel = user.xp % LEVEL_STEP;
  const winRate =
    user.stats.upgrades > 0 ? user.stats.upgradesWon / user.stats.upgrades : 0;

  const stats = [
    { label: "Кейсов открыто", value: user.stats.casesOpened, icon: Package },
    { label: "Апгрейдов", value: user.stats.upgrades, icon: TrendingUp },
    { label: "Удачных апгрейдов", value: user.stats.upgradesWon, icon: Check },
    { label: "Предметов", value: owned.length, icon: Backpack },
  ];

  return (
    <div className="space-y-5">
      {/* ───────── header card ───────── */}
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
            <Avatar
              seed={user.avatarSeed}
              size={84}
              ring={tierColors?.[0]}
            />
            <div className="min-w-0 sm:hidden">
              <h1 className="truncate font-display text-2xl font-bold text-white">
                {hydrated ? user.username : "…"}
              </h1>
              <p className="text-[12.5px] text-slate-400">
                Уровень {user.level}
              </p>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="hidden items-center gap-3 sm:flex">
              <h1 className="truncate font-display text-[30px] font-bold text-white">
                {hydrated ? user.username : "…"}
              </h1>
              <button
                onClick={() => {
                  setDraft(user.username);
                  setEditing(true);
                }}
                aria-label="Изменить ник"
                className="rounded-lg border border-white/10 bg-white/[0.05] p-2 text-slate-400 transition hover:text-white"
              >
                <Pencil size={13} />
              </button>
            </div>

            <p className="mt-1 text-[13px] text-slate-400">
              В Zevora с {hydrated ? formatDate(user.createdAt) : "—"}
            </p>

            {tier && (
              <div className="mt-3">
                <PartnerCrest tier={tier} />
              </div>
            )}

            <div className="mt-4 max-w-sm">
              <div className="mb-1.5 flex items-center justify-between text-[12px]">
                <span className="text-slate-400">Уровень {user.level}</span>
                <span className="text-slate-500 tabular-nums">
                  {xpInLevel} / {LEVEL_STEP} XP
                </span>
              </div>
              <Progress
                value={xpInLevel / LEVEL_STEP}
                color={tierColors?.[0] ?? "#6E71FF"}
              />
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-3 sm:w-[260px]">
            <MiniStat label="Баланс" value={hydrated ? formatMoney(user.balance) : "—"} />
            <MiniStat
              label="Инвентарь"
              value={hydrated ? formatMoney(inventoryValue) : "—"}
              accent="#2FD98A"
            />
            <Link href="/wallet" className="col-span-2">
              <Button fullWidth>Пополнить баланс</Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* ───────── partner panel ───────── */}
      {tier && user.partner && <PartnerSummary partner={user.partner} />}

      {/* ───────── stats ───────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05 }}
          >
            <Card className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-slate-300">
                <s.icon size={17} />
              </span>
              <div>
                <p className="text-[11.5px] uppercase tracking-wider text-slate-500">
                  {s.label}
                </p>
                <p className="text-[19px] font-bold tabular-nums text-white">
                  {hydrated ? s.value : "—"}
                </p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* ───────── achievements ───────── */}
        <Card className="p-5">
          <h2 className="mb-4 text-[15px] font-semibold text-white">Достижения</h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {ACHIEVEMENTS.map((a) => {
              const raw =
                a.metric === "streak"
                  ? user.bonuses.streak
                  : user.stats[a.metric as keyof typeof user.stats];
              const current = hydrated ? Number(raw) : 0;
              const progress = Math.min(1, current / a.goal);
              const done = progress >= 1;
              const Icon = ICONS[a.icon] ?? Package;

              return (
                <div
                  key={a.id}
                  className={cn(
                    "rounded-2xl border p-3.5 transition",
                    done
                      ? "border-gold-400/40 bg-gold-400/[0.08]"
                      : "border-white/[0.07] bg-white/[0.02]",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        done
                          ? "bg-gold-400/20 text-gold-300"
                          : "bg-white/[0.06] text-slate-500",
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
                    <Progress
                      value={progress}
                      height={4}
                      color={done ? "#F5B841" : "#6E71FF"}
                    />
                    <p className="mt-1.5 text-right text-[10.5px] tabular-nums text-slate-500">
                      {Math.min(current, a.goal).toLocaleString("ru-RU")} /{" "}
                      {a.goal.toLocaleString("ru-RU")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ───────── history + winrate ───────── */}
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-4 text-[15px] font-semibold text-white">
              Статистика апгрейдов
            </h2>
            <div className="flex items-center gap-5">
              <div className="relative h-24 w-24 shrink-0">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="rgba(255,255,255,.07)"
                    strokeWidth="10"
                  />
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
                <StatRow label="Всего апгрейдов" value={user.stats.upgrades} />
                <StatRow label="Успешных" value={user.stats.upgradesWon} />
                <StatRow
                  label="Лучший дроп"
                  value={formatMoney(user.stats.bestDropValue)}
                />
                <StatRow
                  label="Всего выиграно"
                  value={formatMoney(user.stats.totalWon)}
                />
              </dl>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-white">
                История действий
              </h2>
              <Link
                href="/wallet"
                className="text-[12px] text-zev-300 transition hover:text-white"
              >
                Вся история
              </Link>
            </div>
            <TransactionList limit={8} />
          </Card>
        </div>
      </div>

      {/* ───────── inventory preview ───────── */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-white">Инвентарь</h2>
          <Link
            href="/inventory"
            className="text-[12px] text-zev-300 transition hover:text-white"
          >
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
            {owned
              .slice()
              .sort((a, b) => b.price - a.price)
              .slice(0, 6)
              .map((item) => (
                <ItemCard key={item.uid} item={item} size="sm" />
              ))}
          </div>
        )}
      </Card>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Изменить ник"
        size="sm"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={20}
          placeholder="Новый ник"
          aria-label="Новый ник"
        />
        <div className="mt-5 flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setEditing(false)}
          >
            Отмена
          </Button>
          <Button
            fullWidth
            disabled={!draft.trim()}
            onClick={() => {
              setUsername(draft.trim());
              setEditing(false);
              toast.success("Ник обновлён");
            }}
          >
            Сохранить
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10.5px] uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className="mt-0.5 truncate text-[15px] font-bold tabular-nums"
        style={{ color: accent ?? "#fff" }}
      >
        {value}
      </p>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[12.5px] text-slate-400">{label}</dt>
      <dd className="text-[13px] font-semibold tabular-nums text-white">
        {value}
      </dd>
    </div>
  );
}
