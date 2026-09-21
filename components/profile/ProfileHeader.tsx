"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Flame, Wallet } from "lucide-react";
import type { MyStats, SessionUser } from "@/lib/client/api";
import { Avatar } from "@/components/art/Avatar";
import { Button } from "@/components/ui/Button";
import { PartnerCrest } from "@/components/partners/PartnerBadge";
import { TIERS } from "@/data/partners";
import { formatDate, formatMinor } from "@/lib/format";

/** XP needed for one level. Mirrors the server's award scale. */
export const LEVEL_STEP = 500;

interface ProfileHeaderProps {
  user: SessionUser;
  stats?: MyStats;
}

/**
 * The player card at the top of the profile.
 *
 * Built like a game profile rather than an account page: a lit banner
 * carrying the partner tier's colour, the avatar breaking the banner's
 * lower edge, and the identity, level rail and wallet reading as one
 * block of HUD. The numbers below it are the strip you would glance at
 * mid-session — balance, inventory, streak, days on the platform.
 */
export function ProfileHeader({ user, stats }: ProfileHeaderProps) {
  const tier = user.partner?.tier as keyof typeof TIERS | undefined;
  const colors = tier ? TIERS[tier].colors : (["#6E71FF", "#22D3EE"] as const);
  const level = Math.floor(user.xp / LEVEL_STEP) + 1;
  const xpInLevel = user.xp % LEVEL_STEP;
  const pct = (xpInLevel / LEVEL_STEP) * 100;
  const days = Math.max(
    1,
    Math.floor((Date.now() - user.created_at * 1000) / 86_400_000),
  );

  return (
    <section className="surface-panel overflow-hidden rounded-lg">
      {/* ── banner ── */}
      <div className="relative h-[128px] sm:h-[148px]">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `radial-gradient(760px 220px at 22% 118%, ${colors[0]}3D, transparent 68%), radial-gradient(520px 200px at 88% -20%, ${colors[1]}2E, transparent 70%), linear-gradient(180deg,#10131c,#0a0d14)`,
          }}
        />
        <div aria-hidden className="bg-tech-grid absolute inset-0 opacity-45" />
        {/* a slow bar of light crossing the banner */}
        <motion.div
          aria-hidden
          className="absolute inset-y-0 w-40 opacity-[0.16]"
          style={{
            background: `linear-gradient(90deg, transparent, ${colors[1]}, transparent)`,
          }}
          initial={{ x: "-20%" }}
          animate={{ x: "760%" }}
          transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px"
          style={{ background: `linear-gradient(90deg,transparent,${colors[0]},transparent)` }}
        />

        <span className="meta absolute right-4 top-3.5 text-slate-500">
          ID {String(user.id).padStart(6, "0")}
        </span>
      </div>

      {/* ── identity ── */}
      <div className="relative px-4 pb-5 sm:px-6">
        <div className="-mt-11 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:gap-5">
          <div className="relative w-fit">
            <div
              aria-hidden
              className="absolute -inset-2 rounded-full opacity-40 blur-xl"
              style={{ background: colors[0] }}
            />
            <div className="relative rounded-full border border-white/10 bg-ink p-1">
              <Avatar seed={user.avatar_seed} size={82} ring={colors[0]} />
            </div>
          </div>

          <div className="min-w-0 flex-1 sm:pb-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="truncate font-display text-[26px] font-bold leading-none tracking-[-0.02em] text-white sm:text-[30px]">
                {user.username}
              </h1>
              {user.role === "owner" && (
                <span className="meta rounded-xs border border-gold-400/35 bg-gold-400/10 px-1.5 py-1 text-gold-300">
                  Владелец
                </span>
              )}
              {tier && <PartnerCrest tier={tier} />}
            </div>
            <p className="meta mt-2 text-slate-500">
              На платформе с {formatDate(user.created_at)}
            </p>
          </div>

          <div className="flex shrink-0 gap-2 sm:pb-1">
            <Link href="/wallet">
              <Button variant="accent" iconLeft={<Wallet size={15} />}>
                Пополнить
              </Button>
            </Link>
            <Link href="/inventory">
              <Button variant="secondary">Инвентарь</Button>
            </Link>
          </div>
        </div>

        {/* ── level rail ── */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="meta text-slate-400">
              Уровень <span className="tnum text-white">{level}</span>
            </span>
            <span className="meta tnum text-slate-500">
              {xpInLevel} / {LEVEL_STEP} XP
            </span>
          </div>
          <div className="relative h-[7px] overflow-hidden rounded-xs border border-line-soft bg-black/50">
            <motion.div
              className="h-full"
              style={{
                background: `linear-gradient(90deg, ${colors[0]}, ${colors[1]})`,
                boxShadow: `0 0 14px -2px ${colors[0]}`,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
            {/* notches, so the rail reads as a gauge rather than a bar */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, transparent 0 9.9%, rgba(0,0,0,.55) 9.9% 10%)",
              }}
            />
          </div>
        </div>

        {/* ── the glance strip ── */}
        <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-line-soft bg-line-soft sm:grid-cols-4">
          <Stat label="Баланс" value={formatMinor(user.balance_minor)} tone="#F5B841" />
          <Stat
            label="Инвентарь"
            value={formatMinor(stats?.inventory_value_minor ?? 0)}
            tone="#2FD98A"
          />
          <Stat
            label="Лучший дроп"
            value={formatMinor(stats?.best_minor ?? 0)}
            tone={colors[1]}
          />
          <Stat
            label="Серия"
            value={`${user.bonuses.daily_streak} дн.`}
            hint={`${days} дн. с нами`}
            icon
          />
        </dl>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
  hint,
  icon,
}: {
  label: string;
  value: string;
  tone?: string;
  hint?: string;
  icon?: boolean;
}) {
  return (
    <div className="bg-slab/80 px-3.5 py-3">
      <dt className="meta text-slate-500">{label}</dt>
      <dd
        className="mt-1 flex items-center gap-1.5 truncate font-display text-[17px] font-bold tnum"
        style={{ color: tone ?? "#fff" }}
      >
        {icon && <Flame size={14} className="shrink-0 text-gold-400" />}
        {value}
      </dd>
      {hint && <p className="meta mt-0.5 text-slate-600">{hint}</p>}
    </div>
  );
}
