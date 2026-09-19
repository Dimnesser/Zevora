"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import type { CaseDefinition, CaseTag } from "@/types";
import { api } from "@/services/api";
import { useStore } from "@/lib/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { CaseCard } from "@/components/cases/CaseCard";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { Input } from "@/components/ui/Input";
import { CaseCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/Section";
import { cn } from "@/lib/utils";

type Filter = CaseTag | "all";

const FILTERS: TabItem<Filter>[] = [
  { id: "all", label: "Все" },
  { id: "popular", label: "Популярные" },
  { id: "new", label: "Новые" },
  { id: "cheap", label: "Дешёвые" },
  { id: "premium", label: "Премиум" },
  { id: "rare", label: "Редкие" },
];

type Sort = "default" | "price-asc" | "price-desc";

const SORTS: { id: Sort; label: string }[] = [
  { id: "default", label: "По умолчанию" },
  { id: "price-asc", label: "Сначала дешёвые" },
  { id: "price-desc", label: "Сначала дорогие" },
];

export function CasesBrowser() {
  const isPartner = useStore((s) => Boolean(s.user.partner));
  const hydrated = useHydrated();

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("default");
  const [cases, setCases] = useState<CaseDefinition[] | null>(null);

  // Partner cases appear in the list only once we know the viewer is one.
  useEffect(() => {
    let alive = true;
    setCases(null);
    api
      .listCases({ partner: hydrated ? isPartner : false, tag: filter, query })
      .then((res) => {
        if (alive) setCases(res);
      });
    return () => {
      alive = false;
    };
  }, [filter, query, isPartner, hydrated]);

  const sorted = useMemo(() => {
    if (!cases) return null;
    const copy = [...cases];
    if (sort === "price-asc") copy.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") copy.sort((a, b) => b.price - a.price);
    return copy;
  }, [cases, sort]);

  const counts = useMemo(() => {
    return FILTERS.map((f) => f.id);
  }, []);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <SectionHeader
        eyebrow="Каталог"
        title="Кейсы"
        description="Каждый кейс показывает полный список предметов и точный шанс выпадения. Никаких скрытых таблиц."
      />

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs
          items={FILTERS}
          value={filter}
          onChange={setFilter}
          className="lg:flex-1"
        />

        <div className="flex gap-2.5">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск кейса"
            iconLeft={<Search size={15} />}
            className="lg:w-56"
            aria-label="Поиск кейса"
          />

          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Сортировка"
              className={cn(
                "h-11 cursor-pointer appearance-none rounded-xl border border-white/[0.09] bg-white/[0.04]",
                "pl-10 pr-4 text-[13px] text-white outline-none transition focus:border-zev-400/70",
              )}
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id} className="bg-surface">
                  {s.label}
                </option>
              ))}
            </select>
            <SlidersHorizontal
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
            />
          </div>
        </div>
      </div>

      {!sorted ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CaseCardSkeleton key={i} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<Search size={22} />}
          title="Ничего не найдено"
          description="Попробуйте изменить фильтр или поисковый запрос."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {sorted.map((def) => (
            <CaseCard
              key={def.id}
              def={def}
              locked={Boolean(def.partnerOnly) && !isPartner}
            />
          ))}
        </div>
      )}

      {counts.length > 0 && sorted && (
        <p className="mt-8 text-center text-[12.5px] text-slate-600">
          Показано {sorted.length} кейсов
          {isPartner && " · включая партнёрские"}
        </p>
      )}
    </div>
  );
}
