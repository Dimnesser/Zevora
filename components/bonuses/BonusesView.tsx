"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Flame, Gift, Link2, LogIn, Sparkles, Ticket, UserPlus, Users } from "lucide-react";
import { ApiRequestError, api } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { useCopy } from "@/hooks/useCopy";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Progress } from "@/components/ui/Progress";
import { EmptyState } from "@/components/ui/EmptyState";
import { PartnerBadge } from "@/components/partners/PartnerBadge";
import { TIERS } from "@/data/partners";
import { formatMinor } from "@/lib/format";
import { toast } from "@/lib/store/useToast";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;
const DAILY_BASE_MINOR = 15000;

export function BonusesView() {
  const { user, ready, refresh, setBalance } = useSession();
  const [promo, setPromo] = useState("");
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const { copied, copy } = useCopy();

  // Ticking clock for the cooldown, started on the client only.
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (ready && !user) {
    return (
      <EmptyState
        icon={<LogIn size={22} />}
        title="Войдите в аккаунт"
        description="Бонусы начисляются на баланс аккаунта."
        action={
          <Link href="/login">
            <Button>Войти</Button>
          </Link>
        }
      />
    );
  }

  const last = user?.bonuses.daily_claimed_at ?? null;
  const streak = user?.bonuses.daily_streak ?? 0;
  const claimable = Boolean(user) && now > 0 && (!last || now - last >= DAY);
  const remaining = last ? Math.max(0, DAY - (now - last)) : 0;

  const tier = user?.partner?.tier as keyof typeof TIERS | undefined;
  const partnerBonus =
    user?.partner?.daily_minor ?? (tier ? TIERS[tier].dailyReward * 100 : 0);
  const nextAmount = DAILY_BASE_MINOR * Math.min(streak + 1, 7) + partnerBonus;

  const refLink = user ? `https://zevora.example/?ref=${user.username}` : "";

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      toast.error(
        "Не удалось",
        err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <Card strong accent="#F5B841" className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-400/15 text-gold-300">
                <Gift size={17} />
              </span>
              <h2 className="text-[17px] font-bold text-white">Ежедневный бонус</h2>
            </div>
            <p className="text-[13px] text-slate-400">
              Забирайте награду каждый день — сумма растёт вместе со streak.
            </p>
          </div>
          {streak > 0 && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gold-400/30 bg-gold-400/[0.1] px-3 py-1.5">
              <Flame size={14} className="text-gold-300" />
              <span className="text-[13px] font-bold text-gold-300">{streak}</span>
            </span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => {
            const day = i + 1;
            const done = streak >= day;
            const next = streak + 1 === day && claimable;
            return (
              <div
                key={day}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-xl border py-2.5 transition",
                  done
                    ? "border-gold-400/50 bg-gold-400/[0.12]"
                    : next
                      ? "border-zev-400/60 bg-zev-500/[0.12]"
                      : "border-white/[0.07] bg-white/[0.02]",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase",
                    done ? "text-gold-300" : "text-slate-500",
                  )}
                >
                  Д{day}
                </span>
                <span
                  className={cn(
                    "mt-0.5 text-[11.5px] font-bold tabular-nums",
                    done ? "text-white" : next ? "text-zev-200" : "text-slate-600",
                  )}
                >
                  {(DAILY_BASE_MINOR * day) / 100}
                </span>
                {done && <Check size={10} className="absolute right-1 top-1 text-gold-300" />}
              </div>
            );
          })}
        </div>

        {partnerBonus > 0 && tier && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5">
            <PartnerBadge tier={tier} size="xs" />
            <span className="text-[12.5px] text-slate-400">
              Партнёрская надбавка:{" "}
              <span className="font-semibold text-white">+{formatMinor(partnerBonus)}</span> к
              каждому daily
            </span>
          </div>
        )}

        <ul className="mt-5 space-y-2 border-t border-white/[0.06] pt-4">
          {[
            "Награда растёт до 7-го дня, затем держится на максимуме.",
            "Streak сбрасывается, если пропустить больше суток.",
            "Партнёрам Zevora к каждому daily добавляется надбавка уровня.",
          ].map((line) => (
            <li key={line} className="flex gap-2.5 text-[12.5px] leading-relaxed text-slate-400">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold-400/70" />
              {line}
            </li>
          ))}
        </ul>

        <Button
          size="xl"
          fullWidth
          variant={claimable ? "gold" : "secondary"}
          className="mt-5"
          disabled={!claimable}
          loading={busy === "daily"}
          onClick={() =>
            void run("daily", async () => {
              const res = await api.daily();
              setBalance(res.balance_minor);
              await refresh();
              toast.success(
                `Бонус получен — день ${res.streak}`,
                `На баланс зачислено ${formatMinor(res.amount_minor)}`,
              );
            })
          }
          iconLeft={<Sparkles size={17} />}
        >
          {!ready
            ? "Загрузка…"
            : claimable
              ? `Забрать ${formatMinor(nextAmount)}`
              : `Следующий бонус через ${formatCountdown(remaining)}`}
        </Button>
      </Card>

      <div className="space-y-5">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zev-500/15 text-zev-300">
              <Ticket size={16} />
            </span>
            <h2 className="text-[15px] font-semibold text-white">Промокод</h2>
          </div>
          <p className="mb-3 text-[12.5px] text-slate-400">
            Введите код от стримера или партнёра Zevora.
          </p>
          <div className="flex gap-2">
            <Input
              value={promo}
              onChange={(e) => setPromo(e.target.value.toUpperCase())}
              placeholder="ZEVORA"
              className="font-mono uppercase tracking-wider"
              aria-label="Промокод"
            />
            <Button
              disabled={!promo.trim()}
              loading={busy === "promo"}
              onClick={() =>
                void run("promo", async () => {
                  const res = await api.promo(promo);
                  setBalance(res.balance_minor);
                  setPromo("");
                  toast.success("Промокод применён", `Начислено ${formatMinor(res.amount_minor)}`);
                })
              }
            >
              Применить
            </Button>
          </div>
          <p className="mt-2.5 text-[11.5px] text-slate-600">
            Попробуйте: ZEVORA, START300, NEON1000
          </p>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/15 text-success">
              <UserPlus size={16} />
            </span>
            <h2 className="text-[15px] font-semibold text-white">Бонус за регистрацию</h2>
          </div>
          <p className="mb-4 text-[12.5px] text-slate-400">
            Разовая награда 500 ₽ для нового аккаунта Zevora.
          </p>
          <Button
            fullWidth
            variant={user && !user.bonuses.registration_claimed ? "primary" : "secondary"}
            disabled={!user || user.bonuses.registration_claimed}
            loading={busy === "reg"}
            onClick={() =>
              void run("reg", async () => {
                const res = await api.registrationBonus();
                setBalance(res.balance_minor);
                await refresh();
                toast.success("Бонус за регистрацию", `Зачислено ${formatMinor(res.amount_minor)}`);
              })
            }
          >
            {user?.bonuses.registration_claimed ? "Уже получено" : "Забрать 500 ₽"}
          </Button>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-aqua-400/15 text-aqua-300">
              <Users size={16} />
            </span>
            <h2 className="text-[15px] font-semibold text-white">Реферальная программа</h2>
          </div>
          <p className="mb-3 text-[12.5px] text-slate-400">
            Приглашайте друзей и получайте 5% от их пополнений.
            {tier && " Для партнёров процент выше."}
          </p>

          <div className="flex items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.03] px-3 py-2.5">
            <Link2 size={14} className="shrink-0 text-slate-500" />
            <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-slate-300">
              {refLink}
            </span>
            <button
              onClick={async () => {
                if (await copy(refLink)) toast.success("Ссылка скопирована");
              }}
              aria-label="Скопировать ссылку"
              className="shrink-0 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-[11.5px] font-medium text-white transition hover:bg-white/[0.12]"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[12px]">
              <span className="text-slate-400">Приглашено: 0 из 5</span>
              <span className="text-slate-500">бонус 1 000 ₽</span>
            </div>
            <Progress value={0} color="#22D3EE" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function formatCountdown(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}
