"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Copy,
  DoorOpen,
  Link2,
  Package,
  Ticket,
  TrendingUp,
} from "lucide-react";
import type { SessionUser } from "@/lib/client/api";
import { TIERS } from "@/data/partners";
import { useCopy } from "@/hooks/useCopy";
import { api } from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { CaseCard } from "@/components/cases/CaseCard";
import { PartnerChart } from "@/components/partners/PartnerChart";
import { PerksGrid } from "@/components/partners/PerksGrid";
import { TiersSection } from "@/components/partners/TiersSection";
import { PartnerBadge } from "@/components/partners/PartnerBadge";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/Section";
import { formatMinor, formatNumber, formatPercent, formatDate } from "@/lib/format";
import { toast } from "@/lib/store/useToast";
import { cn } from "@/lib/utils";

/**
 * The member view. Opens with a short vault animation the first time it is
 * mounted in a session, then settles into the dashboard.
 */
type Partner = NonNullable<SessionUser["partner"]>;

export function PartnerLounge({
  partner,
  username,
}: {
  partner: Partner;
  username: string;
}) {
  const meta = TIERS[partner.tier as keyof typeof TIERS];
  const [c1, c2] = meta.colors;
  const [entering, setEntering] = useState(true);
  const link = `https://zevora.example/?ref=${partner.ref_code ?? username}`;
  const promoCode = partner.promo_code ?? "—";
  const { copied: linkCopied, copy: copyLink } = useCopy();
  const { copied: promoCopied, copy: copyPromo } = useCopy();

  useEffect(() => {
    const t = setTimeout(() => setEntering(false), 1500);
    return () => clearTimeout(t);
  }, []);

  // Partner cases come from the API, which only returns them once the
  // server has confirmed the account holds the status.
  const { data: catalogue } = useResource(() => api.cases(), []);
  const { data: activity } = useResource(() => api.stats(), []);
  const partnerCases = (catalogue?.cases ?? []).filter((c) => c.partner_only);

  // Every figure here comes from this account's real activity in the
  // database. Referral attribution is not implemented yet, so no
  // click-through or signup numbers are invented to fill the row.
  const stats = [
    { label: "Открытий", value: formatNumber(activity?.stats.cases_opened ?? 0) },
    { label: "Потрачено", value: formatMinor(activity?.stats.spent_minor ?? 0) },
    { label: "Выиграно", value: formatMinor(activity?.stats.won_minor ?? 0) },
    { label: "Лучший дроп", value: formatMinor(activity?.stats.best_minor ?? 0) },
    { label: "Предметов", value: formatNumber(activity?.stats.inventory_items ?? 0) },
    {
      label: "Возврат",
      value: activity && activity.stats.spent_minor > 0
        ? formatPercent(activity.stats.won_minor / activity.stats.spent_minor, 0)
        : "—",
    },
  ];

  return (
    <>
      {/* ───────── entry animation ───────── */}
      <AnimatePresence>
        {entering && (
          <motion.div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-void"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="relative"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.span
                aria-hidden
                className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[70px]"
                style={{ background: c1 }}
                animate={{ opacity: [0.2, 0.6, 0.2] }}
                transition={{ duration: 1.5 }}
              />
              {/* opening vault */}
              <svg viewBox="0 0 200 200" className="relative h-48 w-48">
                <defs>
                  <linearGradient id="lounge-g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={c1} />
                    <stop offset="100%" stopColor={c2} />
                  </linearGradient>
                </defs>
                <motion.path
                  d="M100 14 L176 57 V143 L100 186 L24 143 V57 Z"
                  fill="none"
                  stroke="url(#lounge-g)"
                  strokeWidth="3"
                  initial={{ pathLength: 0, rotate: -30 }}
                  animate={{ pathLength: 1, rotate: 0 }}
                  transition={{ duration: 1, ease: "easeInOut" }}
                  style={{ originX: "100px", originY: "100px" }}
                />
                <motion.path
                  d="M72 66 H132 L92 108 H132 V134 H72 L112 92 H72 Z"
                  fill="url(#lounge-g)"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.55, duration: 0.5 }}
                  style={{ originX: "100px", originY: "100px" }}
                />
              </svg>
              <motion.p
                className="mt-4 text-center font-display text-[13px] font-bold uppercase tracking-[0.3em]"
                style={{ color: c1 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75, duration: 0.4 }}
              >
                Partner Lounge
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────── header ───────── */}
      <Card
        strong
        className="relative overflow-hidden p-6 sm:p-8"
        style={{
          borderColor: `${c1}45`,
          background: `linear-gradient(130deg, ${c1}16, ${c2}0A), rgba(13,16,32,.78)`,
        }}
      >
        <span
          aria-hidden
          className="bg-tech-grid pointer-events-none absolute inset-0 opacity-40"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-25 blur-[90px]"
          style={{ background: c1 }}
        />

        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">
              <DoorOpen size={12} />
              Partner Lounge
            </span>
            <h1 className="mt-4 font-display text-[30px] font-bold leading-tight sm:text-[40px]">
              Добро пожаловать,{" "}
              <span
                style={{
                  background: `linear-gradient(110deg, ${c1}, ${c2})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {username}
              </span>
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <PartnerBadge tier={partner.tier as keyof typeof TIERS} size="md" />
              <span className="text-[12.5px] text-slate-400">
                в программе{partner.since ? ` с ${formatDate(partner.since)}` : ""} · доля{" "}
                {formatPercent(meta.share, 0)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Link href="/inventory">
              <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-[13px] text-white transition hover:bg-white/[0.1]">
                <Package size={15} />
                Инвентарь
              </span>
            </Link>
          </div>
        </div>

        {/* link + promo */}
        <div className="relative mt-6 grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-white/[0.09] bg-white/[0.035] p-4">
            <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-wider text-slate-400">
              Ваша партнёрская ссылка
            </p>
            <div className="flex items-center gap-2">
              <span className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/[0.08] bg-void/50 px-3 py-2.5">
                <Link2 size={14} className="shrink-0 text-slate-500" />
                <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-slate-300">
                  {link}
                </span>
              </span>
              <button
                onClick={async () => {
                  if (await copyLink(link)) {
                    toast.success("Партнёрская ссылка скопирована");
                  }
                }}
                className="flex h-[42px] shrink-0 items-center gap-1.5 rounded-xl px-4 text-[13px] font-semibold text-void transition hover:brightness-110"
                style={{ background: `linear-gradient(120deg, ${c1}, ${c2})` }}
              >
                {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                Скопировать
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.09] bg-white/[0.035] p-4">
            <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-wider text-slate-400">
              Персональный промокод
            </p>
            <div className="flex items-center gap-2">
              <span className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/[0.08] bg-void/50 px-3 py-2.5">
                <Ticket size={14} className="shrink-0 text-slate-500" />
                <span className="min-w-0 flex-1 truncate font-mono text-[14px] font-bold tracking-[0.12em] text-white">
                  {promoCode}
                </span>
              </span>
              <button
                onClick={async () => {
                  if (await copyPromo(promoCode)) {
                    toast.success("Промокод скопирован");
                  }
                }}
                className="flex h-[42px] shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.07] px-4 text-[13px] font-semibold text-white transition hover:bg-white/[0.14]"
              >
                {promoCopied ? <Check size={14} /> : <Copy size={14} />}
                Скопировать
              </button>
            </div>
            <p className="mt-2 text-[11.5px] text-slate-500">
              Даёт вашим зрителям 400 ₽ на баланс и начисляет бонус вам.
            </p>
          </div>
        </div>
      </Card>

      {/* ───────── stats ───────── */}
      <section className="mt-6">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 * i }}
              className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3.5 py-3.5"
            >
              <p className="text-[10.5px] uppercase tracking-wider text-slate-500">
                {s.label}
              </p>
              <p className="mt-1 truncate text-[17px] font-bold tabular-nums text-white">
                {s.value}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ───────── chart ───────── */}
      <Card className="mt-4 p-5 sm:p-6">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-white">
            Ваша активность за 14 дней
          </h2>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-500">
            <TrendingUp size={13} style={{ color: c1 }} />
            обновляется раз в час
          </span>
        </div>
        {activity && <PartnerChart series={activity.series} />}
      </Card>

      {/* ───────── partner cases ───────── */}
      <section className="mt-10">
        <SectionHeader
          eyebrow="Только для клуба"
          title="Партнёрские кейсы"
          description="Эти кейсы не отображаются в общем каталоге и открываются бесплатно."
        />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {partnerCases.map((c) => (
            <CaseCard key={c.id} kase={c} />
          ))}
        </div>
      </section>

      {/* ───────── perks ───────── */}
      <section className="mt-12">
        <SectionHeader
          eyebrow="Ваши привилегии"
          title="Что открыто на вашем уровне"
          description="Набор привилегий настраивается владельцем индивидуально для каждого партнёра."
        />
        <PerksGrid granted={partner.perks} accent={c1} />
      </section>

      {/* ───────── tiers ───────── */}
      <section className="mt-12">
        <SectionHeader
          eyebrow="Уровни"
          title="Лестница партнёрства"
          description="Уровень назначается вручную владельцем Zevora. Автоматического повышения нет."
        />
        <TiersSection current={partner.tier as keyof typeof TIERS} />
      </section>
    </>
  );
}
