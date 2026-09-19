"use client";

import Link from "next/link";
import { ArrowLeft, Info, Percent } from "lucide-react";
import type { CaseDefinition } from "@/types";
import { caseExpectedValue, dropChance } from "@/lib/roll";
import { getSkin } from "@/data/skins";
import { RARITY, rarityRank } from "@/lib/rarity";
import { CaseArt } from "@/components/art/CaseArt";
import { CaseOpener } from "@/components/cases/CaseOpener";
import { ItemCard } from "@/components/items/ItemCard";
import { formatMoney, formatPercent } from "@/lib/format";
import { CASES } from "@/data/cases";
import { CaseCard } from "@/components/cases/CaseCard";

export function CaseDetail({ def }: { def: CaseDefinition }) {
  const [c1] = def.palette;
  const ev = caseExpectedValue(def);

  // Drop table, best items first.
  const drops = [...def.drops]
    .map((d) => ({
      skin: getSkin(d.skinId),
      chance: dropChance(def, d.skinId),
    }))
    .sort(
      (a, b) =>
        rarityRank(b.skin.rarity) - rarityRank(a.skin.rarity) ||
        b.skin.price - a.skin.price,
    );

  const related = CASES.filter(
    (c) => c.slug !== def.slug && !c.partnerOnly,
  ).slice(0, 4);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <Link
        href="/cases"
        className="mb-6 inline-flex items-center gap-2 text-[13px] text-slate-400 transition hover:text-white"
      >
        <ArrowLeft size={15} />
        Все кейсы
      </Link>

      {/* ───────── header ───────── */}
      <div className="relative mb-8 overflow-hidden rounded-3xl">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-25 blur-[80px]"
          style={{ background: `radial-gradient(circle at 20% 0%, ${c1}, transparent 60%)` }}
        />
        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10">
          <div className="h-32 w-32 shrink-0 sm:h-40 sm:w-40">
            <CaseArt def={def} />
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="mb-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {def.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"
                >
                  {t}
                </span>
              ))}
            </div>
            <h1 className="font-display text-3xl font-bold sm:text-[42px]">
              {def.name}
            </h1>
            <p className="mt-2 text-[14.5px] text-slate-400">{def.subtitle}</p>

            <dl className="mt-5 flex flex-wrap justify-center gap-x-8 gap-y-3 sm:justify-start">
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-slate-500">
                  Цена
                </dt>
                <dd className="text-lg font-bold text-white">
                  {def.price === 0 ? "Бесплатно" : formatMoney(def.price)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-slate-500">
                  Предметов
                </dt>
                <dd className="text-lg font-bold text-white">{def.drops.length}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-slate-500">
                  Средняя ценность
                </dt>
                <dd className="text-lg font-bold text-white">{formatMoney(ev)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* ───────── opener ───────── */}
      <CaseOpener def={def} />

      {/* ───────── drop table ───────── */}
      <section className="mt-14">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold sm:text-2xl">Содержимое кейса</h2>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[12px] text-slate-400">
            <Percent size={13} className="text-zev-300" />
            Шансы указаны до открытия
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {drops.map(({ skin, chance }) => (
            <ItemCard
              key={skin.id}
              skin={skin}
              size="sm"
              meta={
                <span
                  className="text-[11.5px] font-semibold tabular-nums"
                  style={{ color: RARITY[skin.rarity].color }}
                >
                  {formatPercent(chance, chance < 0.01 ? 3 : 2)}
                </span>
              }
            />
          ))}
        </div>

        <p className="mt-5 flex items-start gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-[12.5px] leading-relaxed text-slate-500">
          <Info size={14} className="mt-0.5 shrink-0 text-slate-600" />
          Цена предмета зависит от износа: Factory New стоит дороже базовой
          цены, Battle-Scarred — дешевле. Предметы с меткой Counter получают
          надбавку 25%.
        </p>
      </section>

      {/* ───────── related ───────── */}
      <section className="mt-14">
        <h2 className="mb-5 text-xl font-bold sm:text-2xl">Похожие кейсы</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {related.map((c) => (
            <CaseCard key={c.id} def={c} />
          ))}
        </div>
      </section>
    </div>
  );
}
