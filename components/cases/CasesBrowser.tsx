"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { api } from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { useSession } from "@/lib/client/session";
import { CaseCard } from "@/components/cases/CaseCard";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { Input } from "@/components/ui/Input";
import { CaseCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/Section";
import { cn } from "@/lib/utils";

type Filter = "all" | "popular" | "new" | "cheap" | "premium" | "rare";

const FILTERS: TabItem<Filter>[] = [
  { id: "all", label: "Все" },
  { id: "popular", label: "Популярные" },
  { id: "new", label: "Новые" },
  { id: "cheap", label: "Дешёвые" },
  { id: "premium", label: "Премиум" },
  { id: "rare", label: "Редкие" },
];

type Sort = "default" | "price-asc" | "price-desc";

export function CasesBrowser() {
  const { user } = useSession();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("default");

  // Re-fetched when the session changes, since partner cases only appear
  // once the server recognises the account as a partner.
  const { data, loading } = useResource(() => api.cases(), [user?.partner?.tier]);

  const visible = useMemo(() => {
    if (!data) return null;
    let list = data.cases;
    if (filter !== "all") list = list.filter((c) => c.tags.includes(filter));
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q),
      );
    }
    const copy = [...list];
    if (sort === "price-asc") copy.sort((a, b) => a.price_minor - b.price_minor);
    if (sort === "price-desc") copy.sort((a, b) => b.price_minor - a.price_minor);
    return copy;
  }, [data, filter, query, sort]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <SectionHeader
        eyebrow="Каталог"
        title="Кейсы"
        description="Каждый кейс показывает полный список предметов и точный шанс выпадения. Розыгрыш выполняется на сервере."
      />

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs items={FILTERS} value={filter} onChange={setFilter} className="lg:flex-1" />

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
              <option value="default" className="bg-slab">По умолчанию</option>
              <option value="price-asc" className="bg-slab">Сначала дешёвые</option>
              <option value="price-desc" className="bg-slab">Сначала дорогие</option>
            </select>
            <SlidersHorizontal
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
            />
          </div>
        </div>
      </div>

      {loading || !visible ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CaseCardSkeleton key={i} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Search size={22} />}
          title="Ничего не найдено"
          description="Попробуйте изменить фильтр или поисковый запрос."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {visible.map((kase, i) => (
              <CaseCard key={kase.id} kase={kase} index={i} />
            ))}
          </div>
          <p className="mt-8 text-center text-[12.5px] text-slate-600">
            Показано {visible.length} кейсов
            {user?.partner && " · включая партнёрские"}
          </p>
        </>
      )}
    </div>
  );
}
