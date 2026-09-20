"use client";

import Link from "next/link";
import { ArrowLeft, Info, Percent, ShieldCheck } from "lucide-react";
import { api } from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { useSession } from "@/lib/client/session";
import { CaseImage } from "@/components/art/CaseImage";
import { CaseOpener } from "@/components/cases/CaseOpener";
import { ItemCard } from "@/components/items/ItemCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { formatMinor, formatPercent } from "@/lib/format";
import { rarityRank } from "@/lib/client/display";

export function CaseDetail({ slug }: { slug: string }) {
  const { user } = useSession();
  const { data, loading, error } = useResource(
    () => api.caseDetail(slug),
    [slug, user?.partner?.tier],
  );

  if (loading) return <PageLoader label="Загружаем кейс" />;

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <EmptyState
          title="Кейс недоступен"
          description={error ?? "Такого кейса не существует или он выключен."}
          action={
            <Link href="/cases">
              <Button>Все кейсы</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const { case: kase, items, expected_value_minor: ev } = data;
  const accent = kase.art.color_a;

  // Best items first, so the headline drops sit at the top of the table.
  const sorted = [...items].sort(
    (a, b) =>
      rarityRank(b.rarity.slug) - rarityRank(a.rarity.slug) ||
      b.price_minor - a.price_minor,
  );

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <Link
        href="/cases"
        className="mb-6 inline-flex items-center gap-2 text-[13px] text-slate-400 transition hover:text-white"
      >
        <ArrowLeft size={15} />
        Все кейсы
      </Link>

      <div className="relative mb-8 overflow-hidden rounded-xl">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-25 blur-[80px]"
          style={{
            background: `radial-gradient(circle at 20% 0%, ${accent}, transparent 60%)`,
          }}
        />
        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10">
          <div className="h-32 w-32 shrink-0 sm:h-40 sm:w-40">
            <CaseImage imageUrl={kase.image_url} art={kase.art} label={kase.name} />
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="mb-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {kase.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"
                >
                  {t}
                </span>
              ))}
              {kase.is_demo && (
                <span className="rounded-md border border-aqua-400/40 bg-aqua-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-aqua-300">
                  Демо
                </span>
              )}
            </div>
            <h1 className="font-display text-3xl font-bold sm:text-[42px]">
              {kase.name}
            </h1>
            <p className="mt-2 text-[14.5px] text-slate-400">{kase.description}</p>

            <dl className="mt-5 flex flex-wrap justify-center gap-x-8 gap-y-3 sm:justify-start">
              <Stat
                label="Цена"
                value={kase.price_minor === 0 ? "Бесплатно" : formatMinor(kase.price_minor)}
              />
              <Stat label="Предметов" value={String(items.length)} />
              <Stat label="Средняя ценность" value={formatMinor(ev)} />
            </dl>
          </div>
        </div>
      </div>

      <CaseOpener kase={kase} items={items} />

      <section className="mt-14">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold sm:text-2xl">Содержимое кейса</h2>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[12px] text-slate-400">
            <Percent size={13} className="text-zev-300" />
            Эти шансы используются сервером при розыгрыше
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {sorted.map((item) => (
            <ItemCard
              key={item.id}
              skin={item}
              size="sm"
              meta={
                <span
                  className="text-[11.5px] font-semibold tabular-nums"
                  style={{ color: item.rarity.color }}
                >
                  {formatPercent(item.chance, item.chance < 0.01 ? 3 : 2)}
                </span>
              }
            />
          ))}
        </div>

        <div className="mt-5 space-y-2">
          <p className="flex items-start gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-[12.5px] leading-relaxed text-slate-500">
            <Info size={14} className="mt-0.5 shrink-0 text-slate-600" />
            Цена предмета зависит от износа: Factory New стоит дороже базовой
            цены, Battle-Scarred — дешевле. StatTrak™ добавляет 25%.
          </p>
          <p className="flex items-start gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-[12.5px] leading-relaxed text-slate-500">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-slate-600" />
            Результат определяется на сервере криптографическим генератором
            до начала анимации. Выигрышный билет сохраняется в истории
            открытий — его можно перепроверить.
          </p>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="text-lg font-bold text-white">{value}</dd>
    </div>
  );
}
