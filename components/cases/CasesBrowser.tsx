"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { api } from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { useSession } from "@/lib/client/session";
import { CaseCard } from "@/components/cases/CaseCard";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { Dropdown } from "@/components/ui/Dropdown";
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

          <Dropdown<Sort>
            value={sort}
            onChange={setSort}
            label="Сортировка"
            align="end"
            className="w-44"
            iconLeft={<SlidersHorizontal size={15} />}
            options={[
              { value: "default", label: "По умолчанию" },
              { value: "price-asc", label: "Сначала дешёвые" },
              { value: "price-desc", label: "Сначала дорогие" },
            ]}
          />
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
